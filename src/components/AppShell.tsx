import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Activity, Bell, Bot, BrainCircuit, Building2, ChevronsLeft, ChevronsRight, Database, FileSearch, Landmark, LayoutDashboard, Menu, Search, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/app-store";
import { answer, SUGGESTIONS, type CopilotAnswer } from "@/lib/copilot";
import { EvidenceBadge } from "@/components/kit";
import { copilotBus } from "@/lib/copilot-bus";

const NAV_GROUPS = [
  { label: "Overview", items: [{ to: "/", label: "Executive Overview", icon: LayoutDashboard }] },
  {
    label: "Intelligence",
    items: [
      { to: "/performance", label: "Performance & Peers", icon: TrendingUp },
      { to: "/credit", label: "Credit Intelligence", icon: Landmark },
      { to: "/crime", label: "Fraud, AML & Fin. Crime", icon: ShieldAlert },
    ],
  },
  {
    label: "Governance",
    items: [
      { to: "/data", label: "Data Governance", icon: Database },
      { to: "/models", label: "AI & Model Governance", icon: BrainCircuit },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/investigations", label: "Investigations & Reports", icon: FileSearch },
      { to: "/audit", label: "Audit Trail", icon: Activity },
    ],
  },
] as const;

function SideNav({ collapsed, path, onNavigate }: { collapsed: boolean; path: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Primary">
      {NAV_GROUPS.map((g) => (
        <div key={g.label}>
          {!collapsed && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{g.label}</p>}
          <div className="space-y-0.5">
            {g.items.map((n) => {
              const active = n.to === "/" ? path === "/" : path.startsWith(n.to) || (n.to === "/investigations" && path.startsWith("/reports"));
              return (
                <Link key={n.to} to={n.to} title={n.label} onClick={onNavigate} aria-current={active ? "page" : undefined}
                  className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150", active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "justify-center px-0")}>
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
          <div className="text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">BankIntelli</div>
          <div className="text-[11px] text-ink-muted">Banking Intelligence Platform</div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const user = useStore((s) => s.user);
  const openCount = useStore((s) => s.issues.filter((i) => i.severity === "Critical" && i.status !== "Resolved").length + s.driftAlerts.filter((a) => a.status === "Open").length);
  const [open, setOpen] = useState(false);
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
      <aside className={cn("no-print sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out md:flex", collapsed ? "w-[76px]" : "w-[256px]")}>
        <Brand collapsed={collapsed} />
        <SideNav collapsed={collapsed} path={path} />
        <div className="border-t border-sidebar-border p-3">
          {!collapsed && <p className="mb-2 rounded-lg bg-sidebar-accent/60 px-3 py-2 text-[11px] leading-snug text-ink-muted">Proof of concept. All data is synthetic and belongs to the fictional Northstar Bank.</p>}
          <button onClick={() => setCollapsed(!collapsed)} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-sidebar-accent" aria-label="Toggle sidebar">
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
          </button>
        </div>
      </aside>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-[270px] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader>
          <div className="flex h-full flex-col"><Brand collapsed={false} /><SideNav collapsed={false} path={path} onNavigate={() => setMobileNav(false)} /></div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur md:px-6">
          <button className="rounded-md p-2 hover:bg-muted md:hidden" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu className="h-5 w-5" /></button>
          <form className="relative w-full max-w-xl" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or ask BankIntelli about performance, risk, data…" className="h-10 rounded-lg border-transparent bg-muted pl-9 pr-14 text-sm focus-visible:bg-card" aria-label="Ask BankIntelli" />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">⌘K</kbd>
          </form>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <select className="hidden h-9 rounded-lg border bg-card px-2.5 lg:block" aria-label="Organization" defaultValue="ns"><option value="ns">Northstar Bank (fictional)</option></select>
            <select className="hidden h-9 rounded-lg border bg-card px-2.5 lg:block" aria-label="Reporting period" defaultValue="FY2025"><option>FY2025</option></select>
            <button className="relative rounded-lg p-2 hover:bg-muted" aria-label={`${openCount} critical notifications`} onClick={() => navigate({ to: "/audit" })}>
              <Bell className="h-[18px] w-[18px]" />
              {openCount > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-critical px-1 text-[10px] font-semibold text-primary-foreground">{openCount}</span>}
            </button>
            <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={() => setOpen(true)}><Bot className="h-4 w-4 text-primary" /> <span className="hidden sm:inline">Copilot</span></Button>
            <div className="hidden items-center gap-2.5 border-l pl-3 lg:flex">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{user.name.split(" ").map((x) => x[0]).join("")}</div>
              <div className="leading-tight"><div className="text-[13px] font-medium">{user.name}</div><div className="text-muted-foreground">{user.role}</div></div>
            </div>
          </div>
        </header>
        <main key={path} className="page-enter mx-auto w-full max-w-[1520px] flex-1 p-4 md:p-7">{children}</main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> BankIntelli Copilot</SheetTitle>
            <p className="text-xs text-muted-foreground">Demo workflow using predefined analytical logic over synthetic data. No live AI provider is connected. Arithmetic is computed deterministically.</p>
          </SheetHeader>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question…" />
            <Button type="submit">Ask</Button>
          </form>
          {history.length === 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="eyebrow">Suggested</p>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="block w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent">{s}</button>
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
                        <div key={m.label} className="flex justify-between gap-3 px-2.5 py-1.5 text-xs"><dt className="text-muted-foreground">{m.label}</dt><dd className="num text-right font-medium">{m.value}</dd></div>
                      ))}
                    </dl>
                  )}
                  <ul className="list-disc space-y-1 pl-4">{a.summary.map((s) => <li key={s}>{s}</li>)}</ul>
                  {a.missing.length > 0 && <div className="rounded-md bg-warning/10 p-2 text-xs text-warning"><b>Missing / assumptions:</b> {a.missing.join("; ")}</div>}
                  <div className="flex flex-wrap gap-2">
                    {a.links.map((l) => <Button key={l.to} size="sm" variant="outline" onClick={() => { setOpen(false); navigate({ to: l.to }); }}>{l.label}</Button>)}
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
