import { loadIndex, RagEntry } from "./rag-store";
import { embedTexts, cosineSimilarity } from "./embeddings";

export interface RetrievedChunk extends RagEntry {
  score: number;
}

export async function retrieveTopK(
  query: string,
  k = 5
): Promise<RetrievedChunk[]> {
  const index = await loadIndex();
  if (index.length === 0) return [];

  const [queryEmbedding] = await embedTexts([query]);

  return index
    .map((entry) => ({ ...entry, score: cosineSimilarity(queryEmbedding, entry.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
