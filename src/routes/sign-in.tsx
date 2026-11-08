import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EnvironmentBanner } from "@/components/AppShell";
import { Notice, PageHeader } from "@/components/kit";
import { Stagger } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { repo } from "@/repo/queries";
import { signIn, signOut, supabase } from "@/repo/supabase";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — BankIntelli" }] }),
  component: SignIn,
});

// The demo renders this page in the shell like any other; production renders it alone, since
// the shell needs a signed-in user before it can load.
function SignIn() {
  if (repo.environment === "demo")
    return (
      <Stagger className="space-y-section">
        <PageHeader title="Sign in" description="Who is using BankIntelli, and in what role." />
        <Notice>
          The demo signs everyone in as its synthetic user. Sign-in applies when the production data
          source is configured.
        </Notice>
        <Link to="/" className="text-sm text-primary hover:underline">
          Back to the overview
        </Link>
      </Stagger>
    );
  return (
    <div className="min-h-screen bg-background">
      <EnvironmentBanner environment={repo.environment} />
      <main id="main" className="mx-auto w-full max-w-sm space-y-section px-4 py-16">
        <h1 className="text-xl font-semibold tracking-tight">Sign in to BankIntelli</h1>
        <SignInForm />
      </main>
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve()
      .then(() => supabase().auth.getUser())
      .then(({ data }) => setCurrent(data.user?.email ?? null))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (current)
    return (
      <div className="space-y-4">
        <p className="text-sm">Signed in as {current}.</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              signOut().then(
                () => {
                  queryClient.clear();
                  setCurrent(null);
                },
                (e: Error) => setError(e.message),
              )
            }
          >
            Sign out
          </Button>
          <Button asChild>
            <Link to="/">Continue</Link>
          </Button>
        </div>
      </div>
    );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        signIn(email, password).then(
          () => {
            queryClient.clear();
            navigate({ to: "/" });
          },
          (e: Error) => setError(e.message),
        );
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full">
        Sign in
      </Button>
    </form>
  );
}
