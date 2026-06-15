import { Nav } from "@/components/nav";
import { LoginForm } from "@/app/login/login-form";

// Server page reads searchParams (a Promise in Next 16) and passes plain props
// into the client form, avoiding a useSearchParams Suspense boundary.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Sign in to CareerProof AI
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Use a magic link or Google. Your profile and run history are tied to
          your account.
        </p>
        <LoginForm
          next={params.next ?? "/app"}
          initialError={params.error ?? null}
        />
      </main>
    </>
  );
}
