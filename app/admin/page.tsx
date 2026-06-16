"use client";

import { useEffect, useState } from "react";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

interface StatusResponse {
  checkedAt: string;
  checks: CheckResult[];
}

export default function AdminPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [collectResult, setCollectResult] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/status");
      setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function runCollect() {
    setCollecting(true);
    setCollectResult(null);
    try {
      const res = await fetch("/api/collect");
      const data = await res.json();
      setCollectResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setCollectResult(String(e));
    } finally {
      setCollecting(false);
      refresh();
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#111111",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
          HJStock 관리자
        </h1>
        <p style={{ color: "#666", marginBottom: 32 }}>
          API 연동 상태 및 정보수집 에이전트 점검
        </p>

        <section
          style={{
            border: "1px solid #eaeaea",
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>API 상태</h2>
            <button
              onClick={refresh}
              disabled={loading}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: "6px 14px",
                background: "#fafafa",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {loading ? "확인 중..." : "새로고침"}
            </button>
          </div>

          {!status && <p style={{ color: "#999" }}>불러오는 중...</p>}

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {status?.checks.map((c) => (
              <li
                key={c.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid #f3f3f3",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: c.ok ? "#22c55e" : "#ef4444",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: "#777" }}>{c.detail}</div>
                </div>
              </li>
            ))}
          </ul>

          {status && (
            <p style={{ fontSize: 12, color: "#aaa", marginTop: 12 }}>
              마지막 점검: {new Date(status.checkedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </section>

        <section
          style={{
            border: "1px solid #eaeaea",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            정보수집 에이전트 수동 실행
          </h2>
          <p style={{ fontSize: 13, color: "#777", marginBottom: 16 }}>
            @syukaworld 채널에서 신규 영상을 수집해 RAG에 반영합니다.
          </p>
          <button
            onClick={runCollect}
            disabled={collecting}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              background: "#111111",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {collecting ? "수집 실행 중..." : "지금 수집 실행"}
          </button>

          {collectResult && (
            <pre
              style={{
                marginTop: 16,
                background: "#fafafa",
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 16,
                fontSize: 12,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {collectResult}
            </pre>
          )}
        </section>
      </div>
    </main>
  );
}
