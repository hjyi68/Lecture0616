import { put, head } from "@vercel/blob";

export interface RagEntry {
  videoId: string;
  title: string;
  publishedAt: string | null;
  chunkIndex: number;
  startSeconds: number;
  text: string;
  embedding: number[];
}

const INDEX_PATH = "rag/syukaworld-index.json";

export async function loadIndex(): Promise<RagEntry[]> {
  try {
    const blob = await head(INDEX_PATH);
    const res = await fetch(blob.url);
    if (!res.ok) return [];
    return (await res.json()) as RagEntry[];
  } catch {
    return [];
  }
}

export async function saveIndex(entries: RagEntry[]): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(entries), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export function getCollectedVideoIds(entries: RagEntry[]): Set<string> {
  return new Set(entries.map((e) => e.videoId));
}
