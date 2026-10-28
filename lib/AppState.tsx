"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { demoReports } from "../data/reports";
import { deriveTriage } from "./triage";
import type { Assessment, Incident, Agency, Priority, Report } from "./types";

type History = { at: string; action: string; note?: string };
type State = { incidents: Incident[]; history: Record<string, History[]>; addReports: (reports: Report[]) => void; applyAssessment: (id: string, assessment: Assessment) => void; review: (id: string, action: "approved" | "flagged" | "overridden", priority?: Priority, agency?: Agency, note?: string) => void };
const Context = createContext<State | null>(null);
const humanReviewRequired = () => { try { return JSON.parse(localStorage.getItem("triagezero-settings") || "{}").review !== false; } catch { return true; } };
const makeIncident = (report: Report): Incident => ({ ...report, priority: "low", category: "other", agency: "disaster_response", needsReview: true, review: "pending", related: [], reasons: ["Awaiting AI assessment; this is not a verified finding."] });
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(() => demoReports.map(makeIncident));
  const [history, setHistory] = useState<Record<string, History[]>>({});
  useEffect(() => { fetch("/api/state").then(response => response.json()).then(state => { const required = humanReviewRequired(); setIncidents(state.incidents.map((incident: Incident) => required ? incident : { ...incident, needsReview: false, review: "approved" })); setHistory(state.history); }).catch(() => undefined); const syncSettings = () => { const required = humanReviewRequired(); setIncidents(current => current.map(incident => ({ ...incident, needsReview: required ? incident.needsReview : false, review: required ? incident.review : "approved" }))); }; window.addEventListener("triagezero-settings-changed", syncSettings); return () => window.removeEventListener("triagezero-settings-changed", syncSettings); }, []);
  const persist = (body: unknown) => { fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(response => response.json()).then(state => { const required = humanReviewRequired(); setIncidents(state.incidents.map((incident: Incident) => required ? incident : { ...incident, needsReview: false, review: "approved" })); setHistory(state.history); }).catch(() => undefined); };
  useEffect(() => { if (!humanReviewRequired()) setIncidents(current => current.map(incident => ({ ...incident, needsReview: false, review: "approved" }))); }, []);
  const addReports = (reports: Report[]) => { setIncidents((current) => [...current, ...reports.map(makeIncident)]); persist({ type: "add", reports }); };
  const applyAssessment = (id: string, assessment: Assessment) => { setIncidents((current) => current.map((incident) => { if (incident.id !== id) return incident; const triage = deriveTriage(assessment); const reviewRequired = humanReviewRequired(); return { ...incident, ai: assessment, priority: triage.priority, category: assessment.category, agency: assessment.agency, needsReview: reviewRequired && triage.needsReview, review: reviewRequired && triage.needsReview ? "pending" : "approved", reasons: triage.reasons }; })); persist({ type: "assessment", id, assessment }); };
  const review = (id: string, action: "approved" | "flagged" | "overridden", priority?: Priority, agency?: Agency, note?: string) => { setIncidents((current) => current.map((incident) => incident.id === id ? { ...incident, review: action, priority: priority ?? incident.priority, agency: agency ?? incident.agency, needsReview: action === "flagged" } : incident)); setHistory((current) => ({ ...current, [id]: [...(current[id] ?? []), { at: new Date().toISOString(), action, note }] })); persist({ type: "review", id, action, priority, agency, note }); };
  const value = useMemo(() => ({ incidents, history, addReports, applyAssessment, review }), [incidents, history]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppState() { const value = useContext(Context); if (!value) throw new Error("AppStateProvider is missing"); return value; }
