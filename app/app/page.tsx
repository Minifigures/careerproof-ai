import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Workspace } from "@/app/app/workspace";

export default async function AppPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/app");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("headline, summary, skills, work_experience, projects")
    .eq("id", user.id)
    .maybeSingle();

  const hasProfile =
    !!profile &&
    Object.values(profile).some(
      (value) => typeof value === "string" && value.trim().length > 0,
    );

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Workspace
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Describe your experience and a target role. CareerProof runs a
            seven-step chain and keeps every claim defensible.
          </p>
        </div>

        {!hasProfile && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Tip: fill in your{" "}
            <Link href="/profile" className="font-medium underline">
              profile
            </Link>{" "}
            once so CareerProof remembers your background and personalizes every
            run.
          </div>
        )}

        <Workspace />
      </main>
    </>
  );
}
