import { Innertube, YTNodes } from "youtubei.js";

export interface ChannelVideo {
  videoId: string;
  title: string;
  publishedAt: string | null;
}

export interface TranscriptSegment {
  text: string;
  startSeconds: number;
}

let clientPromise: Promise<Innertube> | null = null;

function getClient() {
  if (!clientPromise) {
    clientPromise = Innertube.create({ generate_session_locally: true });
  }
  return clientPromise;
}

function extractPublishedText(metadataRows: unknown): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = metadataRows as any[] | undefined;
  if (!rows) return null;
  for (const row of rows) {
    for (const part of row.metadata_parts ?? []) {
      const text = part.text?.text as string | undefined;
      if (text && /전|ago/.test(text)) return text;
    }
  }
  return null;
}

async function resolveChannelId(yt: Innertube, handle: string): Promise<string> {
  const endpoint = await yt.resolveURL(`https://www.youtube.com/${handle}`);
  const browseId = (endpoint.payload as { browseId?: string } | undefined)?.browseId;
  if (!browseId) throw new Error(`채널을 찾을 수 없습니다: ${handle}`);
  return browseId;
}

export async function listChannelVideos(
  handle: string
): Promise<ChannelVideo[]> {
  const yt = await getClient();
  const channelId = await resolveChannelId(yt, handle);
  const channel = await yt.getChannel(channelId);
  const videosTab = await channel.getVideos();

  const videos: ChannelVideo[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = videosTab;
  while (current) {
    for (const item of current.videos as unknown[]) {
      const videoId = (item as { id?: string }).id;
      if (videoId) {
        videos.push({
          videoId,
          title: String((item as { title?: { text?: string } }).title?.text ?? ""),
          publishedAt: (item as { published?: { text?: string } }).published?.text ?? null,
        });
        continue;
      }
    }

    const lockups = current.memo?.getType(YTNodes.LockupView) ?? [];
    for (const lockup of lockups as InstanceType<typeof YTNodes.LockupView>[]) {
      if (lockup.content_type !== "VIDEO") continue;
      const videoId = lockup.content_id;
      if (!videoId || videos.some((v) => v.videoId === videoId)) continue;
      videos.push({
        videoId,
        title: String(lockup.metadata?.title?.text ?? ""),
        publishedAt: extractPublishedText(lockup.metadata?.metadata?.metadata_rows),
      });
    }

    if (!current.has_continuation) break;
    current = await current.getContinuation();
  }
  return videos;
}

export async function getVideoTranscript(
  videoId: string
): Promise<TranscriptSegment[]> {
  const yt = await getClient();
  const info = await yt.getInfo(videoId);
  const transcriptData = await info.getTranscript();

  const segments =
    transcriptData?.transcript?.content?.body?.initial_segments ?? [];

  return segments
    .map((seg) => {
      const s = seg as {
        snippet?: { text?: string };
        start_ms?: string | number;
      };
      const text = s.snippet?.text?.trim();
      if (!text) return null;
      const startMs = Number(s.start_ms ?? 0);
      return { text, startSeconds: Math.floor(startMs / 1000) };
    })
    .filter((s): s is TranscriptSegment => s !== null);
}
