import type { Assessment, Category, Agency, Report } from "./types";

const categoryValues: Category[] = ["flood", "fire", "road_accident", "medical_emergency", "infrastructure_damage", "other"];
const agencyValues: Agency[] = ["fire_rescue", "medical_services", "police", "disaster_response", "public_works"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseAssessment(value: unknown): Assessment | null {
  if (!isRecord(value)) return null;
  const answers = Array.isArray(value.answers) ? value.answers : [];
  const byName = new Map(answers.filter(isRecord).map((answer) => [answer.name, answer]));
  const life = byName.get("life_threat");
  const people = byName.get("people_unclear");
  const urgency = byName.get("urgency");
  const category = byName.get("category");
  const agency = byName.get("agency");
  if (!life || !urgency || !category || !agency) return null;
  const lifeThreat = number(life.probability);
  const peopleUnclear = number(people?.probability) ?? 0;
  const urgencyScore = number(urgency.score);
  const urgencyConfidence = number(urgency.confidence);
  const categoryConfidence = number(category.confidence);
  const agencyConfidence = number(agency.confidence);
  const categoryValue = category.choice;
  const agencyValue = agency.choice;
  if (lifeThreat === null || urgencyScore === null || urgencyConfidence === null || categoryConfidence === null || agencyConfidence === null) return null;
  if (!categoryValues.includes(categoryValue as Category) || !agencyValues.includes(agencyValue as Agency)) return null;
  return { lifeThreat, peopleUnclear, urgency: Math.max(0, Math.min(3, Math.round(urgencyScore))), urgencyConfidence, category: categoryValue as Category, categoryConfidence, agency: agencyValue as Agency, agencyConfidence, evidence: lifeThreat >= 0.65 && urgencyConfidence >= 0.6 ? "sufficient" : "partial" };
}

function simulatedAssessment(report: Report): Assessment {
  const text = report.message.toLowerCase();
  const category: Category = /flood|water|rain|rising/.test(text) ? "flood" : /fire|smoke|burning/.test(text) ? "fire" : /crash|accident|collision/.test(text) ? "road_accident" : /injur|breath|medical|unconscious/.test(text) ? "medical_emergency" : "other";
  const lifeThreat = /trapped|inside|unconscious|heavy smoke|rising fast|critical/.test(text) ? 0.9 : 0.45;
  const urgency = lifeThreat >= 0.65 ? 3 : /urgent|soon|blocked|damage/.test(text) ? 2 : 1;
  const agency: Agency = category === "fire" ? "fire_rescue" : category === "medical_emergency" || category === "road_accident" ? "medical_services" : category === "flood" ? "disaster_response" : "public_works";
  return { lifeThreat, peopleUnclear: 0.5, urgency, urgencyConfidence: 0.72, category, categoryConfidence: 0.78, agency, agencyConfidence: 0.75, evidence: "partial" };
}

export async function assessReport(report: Report): Promise<Assessment> {
  const key = process.env.DECISIONS_API_KEY;
  if (process.env.DECISIONS_MODE === "simulation" || !key) return simulatedAssessment(report);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${process.env.DECISIONS_BASE_URL ?? "https://api.openai.com/v1"}/decisions`, {
      method: "POST", signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.DECISIONS_MODEL ?? "gpt-6-luna", input: `Emergency report. Source: ${report.source}. Location: ${report.locationText ?? "unknown"}. Message: ${report.message}`, questions: [
        { type: "predicate", name: "life_threat", instructions: "Is there an immediate threat to human life?" },
        { type: "predicate", name: "people_unclear", instructions: "Is the number or condition of affected people unclear?" },
        { type: "score", name: "urgency", instructions: "How urgent is this emergency?", levels: [{ label: "low" }, { label: "medium" }, { label: "high" }, { label: "critical" }] },
        { type: "choice", name: "category", instructions: "What is the incident category?", choices: categoryValues.map((value) => ({ value })) },
        { type: "choice", name: "agency", instructions: "Which agency should initially respond?", choices: agencyValues.map((value) => ({ value })) },
      ] }),
    });
    if (!response.ok) throw new Error(`Decisions API returned HTTP ${response.status}`);
    const result = parseAssessment(await response.json());
    if (!result) throw new Error("Decisions API returned an unusable assessment");
    return result;
  } finally { clearTimeout(timeout); }
}
