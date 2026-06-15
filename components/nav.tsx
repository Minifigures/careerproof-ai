import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

// Server-rendered top navigation. Shows workspace links when signed in.
export async function Nav() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-stone-900"
        >
          CareerProof <span className="text-teal-700">AI</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {user ? (
            <>
              <Link
                href="/app"
                className="text-stone-600 transition hover:text-stone-900"
              >
                Workspace
              </Link>
              <Link
                href="/profile"
                className="text-stone-600 transition hover:text-stone-900"
              >
                Profile
              </Link>
              <Link
                href="/history"
                className="text-stone-600 transition hover:text-stone-900"
              >
                History
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-teal-700 px-3 py-1.5 font-medium text-white transition hover:bg-teal-800"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
