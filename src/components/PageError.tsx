import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";

import { Notice } from "@/components/kit";
import { Button } from "@/components/ui/button";

/** A page's error, shown inside the shell so its navigation stays usable (L6 T4d). */
export function PageError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const message = error instanceof Error ? error.message : String(error);
  if (/not configured/.test(message))
    return (
      <Notice tone="warning">
        <span>
          This page&apos;s data is not connected in this environment. In production,{" "}
          <Link to="/tn-banks" className="underline">
            Tunisian Banks
          </Link>{" "}
          and{" "}
          <Link to="/investigations" className="underline">
            Investigations
          </Link>{" "}
          have their sources.
        </span>
      </Notice>
    );
  return (
    <Notice tone="warning">
      <span>
        This page didn&apos;t load: {message}{" "}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void router.invalidate();
            reset();
          }}
        >
          Try again
        </Button>
      </span>
    </Notice>
  );
}
