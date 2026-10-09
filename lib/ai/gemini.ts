export type GeminiMessage = { role: "user" | "assistant"; content: string };
type JsonSchema = Record<string, unknown>;
type GeminiGenerateResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>; error?: { code?: number; message?: string; status?: string } };

export class GeminiApiError extends Error {
  status:number; code?:number; retryAfterSeconds?:number;
  constructor(message:string,status=502,code?:number,retryAfterSeconds?:number){super(message);this.name="GeminiApiError";this.status=status;this.code=code;this.retryAfterSeconds=retryAfterSeconds;}
}
const DEFAULT_GEMINI_MODEL="gemini-3.5-flash-lite";
const DEPRECATED_GEMINI_MODELS=new Set(["gemini-2.5-flash","gemini-2.5-flash-lite"]);
function resolveGeminiModel(value?:string){const model=value?.trim();return !model||DEPRECATED_GEMINI_MODELS.has(model)?DEFAULT_GEMINI_MODEL:model;}
function getConfig(){const apiKey=process.env.GEMINI_API_KEY;const model=resolveGeminiModel(process.env.GEMINI_MODEL);if(!apiKey)throw new GeminiApiError("GEMINI_API_KEY is not configured on the server",503);return{apiKey,model};}
function getResponseText(data:GeminiGenerateResponse){return data.candidates?.[0]?.content?.parts?.map(p=>p.text??"").join("").trim()??"";}
function getRetryAfterSeconds(response:Response,message:string){const h=response.headers.get("retry-after");const n=h?Number(h):NaN;if(Number.isFinite(n)&&n>=0)return Math.ceil(n);const m=message.match(/retry in\s+([0-9.]+)s/i);return m?Math.ceil(Number(m[1])):60;}

export async function generateGeminiJson<T>({systemInstruction,messages,responseSchema,model:requestedModel,timeoutMs=45000}:{systemInstruction:string;messages:GeminiMessage[];responseSchema:JsonSchema;model?:string;timeoutMs?:number}):Promise<T>{
 const {apiKey,model:configuredModel}=getConfig();const model=resolveGeminiModel(requestedModel||configuredModel);const contents=messages.filter(m=>m.content.trim()).map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
 if(!contents.length)throw new GeminiApiError("At least one message is required",400);
 const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
 const payload={system_instruction:{parts:[{text:systemInstruction}]},contents,generationConfig:{responseMimeType:"application/json",responseSchema}};
 const maxAttempts=4;let lastError:GeminiApiError|null=null;
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},body:JSON.stringify(payload),cache:"no-store",signal:controller.signal});
   const raw=await response.text();let data:GeminiGenerateResponse={};try{data=raw?JSON.parse(raw) as GeminiGenerateResponse:{}}catch{throw new GeminiApiError(`Gemini returned a non-JSON response (HTTP ${response.status})`,response.status||502);}
   if(!response.ok){const message=data.error?.message||`Gemini request failed (HTTP ${response.status})`;if(response.status===429)throw new GeminiApiError(`Gemini rate limit reached. Please retry in about ${getRetryAfterSeconds(response,message)} seconds.`,429,data.error?.code,getRetryAfterSeconds(response,message));const error=new GeminiApiError(message,response.status||502,data.error?.code);if([500,502,503,504].includes(response.status)&&attempt<maxAttempts){lastError=error;await new Promise(r=>setTimeout(r,1000*2**(attempt-1)));continue;}throw error;}
   const text=getResponseText(data);if(!text)throw new GeminiApiError("Gemini returned an empty response",502);try{return JSON.parse(text) as T;}catch{throw new GeminiApiError("Gemini returned invalid JSON",502);}
  }catch(error){
   if(error instanceof DOMException&&error.name==="AbortError")throw new GeminiApiError("AI generation timed out. Please try again.",504);
   if(error instanceof GeminiApiError){lastError=error;if(error.status===429)throw error;if([500,502,503,504].includes(error.status)&&attempt<maxAttempts){await new Promise(r=>setTimeout(r,1000*2**(attempt-1)));continue;}throw error;}
   lastError=new GeminiApiError(error instanceof Error?error.message:"Unknown Gemini API error",502);
   if(attempt<maxAttempts){await new Promise(r=>setTimeout(r,1000*2**(attempt-1)));continue;}
  }finally{clearTimeout(timer);}
 }
 throw lastError??new GeminiApiError("Unable to reach Gemini API",502);
}
