import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { retrieveTopK } from "@/lib/retrieve";

export async function POST(req: NextRequest) {
  const { message } = (await req.json()) as { message?: string };
  if (!message) {
    return NextResponse.json({ error: "message가 필요합니다." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY 미설정" }, { status: 500 });
  }

  const chunks = await retrieveTopK(message, 5);

  const context = chunks.length
    ? chunks
        .map(
          (c, i) =>
            `[${i + 1}] (${c.title}, ${Math.floor(c.startSeconds / 60)}:${String(
              c.startSeconds % 60
            ).padStart(2, "0")}) ${c.text}`
        )
        .join("\n\n")
    : "(참고할 영상 자료가 아직 없습니다)";

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "너는 유튜브 채널 '슈카월드'의 발언을 근거로 답하는 투자 리서치 비서다. " +
          "아래 [참고자료]에 있는 내용만 근거로 답하고, 근거가 없으면 '슈카월드 영상에서 해당 내용을 찾지 못했습니다'라고 말해라. " +
          "답변 끝에 참고한 자료 번호를 [1], [2]처럼 표기해라. 투자 자문이 아닌 정보 요약임을 필요시 알려라.\n\n" +
          `[참고자료]\n${context}`,
      },
      { role: "user", content: message },
    ],
  });

  const answer = completion.choices[0]?.message?.content ?? "";

  return NextResponse.json({
    answer,
    sources: chunks.map((c) => ({
      videoId: c.videoId,
      title: c.title,
      startSeconds: c.startSeconds,
      score: c.score,
    })),
  });
}
