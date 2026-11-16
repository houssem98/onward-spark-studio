import type { ModelReply } from "@/lib/ask-client";

/** The model's draft, or why there is none, above the routing's figures and state (L7 T10). */
export function ModelDraft({ reply }: { reply: ModelReply }) {
  if ("note" in reply) return <p className="text-xs text-muted-foreground">{reply.note}</p>;
  return (
    <div className="space-y-1 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
      <p className="eyebrow">Model&apos;s answer</p>
      {reply.withheld ? (
        <p className="text-xs text-warning">{reply.withheld}</p>
      ) : (
        <p>{reply.text}</p>
      )}
      {reply.tools.length > 0 && (
        <p className="text-xs text-muted-foreground">From {reply.tools.join(", ")}</p>
      )}
    </div>
  );
}
