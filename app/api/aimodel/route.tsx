import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { aj } from "@/lib/security/arcjet";
import { getRequestId, withRequestId } from "@/lib/security/request-id";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";
import { generateGeminiJson, GeminiApiError } from "@/lib/ai/gemini";
import { validateTripPlan } from "@/lib/trip/validation";
import { extractExplicitTravelDates, formatTripDates } from "@/lib/trip/date-rules";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatUi = "originTips" | "destinationTips" | "travelDates" | "budget" | "groupSize" | "tripDuration" | "interestsTips" | "preferencesTips" | "final";
const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_TOTAL_MESSAGE_LENGTH = 20_000;
const MAX_REQUEST_BYTES = 64 * 1024;
const FREE_AI_GENERATIONS = Number(process.env.FREE_AI_GENERATIONS ?? 5);
const PAID_AI_GENERATIONS = Number(process.env.PAID_AI_GENERATIONS ?? 100);
const PAID_PLAN_SLUG = process.env.CLERK_PREMIUM_PLAN_SLUG ?? "monthly";

const PROMPT = `You are an AI Trip Planner Agent.
Collect these requirements one question at a time only when they are still missing:
1. Starting location (origin)
2. Destination city or country
3. Exact travel start and end dates
4. Group size (Solo, Couple, Family, Friends)
5. Budget (Low, Medium, High)
6. Trip duration (number of days)
7. Travel interests
8. Special requirements or preferences

IMPORTANT: First inspect the full conversation and extract every requirement the user has already stated, including natural-language clues. Do not ask the user to repeat information that is already explicit or can be safely inferred.
Examples of valid extraction:
- “3-day trip” or “for 3 days” => trip duration = 3 days.
- “for 2 people”, “two travelers”, or “a couple” => group size = Couple.
- A named city such as “Jaipur” => destination = Jaipur when the context clearly describes a trip there.
- “food places”, “local cuisine”, “temples”, “museums”, “adventure”, etc. => travel interests.
- “avoid repeating places”, “kid friendly”, “relaxed pace”, etc. => special requirements/preferences.
Preserve explicit user wording when possible. Only ask for a field when it is genuinely missing or ambiguous.
Do not ask about group size when the user has already stated a traveler count or “couple/family/friends/solo” in the conversation. Do not ask about trip duration when the user has already stated a number of days.
Do not ask multiple questions at once or repeat an already answered field.
Return ONLY JSON: {"resp":"string","ui":"originTips|destinationTips|travelDates|budget|groupSize|tripDuration|interestsTips|preferencesTips|final"}.
Use each UI only for its matching missing step. Use final only after all 8 steps are answered.`;

const FINAL_PROMPT = `Generate a personalized travel plan from the user's collected trip requirements.
Preserve exact travel dates and preferences when supplied. If exact start_date and end_date are present, THEY ARE THE AUTHORITATIVE SOURCE OF TRIP LENGTH: calculate the inclusive number of calendar days from those dates and make duration and itinerary length match that date span, even if an earlier user message stated a different approximate duration. Never shorten or rewrite an explicitly selected end_date to fit an earlier duration.
Return ONLY JSON with trip_plan containing destination, duration, origin, travel_dates, start_date, end_date, budget, group_size, interests, special_requirements, hotels, itinerary. Each itinerary day must include day, date, day_plan, best_time_to_visit_day and activities. Each activity must include place_name, place_details, place_image_url, geo_coordinates, place_address, ticket_pricing, time_travel_each_location and best_time_to_visit. Use date format YYYY-MM-DD. The itinerary must contain one consecutive day for every calendar day from start_date through end_date, starting at start_date and ending at end_date. Do not invent certainty; clearly label estimates or unavailable provider values. Set every hotel_image_url and place_image_url to "/placeholder.svg"; never generate remote image URLs. Google Places enrichment may replace those placeholders later when a provider image is verified.`;

