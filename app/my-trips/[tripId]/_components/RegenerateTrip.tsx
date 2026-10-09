"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { TripInfo } from "@/app/create-new-trip/_components/ChatBox";
import { normalizeTripDateFields } from "@/lib/trip/date-rules";

type Props = { tripId:string; tripDetail:TripInfo; onRegenerated:(tripDetail:TripInfo)=>void };
type EnrichResponse={trip_plan?:TripInfo;error?:string};
type ApiErrorPayload={error?:string;provider_message?:string;code?:string;used?:number;limit?:number;remaining?:number};
const PERIOD=()=>new Date().toISOString().slice(0,7);
const FREE_LIMIT=Number(process.env.NEXT_PUBLIC_FREE_AI_GENERATIONS ?? 5);
const PAID_LIMIT=Number(process.env.NEXT_PUBLIC_PAID_AI_GENERATIONS ?? 100);
const PAID_PLAN_SLUG=process.env.NEXT_PUBLIC_CLERK_PREMIUM_PLAN_SLUG ?? "monthly";

function normalizeTripDates(trip:TripInfo):TripInfo{return normalizeTripDateFields(trip);}

export default function RegenerateTrip({tripId,tripDetail,onRegenerated}:Props){
 const updateTrip=useMutation(api.tripDetail.UpdateTripDetail);
 const {isLoaded,isSignedIn,has}=useAuth();
 const usage=useQuery(api.aiUsage.getAiUsage,isLoaded&&isSignedIn?{period:PERIOD()}:"skip");
 const [loading,setLoading]=useState(false); const [error,setError]=useState("");
 const isPaid=typeof has === "function" && has({plan:PAID_PLAN_SLUG});
 const limit=isPaid?PAID_LIMIT:FREE_LIMIT;
 const used=Number(usage?.used??0);
 const reserved=Number(usage?.reserved??0);
 const quotaReached=usage!==undefined&&used+reserved>=limit;
 const remaining=Math.max(0,limit-used-reserved);
 const quotaLabel=useMemo(()=>isPaid?"Your monthly plan":"Your free plan",[isPaid]);

 const regenerate=async()=>{
  if(loading||quotaReached)return;
  setLoading(true);setError("");
  try{
   const normalizedPreferences=normalizeTripDates(tripDetail);
   const preferenceMessage=`Generate a fresh final travel itinerary using these preferences. Origin: ${normalizedPreferences.origin}. Destination: ${normalizedPreferences.destination}. Travel dates: ${normalizedPreferences.travel_dates||"not specified"}. Start date: ${normalizedPreferences.start_date||"not specified"}. End date: ${normalizedPreferences.end_date||"not specified"}. Duration: ${normalizedPreferences.duration}. Travelers: ${normalizedPreferences.group_size}. Budget: ${normalizedPreferences.budget}. Interests: ${normalizedPreferences.interests||"general sightseeing"}. Special requirements: ${normalizedPreferences.special_requirements||"none"}. IMPORTANT: If start_date and end_date are supplied, every itinerary day must use the exact inclusive date sequence from start_date through end_date, and the itinerary must contain exactly one day for every calendar date in that span. The exact date span is authoritative over any conflicting duration text.`;
   const aiResponse=await axios.post("/api/aimodel",{messages:[{role:"user",content:preferenceMessage}],isFinal:true},{timeout:60000});
   const rawPlan=aiResponse.data?.trip_plan as TripInfo|undefined; if(!rawPlan)throw new Error("AI did not return a new trip plan.");
   const regenerated=normalizeTripDates(rawPlan);
   const enrichResponse=await axios.post<EnrichResponse>("/api/trip/enrich",{trip_plan:regenerated},{timeout:60000});
   const enrichedPlan=normalizeTripDates(enrichResponse.data?.trip_plan??regenerated);
   await updateTrip({tripId,tripDetail:enrichedPlan});
   onRegenerated(enrichedPlan);
  }catch(err){
   console.error("Trip regeneration failed:",err);
   if(axios.isAxiosError(err)){const data=err.response?.data as ApiErrorPayload|undefined;if(err.response?.status===402&&data?.code==="AI_USAGE_LIMIT_REACHED")setError(`Monthly AI generation limit reached (${data.used??used}/${data.limit??limit}).`);else setError(data?.provider_message||data?.error||err.message);}else setError(err instanceof Error?err.message:"Unable to regenerate the itinerary.");
  }finally{setLoading(false);}
 };

 return <div className="mb-5 rounded-2xl border bg-white p-4 shadow-sm">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Refresh your itinerary</h2><p className="text-sm text-gray-500">Generate a fresh itinerary from the latest saved preferences. Your trip URL stays the same.</p></div><Button onClick={regenerate} disabled={loading||quotaReached||!isLoaded||!isSignedIn}>{loading?<><RefreshCw className="mr-2 animate-spin" size={16}/>Generating…</>:<><RefreshCw className="mr-2" size={16}/>Regenerate Itinerary</>}</Button></div>
  {usage!==undefined&&<div className={`mt-3 rounded-xl border p-3 text-sm ${quotaReached?"border-red-200 bg-red-50 text-red-700":"border-gray-200 bg-gray-50 text-gray-600"}`}><div className="flex flex-wrap items-center justify-between gap-2"><span>{quotaLabel}: {used} used, {reserved} in progress / {limit} monthly AI generations.</span>{quotaReached&&<Link href="/pricing" className="font-semibold underline underline-offset-2">Upgrade plan</Link>}</div>{!quotaReached&&<p className="mt-1 text-xs text-gray-500">{remaining} generation{remaining===1?"":"s"} available.</p>}</div>}
  {loading&&<p className="mt-2 text-xs text-gray-400">This can take up to about 2 minutes while AI and place data are prepared.</p>}
  {error&&<p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
 </div>;
}
