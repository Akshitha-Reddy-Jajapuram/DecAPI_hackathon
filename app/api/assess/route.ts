import { NextResponse } from "next/server";
import { assessReport } from "../../../lib/assessment";
import type { Report } from "../../../lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reports = Array.isArray(body?.reports) ? body.reports : [body?.report];
    if (!reports.length || reports.some((report: unknown) => !report || typeof report !== "object" || typeof (report as Report).message !== "string" || !(report as Report).message.trim())) return NextResponse.json({ error: "At least one report with a message is required" }, { status: 400 });
    const results = await Promise.all(reports.map(async (report: Report) => ({ id: report.id, assessment: await assessReport(report) })));
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assessment failed";
    return NextResponse.json({ error: message }, { status: message.includes("configured") ? 503 : 502 });
  }
}
