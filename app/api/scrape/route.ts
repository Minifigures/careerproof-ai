import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scrapeJob } from "@/lib/scrape";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ScrapeBody {
  url?: string;
}

// Preview endpoint so the workspace can confirm a job URL was read (and via which
// path) before the user generates. Generation also scrapes internally.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ScrapeBody;
  const url = body.url?.trim();
  if (!url) {
    return Response.json({ error: "A URL is required." }, { status: 400 });
  }

  const scraped = await scrapeJob(url);
  if (!scraped) {
    return Response.json(
      {
        error:
          "Could not read that link (the site may block automated reads). Paste the job description text instead.",
      },
      { status: 422 },
    );
  }

  return Response.json({
    text: scraped.text,
    source: scraped.source,
    chars: scraped.text.length,
  });
}