const CHAT_SCHEMA = { type:"object", properties:{ resp:{type:"string"}, ui:{type:"string", enum:["originTips","destinationTips","travelDates","budget","groupSize","tripDuration","interestsTips","preferencesTips","final"]}}, required:["resp","ui"], propertyOrdering:["resp","ui"] };
const TRIP_SCHEMA = { type:"object", properties:{ trip_plan:{ type:"object", properties:{ destination:{type:"string"}, duration:{type:"string"}, origin:{type:"string"}, travel_dates:{type:"string"}, start_date:{type:"string"}, end_date:{type:"string"}, budget:{type:"string"}, group_size:{type:"string"}, interests:{type:"string"}, special_requirements:{type:"string"}, hotels:{type:"array",items:{type:"object",properties:{hotel_name:{type:"string"},hotel_address:{type:"string"},price_per_night:{type:"string"},hotel_image_url:{type:"string"},geo_coordinates:{type:"object",properties:{latitude:{type:"number"},longitude:{type:"number"}},required:["latitude","longitude"]},rating:{type:"number"},description:{type:"string"}},required:["hotel_name","hotel_address","price_per_night","hotel_image_url","geo_coordinates","rating","description"]}}, itinerary:{type:"array",items:{type:"object",properties:{day:{type:"integer"},date:{type:"string"},day_plan:{type:"string"},best_time_to_visit_day:{type:"string"},activities:{type:"array",items:{type:"object",properties:{place_name:{type:"string"},place_details:{type:"string"},place_image_url:{type:"string"},geo_coordinates:{type:"object",properties:{latitude:{type:"number"},longitude:{type:"number"}},required:["latitude","longitude"]},place_address:{type:"string"},ticket_pricing:{type:"string"},time_travel_each_location:{type:"string"},best_time_to_visit:{type:"string"}},required:["place_name","place_details","place_image_url","geo_coordinates","place_address","ticket_pricing","time_travel_each_location","best_time_to_visit"]}}},required:["day","date","day_plan","best_time_to_visit_day","activities"]}}},required:["destination","duration","origin","travel_dates","start_date","end_date","budget","group_size","interests","special_requirements","hotels","itinerary"]}},required:["trip_plan"] };

