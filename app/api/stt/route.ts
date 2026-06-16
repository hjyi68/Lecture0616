import { NextRequest, NextResponse } from "next/server";
import { speechToText } from "@/lib/elevenlabs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "audio 파일이 필요합니다." }, { status: 400 });
  }

  try {
    const text = await speechToText(file);
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
