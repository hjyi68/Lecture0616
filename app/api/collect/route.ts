import { NextRequest, NextResponse } from "next/server";
import { listChannelVideos, getVideoTranscript } from "@/lib/youtube";
import { chunkTranscript } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import { loadIndex, saveIndex, getCollectedVideoIds, RagEntry } from "@/lib/rag-store";

export const maxDuration = 300;

const CHANNEL_HANDLE = "@syukaworld";
const MAX_VIDEOS_PER_RUN = 5;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let index = await loadIndex();
  const collectedIds = getCollectedVideoIds(index);

  const allVideos = await listChannelVideos(CHANNEL_HANDLE);
  const newVideos = allVideos
    .filter((v) => !collectedIds.has(v.videoId))
    .slice(0, MAX_VIDEOS_PER_RUN);

  const processed: string[] = [];
  const failed: string[] = [];
  let addedChunks = 0;

  for (const video of newVideos) {
    try {
      const segments = await getVideoTranscript(video.videoId);
      const chunks = chunkTranscript(segments);
      if (chunks.length === 0) {
        processed.push(video.videoId);
        continue;
      }

      const embeddings = await embedTexts(chunks.map((c) => c.text));

      const newEntries: RagEntry[] = chunks.map((chunk, i) => ({
        videoId: video.videoId,
        title: video.title,
        publishedAt: video.publishedAt,
        chunkIndex: i,
        startSeconds: chunk.startSeconds,
        text: chunk.text,
        embedding: embeddings[i],
      }));

      index = [...index, ...newEntries];
      await saveIndex(index);
      addedChunks += newEntries.length;
      processed.push(video.videoId);
    } catch {
      failed.push(video.videoId);
    }
  }

  const remaining = allVideos.filter((v) => !collectedIds.has(v.videoId)).length - processed.length - failed.length;

  return NextResponse.json({
    status: "ok",
    scannedVideos: allVideos.length,
    processedVideos: processed.length,
    newChunks: addedChunks,
    failedVideos: failed,
    remainingVideos: Math.max(remaining, 0),
    hint: remaining > 0 ? "남은 영상이 있습니다. /api/collect를 다시 호출하세요." : "모든 신규 영상을 수집했습니다.",
  });
}
