import { useQueryClient } from "@tanstack/react-query";
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
import { answer, metricLabel, SUGGESTIONS, type CopilotAnswer } from "@/lib/copilot";
import { EvidenceBadge } from "@/components/kit";
import { copilotBus } from "@/lib/copilot-bus";
import { CommandPalette } from "@/components/CommandPalette";
import { crimeQuery, datasetsQuery, financeQuery, modelsQuery, repo } from "@/repo/queries";
import type { Repository } from "@/repo/types";

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Executive Overview", icon: LayoutDashboard }],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/performance", label: "Performance & Peers", icon: TrendingUp },
      { to: "/credit", label: "Credit Intelligence", icon: Landmark },
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

export function EnvironmentBanner({ environment }: { environment: Repository["environment"] }) {
  return (
    <div
      role="note"
      aria-label="Environment"
      className="flex items-center gap-2 border-b bg-warning/10 px-4 py-1 text-caption text-warning"
    >
      {environment === "demo" ? (
        <>
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
          <span>
            <b>Demo · synthetic data</b> — every figure belongs to the fictional Northstar Bank.
          </span>
        </>
      ) : (
        <b>Production</b>
      )}
    </div>
  );
}

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
    <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((g) => (
        <div key={g.label}>
          {!collapsed && (
            <p className="mb-1.5 px-3 text-micro font-semibold uppercase tracking-[0.12em] text-ink-muted">
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
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-ui font-medium transition-colors duration-150",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <n.icon className="h-[18px] w-[18px] shrink-0" />
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

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-16 items-center gap-3 px-5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Building2 className="h-[18px] w-[18px]" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
            BankIntelli
          </div>
          <div className="text-caption text-ink-muted">Banking intelligence · demo</div>
        </div>
      )}
    </div>
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

  const queryClient = useQueryClient();
  const ask = async (text: string) => {
    if (!text.trim()) return;
    setQ("");
    setOpen(true);
    // fetchQuery refetches what a write has made stale; ensureQueryData would not.
    const [finance, models, datasets, crime] = await Promise.all([
      queryClient.fetchQuery(financeQuery),
      queryClient.fetchQuery(modelsQuery),
      queryClient.fetchQuery(datasetsQuery),
      queryClient.fetchQuery(crimeQuery),
    ]);
    setHistory((h) => [{ q: text, a: answer(text, { finance, models, datasets, crime }) }, ...h]);
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
          "no-print sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out md:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <Brand collapsed={collapsed} />
        <NavList path={path} collapsed={collapsed} />
        <div className="border-t border-sidebar-border p-3">
          {!collapsed && (
            <p className="mb-2 rounded-lg bg-sidebar-accent/60 px-3 py-2 text-caption leading-snug text-ink-muted">
              Proof of concept. All data is synthetic and belongs to the fictional Northstar Bank.
            </p>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-sidebar-accent"
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
          <EnvironmentBanner environment={repo.environment} />
          <header className="no-print flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur md:px-6">
            <button
              className="rounded-md p-2 hover:bg-muted md:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <form
              className="relative min-w-0 max-w-xl flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                ask(q);
              }}
            >
              <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ask BankIntelli about performance, risk, data or models…"
                className="h-10 rounded-lg border-transparent bg-muted pl-9 text-sm focus-visible:bg-card"
                aria-label="Ask BankIntelli"
              />
            </form>
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="hidden text-muted-foreground lg:inline">
                Northstar Bank (fictional) · FY2025
              </span>
              <button
                className="flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-muted-foreground hover:bg-muted"
                aria-label="Search (Ctrl+K)"
                onClick={() => setPalette(true)}
              >
                <Search className="h-4 w-4" />
                <kbd className="hidden font-mono text-micro sm:inline">Ctrl K</kbd>
              </button>
              <button
                className="relative rounded-lg p-2 hover:bg-muted"
                aria-label={`${openCount} critical notifications`}
                onClick={() => navigate({ to: "/audit" })}
              >
                <Bell className="h-[18px] w-[18px]" />
                {openCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-critical px-1 text-micro font-semibold text-primary-foreground">
                    {openCount}
                  </span>
                )}
              </button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-lg"
                aria-label="Copilot"
                onClick={() => setOpen(true)}
              >
                <Bot className="h-4 w-4 text-primary" />{" "}
                <span className="hidden sm:inline">Copilot</span>
              </Button>
              <div className="hidden items-center gap-2.5 border-l pl-3 lg:flex">
                <div
                  aria-hidden
                  className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                >
                  {user.name
                    .split(" ")
                    .map((x) => x[0])
                    .join("")}
                </div>
                <div className="leading-tight">
                  <div className="text-ui font-medium">{user.name}</div>
                  <div className="text-muted-foreground">{user.role}</div>
                </div>
              </div>
            </div>
          </header>
        </div>
        <main
          key={path}
          id="main"
          tabIndex={-1}
          className="page-enter mx-auto w-full min-w-0 max-w-[1520px] flex-1 p-4 outline-none md:p-7"
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
          className="flex w-[270px] flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Brand collapsed={false} />
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
              Demo: predefined answers over synthetic data; no AI provider is connected. Some
              figures are computed from the demo data, other answer text is fixed.
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
                          key={metricLabel(m)}
                          className="flex justify-between gap-3 px-2.5 py-1.5 text-xs"
                        >
                          <dt className="text-muted-foreground">{metricLabel(m)}</dt>
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
