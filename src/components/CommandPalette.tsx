import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bot, BrainCircuit, Database, FileSearch, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { NAV_GROUPS } from "@/components/AppShell";
import { useStore } from "@/store/app-store";
import { MODELS } from "@/data/models";
import { DATASETS } from "@/data/datasets";

type Page = (typeof NAV_GROUPS)[number]["items"][number];

export function CommandPalette({
  open,
  onOpenChange,
  pages,
  onAsk,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: readonly Page[];
  onAsk: (question: string) => void;
}) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const investigations = useStore((s) => s.investigations);
  const cases = useStore((s) => s.cases);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const close = () => {
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Search BankIntelli</DialogTitle>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search pages, investigations, models, cases, datasets…"
          />
          <CommandList>
            <CommandEmpty>Nothing matches. Try an id such as MDL-002 or CASE-0917.</CommandEmpty>
            <CommandGroup heading="Pages">
              {pages.map((p) => (
                <CommandItem
                  key={p.to}
                  value={`page ${p.label}`}
                  onSelect={() => {
                    close();
                    navigate({ to: p.to });
                  }}
                >
                  <p.icon className="h-4 w-4" /> {p.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Investigations">
              {investigations.map((i) => (
                <CommandItem
                  key={i.id}
                  value={`${i.id} ${i.title}`}
                  onSelect={() => {
                    close();
                    navigate({ to: "/investigations/$id", params: { id: i.id } });
                  }}
                >
                  <FileSearch className="h-4 w-4" /> {i.id} · {i.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Models">
              {MODELS.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.id} ${m.name}`}
                  onSelect={() => {
                    close();
                    navigate({ to: "/models/$id", params: { id: m.id } });
                  }}
                >
                  <BrainCircuit className="h-4 w-4" /> {m.id} · {m.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Cases">
              {cases.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.id} ${c.title}`}
                  onSelect={() => {
                    close();
                    navigate({ to: "/crime/$id", params: { id: c.id } });
                  }}
                >
                  <ShieldAlert className="h-4 w-4" /> {c.id} · {c.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Datasets (open the catalog)">
              {DATASETS.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`${d.id} ${d.name}`}
                  onSelect={() => {
                    close();
                    navigate({ to: "/data" });
                  }}
                >
                  <Database className="h-4 w-4" /> {d.id} · {d.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {query.trim() && (
              <CommandGroup heading="Copilot (predefined demo answers)">
                <CommandItem
                  value={`copilot ${query}`}
                  onSelect={() => {
                    const q = query;
                    close();
                    onAsk(q);
                  }}
                >
                  <Bot className="h-4 w-4" /> Ask the copilot: “{query}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
