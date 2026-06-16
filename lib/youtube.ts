import { Innertube } from "youtubei.js";

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
  // eslint-disable-next-line no-console
  console.log("[collect] channel tabs:", channel.tabs, "has_videos:", channel.has_videos);
  const videosTab = await channel.getVideos();
  // eslint-disable-next-line no-console
  console.log(
    "[collect] videosTab.videos.length:",
    (videosTab as { videos?: unknown[] }).videos?.length
  );

  const videos: ChannelVideo[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = videosTab;
  while (current) {
    for (const item of current.videos) {
      const videoId = item.id as string | undefined;
      if (!videoId) continue;
      videos.push({
        videoId,
        title: String(item.title?.text ?? ""),
        publishedAt: item.published?.text ?? null,
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
