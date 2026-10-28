import OpenAI from "openai";

const apiKey = process.env.DECISIONS_API_KEY;
const baseURL = process.env.DECISIONS_BASE_URL ?? "https://api.openai.com/v1";
const model = process.env.DECISIONS_MODEL ?? "gpt-6-luna";

if (!apiKey) {
  throw new Error("DECISIONS_API_KEY is not configured. Add it to .env.local before running the Decisions API smoke test.");
}

const client = new OpenAI({ apiKey, baseURL });

async function main() {
const result = await client.decisions.create({
  model,
  input: "Unverified public report. WhatsApp report from Musi Bridge, Hyderabad: water is rising fast and families are trapped.",
  questions: [
    { name: "life_threat", type: "predicate", instructions: "Is there an immediate threat to human life?" },
    { name: "urgency", type: "score", instructions: "How urgent is this report?", levels: [
      { label: "low", description: "No immediate response required" },
      { label: "medium", description: "Response needed soon" },
      { label: "high", description: "Immediate response needed" },
      { label: "critical", description: "Life-threatening emergency" },
    ] },
  ],
});

console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
