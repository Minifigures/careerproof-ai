// Embeddings via Voyage AI (Anthropic's recommended embeddings partner; the
// Anthropic API has no embeddings endpoint). When VOYAGE_API_KEY is absent the
// app degrades to Postgres full-text search, so embeddings are always optional.

export const EMBEDDING_DIMENSION = 1024; // voyage-3.5 default output size
const EMBEDDING_MODEL = "voyage-3.5";

export function embeddingsEnabled(): boolean {
  return Boolean(process.env.VOYAGE_API_KEY);
}

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
}

async function callVoyage(
  inputs: string[],
  inputType: "document" | "query",
): Promise<number[][]> {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: inputs,
      model: EMBEDDING_MODEL,
      input_type: inputType,
      output_dimension: EMBEDDING_DIMENSION,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`Voyage embeddings returned ${response.status}`);
  }
  const json = (await response.json()) as VoyageResponse;
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.embedding);
}

export async function embedDocuments(
  chunks: string[],
): Promise<number[][] | null> {
  if (!embeddingsEnabled() || chunks.length === 0) {
    return null;
  }
  return callVoyage(chunks, "document");
}

export async function embedQuery(query: string): Promise<number[] | null> {
  if (!embeddingsEnabled() || query.trim().length === 0) {
    return null;
  }
  const [embedding] = await callVoyage([query], "query");
  return embedding ?? null;
}
