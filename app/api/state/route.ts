import { NextResponse } from "next/server";
import * as db from "../../../lib/db";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json(await db.getState()); }
export async function POST(request: Request) { const body = await request.json(); if (body.type === "add") await db.addReports(body.reports); else if (body.type === "assessment") await db.applyAssessment(body.id, body.assessment); else if (body.type === "review") await db.review(body.id, body.action, body.priority, body.agency, body.note); return NextResponse.json(await db.getState()); }
