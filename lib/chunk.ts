import type { TranscriptSegment } from "./youtube";

export interface TranscriptChunk {
  text: string;
  startSeconds: number;
}

const MAX_CHARS = 1200;

export function chunkTranscript(
  segments: TranscriptSegment[]
): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  let buffer = "";
  let bufferStart: number | null = null;

  for (const seg of segments) {
    if (bufferStart === null) bufferStart = seg.startSeconds;
    const next = buffer ? `${buffer} ${seg.text}` : seg.text;
    if (next.length > MAX_CHARS && buffer) {
      chunks.push({ text: buffer, startSeconds: bufferStart });
      buffer = seg.text;
      bufferStart = seg.startSeconds;
    } else {
      buffer = next;
    }
  }
  if (buffer && bufferStart !== null) {
    chunks.push({ text: buffer, startSeconds: bufferStart });
  }
  return chunks;
}
