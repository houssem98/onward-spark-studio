import type { ReactNode } from "react";
import { AlertTriangle, Ban, Clock, Inbox, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const DATA_STATES = [
  "loading",
  "empty",
  "error",
  "denied",
  "stale",
  "partial",
  "success",
  "disabled",
] as const;

export type DataState = (typeof DATA_STATES)[number];

const messageBase = "flex items-center gap-1.5 rounded-md text-xs";

/** Renders `children` as-is on success; every other state is visibly different. */
export function StateBoundary({
  state = "success",
  label,
  note,
  inline = false,
  children,
}: {
  state?: DataState | undefined;
  label: string;
  note?: string | undefined;
  inline?: boolean;
  children: ReactNode;
}) {
  const Tag = inline ? "span" : "div";
  const suffix = note ? ` ${note}` : "";
  const message = cn(messageBase, !inline && "px-3 py-2");
  switch (state) {
    case "success":
      return <>{children}</>;
    case "loading":
      return (
        <Tag
          role="status"
          aria-busy="true"
          className={cn(message, "animate-pulse text-muted-foreground")}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading {label}…
        </Tag>
      );
    case "empty":
      return (
        <Tag className={cn(message, "text-muted-foreground")}>
          <Inbox className="h-3.5 w-3.5" aria-hidden /> No {label} for this selection.{suffix}
        </Tag>
      );
    case "error":
      return (
        <Tag role="alert" className={cn(message, "text-critical")}>
          <XCircle className="h-3.5 w-3.5" aria-hidden /> {label} could not be loaded.{suffix}
        </Tag>
      );
    case "denied":
      return (
        <Tag className={cn(message, "text-muted-foreground")}>
          <Ban className="h-3.5 w-3.5" aria-hidden /> You do not have access to {label}.{suffix}
        </Tag>
      );
    case "disabled":
      return (
        <Tag aria-disabled="true" className="pointer-events-none opacity-50">
          {children}
        </Tag>
      );
    case "stale":
    case "partial":
      return (
        <Tag className={inline ? "inline-flex items-center gap-1" : undefined}>
          {children}
          <Tag className={cn(message, "mt-1 text-warning", inline && "mt-0")}>
            {state === "stale" ? (
              <Clock className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            )}
            {state === "stale" ? "Stale data" : "Partial result"}
            {suffix}
          </Tag>
        </Tag>
      );
  }
}
