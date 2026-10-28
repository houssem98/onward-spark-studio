import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  Bot,
  BrainCircuit,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Database,
  FileSearch,
  FlaskConical,
  Landmark,
  LayoutDashboard,
  Menu,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/app-store";
import { answer, SUGGESTIONS, type CopilotAnswer } from "@/lib/copilot";
import { EvidenceBadge } from "@/components/kit";
import { copilotBus } from "@/lib/copilot-bus";
import { CommandPalette } from "@/components/CommandPalette";

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Executive Overview", icon: LayoutDashboard }],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/performance", label: "Performance & Peers", icon: TrendingUp },
      { to: "/credit", label: "AI Credit Intelligence", icon: Landmark },
      { to: "/crime", label: "Fraud, AML & Fin. Crime", icon: ShieldAlert },
      { to: "/data", label: "Data Governance", icon: Database },
      { to: "/models", label: "AI & Model Governance", icon: BrainCircuit },
    ],
  },
  {
    label: "Workflow",
    items: [{ to: "/investigations", label: "Investigations & Reports", icon: FileSearch }],
  },
  {
    label: "Administration",
    items: [{ to: "/audit", label: "Audit Trail", icon: Activity }],
  },
] as const;

function NavList({
  path,
  collapsed,
  onNavigate,
}: {
  path: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main" className="flex-1 space-y-3 overflow-y-auto p-2">
      {NAV_GROUPS.map((g) => (
        <div key={g.label}>
          {!collapsed && (
            <p className="px-2.5 pb-1 text-micro font-semibold uppercase tracking-wider text-ink-muted">
              {g.label}
            </p>
          )}
          <div className="space-y-0.5">
            {g.items.map((n) => {
              const active =
                n.to === "/"
                  ? path === "/"
                  : path.startsWith(n.to) ||
                    (n.to === "/investigations" && path.startsWith("/reports"));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  title={n.label}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-ui transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <n.icon className={cn("h-4 w-4 shrink-0", active && "text-cyan")} />
                  {!collapsed && <span className="truncate">{n.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const user = useStore((s) => s.user);
  const openCount = useStore(
    (s) =>
      s.issues.filter((i) => i.severity === "Critical" && i.status !== "Resolved").length +
      s.driftAlerts.filter((a) => a.status === "Open").length,
  );
  const [open, setOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [palette, setPalette] = useState(false);
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<{ q: string; a: CopilotAnswer }[]>([]);
  const navigate = useNavigate();

  const ask = (text: string) => {
    if (!text.trim()) return;
    setHistory((h) => [{ q: text, a: answer(text) }, ...h]);
    setQ("");
    setOpen(true);
  };
  copilotBus.ask = ask;

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
      >
        Skip to content
      </a>
      <aside
        className={cn(
          "no-print sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] md:flex",
          collapsed ? "w-14" : "w-60",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold text-sidebar-accent-foreground">
                BankIntelli
              </div>
              <div className="text-micro text-ink-muted">Verified intelligence</div>
            </div>
          )}
        </div>
        <NavList path={path} collapsed={collapsed} />
        <div className="border-t border-sidebar-border p-2">
          {!collapsed && (
            <p className="mb-2 px-1 text-micro leading-snug text-ink-muted">
              Proof of concept. All data is synthetic and belongs to the fictional Northstar Bank.
            </p>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-sidebar-accent"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" /> Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          <div
            role="note"
            aria-label="Environment"
            className="flex items-center gap-2 border-b bg-warning/10 px-4 py-1 text-caption text-warning"
          >
            <FlaskConical className="h-3.5 w-3.5 shrink-0" />
            <span>
              <b>Demo · synthetic data</b> — every figure belongs to the fictional Northstar Bank.
            </span>
          </div>
          <header className="no-print flex h-14 items-center gap-3 border-b bg-card px-3 md:px-4">
            <button
              className="rounded-md p-1.5 hover:bg-muted md:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <form
              className="relative min-w-0 max-w-md flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                ask(q);
              }}
            >
              <Sparkles className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ask BankIntelli about performance, risk, data or models…"
                className="h-9 pl-8 text-sm"
                aria-label="Ask BankIntelli"
              />
            </form>
            <div className="ml-auto flex items-center gap-2 text-xs md:gap-3">
              <span className="hidden text-muted-foreground md:inline">
                Northstar Bank (fictional) · FY2025
              </span>
              <button
                className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-muted-foreground hover:bg-muted"
                aria-label="Search (Ctrl+K)"
                onClick={() => setPalette(true)}
              >
                <Search className="h-3.5 w-3.5" />
                <kbd className="hidden font-mono text-micro sm:inline">Ctrl K</kbd>
              </button>
              <button
                className="relative rounded-md p-1.5 hover:bg-muted"
                aria-label={`${openCount} critical notifications`}
                onClick={() => navigate({ to: "/audit" })}
              >
                <Bell className="h-4 w-4" />
                {openCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-critical px-1 text-micro font-semibold text-primary-foreground">
                    {openCount}
                  </span>
                )}
              </button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                aria-label="Copilot"
                onClick={() => setOpen(true)}
              >
                <Bot className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copilot</span>
              </Button>
              <div className="hidden text-right leading-tight lg:block">
                <div className="font-medium">{user.name}</div>
                <div className="text-muted-foreground">{user.role}</div>
              </div>
            </div>
          </header>
        </div>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 p-3 outline-none sm:p-5"
        >
          {children}
        </main>
      </div>

      <CommandPalette
        open={palette}
        onOpenChange={setPalette}
        pages={NAV_GROUPS.flatMap((g) => [...g.items])}
        onAsk={ask}
      />

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent
          side="left"
          className="flex w-64 flex-col bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="border-b border-sidebar-border px-3 py-3">
            <SheetTitle className="text-sm text-sidebar-accent-foreground">BankIntelli</SheetTitle>
          </SheetHeader>
          <NavList path={path} collapsed={false} onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> BankIntelli Copilot
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Demo workflow using predefined analytical logic over synthetic data. No live AI
              provider is connected. Arithmetic is computed deterministically.
            </p>
          </SheetHeader>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
          >
            <Input
              aria-label="Question for the copilot"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask a question…"
            />
            <Button type="submit">Ask</Button>
          </form>
          {history.length === 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="eyebrow">Suggested</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="block w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-4">
            {history.map(({ q: question, a }, i) => (
              <div key={i} className="rounded-md border">
                <div className="border-b bg-muted/50 px-3 py-2 text-sm font-medium">{question}</div>
                <div className="space-y-3 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="eyebrow">{a.intent}</span>
                    <EvidenceBadge state={a.state} />
                  </div>
                  <p className="text-xs text-muted-foreground">Scope: {a.scope}</p>
                  {a.metrics.length > 0 && (
                    <dl className="divide-y rounded-md border">
                      {a.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="flex justify-between gap-3 px-2.5 py-1.5 text-xs"
                        >
                          <dt className="text-muted-foreground">{m.label}</dt>
                          <dd className="num text-right font-medium">{m.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <ul className="list-disc space-y-1 pl-4">
                    {a.summary.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  {a.missing.length > 0 && (
                    <div className="rounded-md bg-warning/10 p-2 text-xs text-warning">
                      <b>Missing / assumptions:</b> {a.missing.join("; ")}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {a.links.map((l) => (
                      <Button
                        key={l.to}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setOpen(false);
                          navigate({ to: l.to });
                        }}
                      >
                        {l.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
