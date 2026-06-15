import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRecord } from "@/lib/types";
import { embedDocuments, embedQuery, embeddingsEnabled } from "@/lib/embeddings";

const CHUNK_MAX = 700;

// Split a saved profile into labeled, embeddable chunks. One section per field so
// retrieval can surface just the relevant slice (skills vs projects vs history).
export function chunkProfile(profile: ProfileRecord): string[] {
  const sections: [string, string][] = [
    ["Headline", profile.headline],
    ["Summary", profile.summary],
    ["Work experience", profile.work_experience],
    ["Education", profile.education],
    ["Skills", profile.skills],
    ["Projects", profile.projects],
  ];
  const chunks: string[] = [];
  for (const [label, value] of sections) {
    const text = value?.trim();
    if (!text) continue;
    // Split long sections on blank lines, then hard-cap each piece.
    for (const piece of text.split(/\n\s*\n/)) {
      const trimmed = piece.trim();
      if (!trimmed) continue;
      for (let i = 0; i < trimmed.length; i += CHUNK_MAX) {
        chunks.push(`${label}: ${trimmed.slice(i, i + CHUNK_MAX)}`);
      }
    }
  }
  return chunks;
}

// Rebuild the user's chunk set: delete the old rows, insert the new ones (with
// embeddings when Voyage is configured, otherwise text-only for FTS).
export async function rebuildProfileChunks(
  supabase: SupabaseClient,
  userId: string,
  profile: ProfileRecord,
): Promise<void> {
  const chunks = chunkProfile(profile);
  await supabase.from("profile_chunks").delete().eq("user_id", userId);
  if (chunks.length === 0) return;

  const embeddings = await embedDocuments(chunks);
  const rows = chunks.map((content, index) => ({
    user_id: userId,
    content,
    embedding: embeddings ? embeddings[index] : null,
  }));
  await supabase.from("profile_chunks").insert(rows);
}

interface ChunkRow {
  content: string;
}

// Retrieve the most relevant saved-profile context for this generation. Uses
// vector similarity when embeddings exist, else Postgres full-text search.
export async function retrieveContext(
  supabase: SupabaseClient,
  query: string,
  matchCount = 6,
): Promise<string> {
  if (embeddingsEnabled()) {
    const embedding = await embedQuery(query);
    if (embedding) {
      const { data } = await supabase.rpc("match_profile_chunks", {
        query_embedding: embedding,
        match_count: matchCount,
      });
      if (data && data.length > 0) {
        return (data as ChunkRow[]).map((row) => row.content).join("\n");
      }
    }
  }

  // Full-text fallback (also the path when no profile embeddings exist yet).
  const { data } = await supabase
    .from("profile_chunks")
    .select("content")
    .textSearch("content", query, { type: "websearch", config: "english" })
    .limit(matchCount);
  if (data && data.length > 0) {
    return (data as ChunkRow[]).map((row) => row.content).join("\n");
  }
  return "";
}
