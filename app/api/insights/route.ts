import { NextResponse } from "next/server";
import { loadIndex } from "@/lib/rag-store";

interface VideoInsight {
  videoId: string;
  title: string;
  publishedAt: string | null;
  chunkCount: number;
}

export async function GET() {
  const index = await loadIndex();

  const byVideo = new Map<string, VideoInsight>();
  for (const entry of index) {
    const existing = byVideo.get(entry.videoId);
    if (existing) {
      existing.chunkCount += 1;
    } else {
      byVideo.set(entry.videoId, {
        videoId: entry.videoId,
        title: entry.title,
        publishedAt: entry.publishedAt,
        chunkCount: 1,
      });
    }
  }

  const videos = Array.from(byVideo.values()).reverse().slice(0, 8);

  return NextResponse.json({
    totalChunks: index.length,
    totalVideos: byVideo.size,
    videos,
  });
}
