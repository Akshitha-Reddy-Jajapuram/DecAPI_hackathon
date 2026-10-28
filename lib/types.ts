export type Source = "whatsapp" | "social" | "call" | "public";
export type Status = "unprocessed" | "processing" | "assessed" | "failed";
export type Priority = "critical" | "high" | "medium" | "low";
export type Category = "flood" | "fire" | "road_accident" | "medical_emergency" | "infrastructure_damage" | "other";
export type Agency = "fire_rescue" | "medical_services" | "police" | "disaster_response" | "public_works";
export interface Report { id:string; message:string; source:Source; timestamp:string; locationText?:string; lat?:number; lng?:number; synthetic:true; status:Status }
export interface Assessment { lifeThreat:number; peopleUnclear:number; urgency:number; urgencyConfidence:number; category:Category; categoryConfidence:number; agency:Agency; agencyConfidence:number; evidence:"sufficient"|"partial"|"insufficient"; refusal?:boolean }
export interface Incident extends Report { ai?:Assessment; priority:Priority; category:Category; agency:Agency; needsReview:boolean; review:"pending"|"approved"|"overridden"|"flagged"; related:{id:string; probability:number}[]; reasons:string[] }
