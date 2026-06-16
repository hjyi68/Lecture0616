"use client";

import { useEffect, useRef, useState } from "react";

interface VideoInsight {
  videoId: string;
  title: string;
  publishedAt: string | null;
  chunkCount: number;
}

interface InsightsResponse {
  totalChunks: number;
  totalVideos: number;
  videos: VideoInsight[];
}

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

const MARKET_SNAPSHOT = [
  { label: "KOSPI", value: "연동 예정" },
  { label: "KOSDAQ", value: "연동 예정" },
  { label: "USD/KRW", value: "연동 예정" },
];

export default function Home() {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [voice, setVoice] = useState<"male" | "female">("male");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetch("/api/insights")
      .then((res) => res.json())
      .then(setInsights)
      .catch(() => setInsights(null));
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const answer: string = data.answer ?? data.error ?? "응답을 받지 못했습니다.";
      setMessages((m) => [...m, { role: "agent", text: answer }]);
      await playTts(answer);
    } catch (e) {
      setMessages((m) => [...m, { role: "agent", text: `오류: ${String(e)}` }]);
    } finally {
      setBusy(false);
    }
  }

  async function playTts(text: string) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch {
      // 음성 재생 실패 시 텍스트 답변만 표시
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      setBusy(true);
      try {
        const form = new FormData();
        form.append("audio", audioBlob, "audio.webm");
        const res = await fetch("/api/stt", { method: "POST", body: form });
        const data = await res.json();
        if (data.text) {
          await sendMessage(data.text);
        }
      } finally {
        setBusy(false);
      }
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#0f0f0f",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Hero */}
      <section
        style={{
          padding: "96px 24px 64px",
          textAlign: "center",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <p
          style={{
            fontSize: 13,
            letterSpacing: 2,
            color: "#999",
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          HJStock · AI Research Agent
        </p>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 800,
            margin: "0 0 16px",
            letterSpacing: -1,
          }}
        >
          슈카월드 영상으로 만든
          <br />
          나만의 투자 리서치 에이전트
        </h1>
        <p style={{ fontSize: 16, color: "#666", maxWidth: 520, margin: "0 auto 36px" }}>
          매일 업데이트되는 영상 콘텐츠를 근거로, 묻는 즉시 출처와 함께
          답해주는 음성 대화형 에이전트입니다.
        </p>

        <button
          onClick={() => setCallOpen(true)}
          aria-label="에이전트 호출"
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            border: "none",
            background: "#111111",
            color: "#fff",
            fontSize: 28,
            cursor: "pointer",
            boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
          }}
        >
          🎙
        </button>
        <p style={{ fontSize: 13, color: "#aaa", marginTop: 12 }}>
          눌러서 대화 시작
        </p>
      </section>

      {/* Market snapshot */}
      <section style={{ padding: "48px 24px", maxWidth: 960, margin: "0 auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
          시장 스냅샷
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {MARKET_SNAPSHOT.map((m) => (
            <div
              key={m.label}
              style={{
                border: "1px solid #eee",
                borderRadius: 16,
                padding: "24px 20px",
              }}
            >
              <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#bbb" }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest insights */}
      <section style={{ padding: "48px 24px 96px", maxWidth: 960, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>최근 수집된 인사이트</h2>
          {insights && (
            <span style={{ fontSize: 13, color: "#999" }}>
              영상 {insights.totalVideos}개 · 청크 {insights.totalChunks}개
            </span>
          )}
        </div>

        {!insights || insights.videos.length === 0 ? (
          <div
            style={{
              border: "1px dashed #ddd",
              borderRadius: 16,
              padding: "40px 24px",
              textAlign: "center",
              color: "#999",
              fontSize: 14,
            }}
          >
            아직 수집된 영상이 없습니다. 관리자 화면에서 정보수집 에이전트를
            실행해 주세요.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {insights.videos.map((v) => (
              <li
                key={v.videoId}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.title}</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                    {v.publishedAt ?? "업로드 일시 미상"} · 발췌 {v.chunkCount}개
                  </div>
                </div>
                <a
                  href={`https://www.youtube.com/watch?v=${v.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, color: "#111", whiteSpace: "nowrap" }}
                >
                  영상 보기 ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {callOpen && (
        <div
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setCallOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: "20px 20px 0 0",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>에이전트와 대화</h3>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value as "male" | "female")}
                style={{
                  fontSize: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "4px 8px",
                }}
              >
                <option value="male">남자 목소리</option>
                <option value="female">여자 목소리</option>
              </select>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 12,
                minHeight: 120,
              }}
            >
              {messages.length === 0 && (
                <p style={{ fontSize: 13, color: "#999" }}>
                  마이크 버튼을 누르고 말하거나, 아래 입력창에 텍스트로
                  질문해보세요.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    background: m.role === "user" ? "#111" : "#f3f3f3",
                    color: m.role === "user" ? "#fff" : "#111",
                    borderRadius: 12,
                    padding: "8px 12px",
                    fontSize: 13,
                    maxWidth: "85%",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </div>
              ))}
              {busy && (
                <div style={{ fontSize: 12, color: "#999" }}>생각하는 중...</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={recording ? stopRecording : startRecording}
                style={{
                  border: "none",
                  borderRadius: "50%",
                  width: 44,
                  height: 44,
                  background: recording ? "#ef4444" : "#111",
                  color: "#fff",
                  fontSize: 18,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {recording ? "■" : "🎙"}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    sendMessage(input);
                    setInput("");
                  }
                }}
                placeholder="텍스트로 질문하기"
                style={{
                  flex: 1,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: "0 12px",
                  fontSize: 14,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
