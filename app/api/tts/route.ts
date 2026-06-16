import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/elevenlabs";

export async function POST(req: NextRequest) {
  const { text, voice } = (await req.json()) as { text?: string; voice?: string };
  if (!text) {
    return NextResponse.json({ error: "text가 필요합니다." }, { status: 400 });
  }

  try {
    const audio = await textToSpeech(text, voice ?? "male");
    return new NextResponse(audio, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
