import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { ProfileForm } from "@/app/profile/profile-form";
import { EMPTY_PROFILE, type ProfileRecord } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/profile");
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const initial: ProfileRecord = { ...EMPTY_PROFILE };
  if (data) {
    for (const key of Object.keys(EMPTY_PROFILE) as (keyof ProfileRecord)[]) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === "string") {
        initial[key] = value;
      }
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Your profile
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Fill this once. CareerProof embeds it and recalls the relevant parts on
          every run, so your output stays personal without re-pasting context.
        </p>
        <ProfileForm initial={initial} />
      </main>
    </>
  );
}
