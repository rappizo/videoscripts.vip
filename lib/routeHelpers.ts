import { NextResponse } from "next/server";

export function missingKeyError() {
  return NextResponse.json(
    { error: "AI_API_KEY is not configured. Copy .env.example to .env and set your apiyi key." },
    { status: 400 }
  );
}

export function handleError(e: unknown) {
  console.error("[api]", e);
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 500 });
}
