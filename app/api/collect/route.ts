import { NextRequest, NextResponse } from "next/server";
import { listChannelVideos, getVideoTranscript } from "@/lib/youtube";
import { chunkTranscript } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import { loadIndex, saveIndex, getCollectedVideoIds, RagEntry } from "@/lib/rag-store";

export const maxDuration = 300;

const CHANNEL_HANDLE = "@syukaworld";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const index = await loadIndex();
  const collectedIds = getCollectedVideoIds(index);

  const allVideos = await listChannelVideos(CHANNEL_HANDLE);
  const newVideos = allVideos.filter((v) => !collectedIds.has(v.videoId));

  const newEntries: RagEntry[] = [];
  const failed: string[] = [];

  for (const video of newVideos) {
    try {
      const segments = await getVideoTranscript(video.videoId);
      const chunks = chunkTranscript(segments);
      if (chunks.length === 0) continue;

      const embeddings = await embedTexts(chunks.map((c) => c.text));

      chunks.forEach((chunk, i) => {
        newEntries.push({
          videoId: video.videoId,
          title: video.title,
          publishedAt: video.publishedAt,
          chunkIndex: i,
          startSeconds: chunk.startSeconds,
          text: chunk.text,
          embedding: embeddings[i],
        });
      });
    } catch (err) {
      failed.push(video.videoId);
    }
  }

  if (newEntries.length > 0) {
    await saveIndex([...index, ...newEntries]);
  }

  return NextResponse.json({
    status: "ok",
    scannedVideos: allVideos.length,
    newVideos: newVideos.length,
    newChunks: newEntries.length,
    failedVideos: failed,
  });
}
