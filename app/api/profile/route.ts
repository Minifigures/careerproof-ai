import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rebuildProfileChunks } from "@/lib/rag";
import { embeddingsEnabled } from "@/lib/embeddings";
import { EMPTY_PROFILE, type ProfileRecord } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const FIELDS = Object.keys(EMPTY_PROFILE) as (keyof ProfileRecord)[];

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return Response.json({ profile: data ?? null });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ProfileRecord>;
  const profile = { ...EMPTY_PROFILE };
  for (const field of FIELDS) {
    const value = body[field];
    if (typeof value === "string") {
      profile[field] = value;
    }
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    ...profile,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Rebuild the RAG chunk set from the saved profile.
  await rebuildProfileChunks(supabase, user.id, profile);

  return Response.json({ ok: true, embeddings: embeddingsEnabled() });
}
