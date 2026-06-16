import { NextResponse } from "next/server";
import { loadIndex } from "@/lib/rag-store";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function checkOpenAI(): Promise<CheckResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { name: "OpenAI API", ok: false, detail: "OPENAI_API_KEY 미설정" };
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return {
      name: "OpenAI API",
      ok: res.ok,
      detail: res.ok ? "연결 정상" : `응답 코드 ${res.status}`,
    };
  } catch (e) {
    return { name: "OpenAI API", ok: false, detail: String(e) };
  }
}

async function checkElevenLabs(): Promise<CheckResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key)
    return { name: "ElevenLabs API", ok: false, detail: "ELEVENLABS_API_KEY 미설정" };
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": key },
    });
    return {
      name: "ElevenLabs API",
      ok: res.ok,
      detail: res.ok ? "연결 정상" : `응답 코드 ${res.status}`,
    };
  } catch (e) {
    return { name: "ElevenLabs API", ok: false, detail: String(e) };
  }
}

async function checkBlob(): Promise<CheckResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token)
    return {
      name: "Vercel Blob (RAG 저장소)",
      ok: false,
      detail: "BLOB_READ_WRITE_TOKEN 미설정 — 스토어 연결 필요",
    };
  try {
    const index = await loadIndex();
    return {
      name: "Vercel Blob (RAG 저장소)",
      ok: true,
      detail: `청크 ${index.length}건 적재됨`,
    };
  } catch (e) {
    return { name: "Vercel Blob (RAG 저장소)", ok: false, detail: String(e) };
  }
}

function checkCron(): CheckResult {
  const secret = process.env.CRON_SECRET;
  return {
    name: "정보수집 크론 보안키",
    ok: Boolean(secret),
    detail: secret ? "설정됨" : "CRON_SECRET 미설정",
  };
}

export async function GET() {
  const [openai, elevenlabs, blob] = await Promise.all([
    checkOpenAI(),
    checkElevenLabs(),
    checkBlob(),
  ]);
  const cron = checkCron();

  const checks = [openai, elevenlabs, blob, cron];
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    checks,
  });
}