function validateMessages(value: unknown): ChatMessage[] | null { if(!Array.isArray(value)||!value.length||value.length>MAX_MESSAGES) return null; const messages:ChatMessage[]=[]; let total=0; for(const message of value){ if(!message||typeof message!=="object") return null; const candidate=message as Record<string,unknown>; if((candidate.role!=="user"&&candidate.role!=="assistant")||typeof candidate.content!=="string") return null; const content=candidate.content.trim(); if(!content||content.length>MAX_MESSAGE_LENGTH) return null; total+=content.length; if(total>MAX_TOTAL_MESSAGE_LENGTH) return null; messages.push({role:candidate.role,content}); } return messages; }
function getCurrentPeriod(){const now=new Date();return `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}`;}
function normalizeTripImagePlaceholders(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const plan = value as Record<string, unknown>;
  const hotels = Array.isArray(plan.hotels) ? plan.hotels : [];
  for (const hotel of hotels) {
    if (hotel && typeof hotel === "object" && !Array.isArray(hotel)) {
      (hotel as Record<string, unknown>).hotel_image_url = "/placeholder.svg";
    }
  }
  const itinerary = Array.isArray(plan.itinerary) ? plan.itinerary : [];
  for (const day of itinerary) {
    if (!day || typeof day !== "object" || Array.isArray(day)) continue;
    const activities = Array.isArray((day as Record<string, unknown>).activities)
      ? ((day as Record<string, unknown>).activities as unknown[])
      : [];
    for (const activity of activities) {
      if (activity && typeof activity === "object" && !Array.isArray(activity)) {
        (activity as Record<string, unknown>).place_image_url = "/placeholder.svg";
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  let reservationId:string|null=null; let quotaToken:string|null=null; let authenticatedUserId:string|undefined; let finalRequest=false;
  try {
    const body = await readJsonBody<{ messages?: unknown; isFinal?: unknown }>(req, MAX_REQUEST_BYTES);
    const messages=validateMessages(body?.messages); const isFinal=body?.isFinal===true; finalRequest=isFinal;
    if(!messages) return withRequestId(NextResponse.json({error:"Invalid messages"},{status:400}), requestId);
    if(!process.env.GEMINI_API_KEY) return withRequestId(NextResponse.json({error:"GEMINI_API_KEY is not configured on the server"},{status:503}), requestId);
    const {userId,has,getToken}=await auth(); authenticatedUserId=userId ?? undefined; if(!userId) return withRequestId(NextResponse.json({error:"Authentication required"},{status:401}), requestId);
    const usageLimit=has({plan:PAID_PLAN_SLUG})?PAID_AI_GENERATIONS:FREE_AI_GENERATIONS;
    if(!Number.isFinite(usageLimit)||usageLimit<1) return withRequestId(NextResponse.json({error:"AI usage limits are misconfigured"},{status:503}), requestId);
    const decision=await aj.protect(req,{userId,requested:isFinal?5:1});
    if(decision.isDenied()) return withRequestId(NextResponse.json({error:"Too Many Requests",reason:decision.reason},{status:429}), requestId);

    if(isFinal){
      quotaToken=await getToken({template:"convex"});
      if(!quotaToken) return withRequestId(NextResponse.json({error:"Convex authentication token unavailable"},{status:401}), requestId);
      const usage=await fetchMutation(api.aiUsage.consumeAiGeneration,{period:getCurrentPeriod(),limit:usageLimit},{token:quotaToken});
      if(!usage.allowed) return withRequestId(NextResponse.json({error:"AI generation limit reached",code:"AI_USAGE_LIMIT_REACHED",used:usage.used,limit:usageLimit,remaining:0},{status:402}), requestId);
      reservationId=usage.reservationId;
    }

    const result=await generateGeminiJson<{resp:string;ui:ChatUi}|{trip_plan:unknown}>({systemInstruction:isFinal?FINAL_PROMPT:PROMPT,messages,responseSchema:isFinal?TRIP_SCHEMA:CHAT_SCHEMA});

    if (isFinal) {
      const authoritativeDates = extractExplicitTravelDates(messages);
      if (authoritativeDates?.days) {
        const rawPlan = (result as { trip_plan?: unknown }).trip_plan;
        if (!rawPlan || typeof rawPlan !== "object" || Array.isArray(rawPlan)) throw new Error("AI did not return a valid trip plan object");
        const plan = rawPlan as Record<string, unknown>;
        (result as { trip_plan: unknown }).trip_plan = {
          ...plan,
          start_date: authoritativeDates.start_date,
          end_date: authoritativeDates.end_date,
          duration: `${authoritativeDates.days} days`,
          travel_dates: formatTripDates(authoritativeDates.start_date, authoritativeDates.end_date),
        };
      }
      normalizeTripImagePlaceholders((result as { trip_plan?: unknown }).trip_plan);
      const validation = validateTripPlan((result as { trip_plan?: unknown }).trip_plan);
      if (!validation.valid) throw new Error(`AI returned an invalid trip plan: ${validation.errors.slice(0, 3).join("; ")}`);
    }

    if (isFinal && quotaToken && reservationId) {
      const confirmation = await fetchMutation(api.aiUsage.confirmAiGeneration,{period:getCurrentPeriod(),reservationId},{token:quotaToken});
      if(!confirmation.confirmed) throw new Error("AI quota confirmation failed");
      reservationId = null;
    }

    console.info("AI request completed", { requestId, userId, isFinal, durationMs: Date.now() - startedAt });
    return withRequestId(NextResponse.json(isFinal ? {...(result as Record<string,unknown>)} : result,{status:200}), requestId);
  } catch(error){
    if(quotaToken&&reservationId){try{await fetchMutation(api.aiUsage.releaseAiGeneration,{period:getCurrentPeriod(),reservationId},{token:quotaToken});}catch(releaseError){console.error("Failed to release AI reservation:",{requestId,error:releaseError});}}
    if (error instanceof RequestBodyError) {
      return withRequestId(NextResponse.json({ error: error.message }, { status: error.status }), requestId);
    }
    const status=error instanceof GeminiApiError?error.status:502; const safeStatus=status>=400&&status<600?status:502; const message=error instanceof Error?error.message:"Unknown Gemini API error";
    console.error("Gemini API error",{requestId,userId:authenticatedUserId,isFinal:finalRequest,status:safeStatus,durationMs:Date.now()-startedAt,message});
    return withRequestId(NextResponse.json({error:"Unable to generate a valid trip response right now.",provider_status:safeStatus,provider_message:process.env.NODE_ENV==="development"?message:undefined},{status:safeStatus}), requestId);
  }
}
