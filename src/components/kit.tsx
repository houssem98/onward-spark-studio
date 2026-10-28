import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  CircleHelp,
  CircleSlash,
  FlaskConical,
  Info,
  XCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EvidenceState } from "@/data/investigations";
import { StateBoundary, type DataState } from "@/components/states";

type Tone = "success" | "warning" | "critical" | "info" | "neutral";

const toneCls: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  critical: "bg-critical/10 text-critical border-critical/25",
  info: "bg-primary/10 text-primary border-primary/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

const TONE_MAP: Record<string, Tone> = {
  Healthy: "success",
  Certified: "success",
  Resolved: "success",
  Closed: "success",
  Done: "success",
  Approved: "success",
  Production: "success",
  Low: "neutral",
  Stable: "success",
  High_c: "success",
  Watch: "warning",
  Pending: "warning",
  "Pending Review": "warning",
  "Pending Approval": "warning",
  Assigned: "warning",
  "In Progress": "warning",
  Remediating: "warning",
  Medium: "warning",
  Triage: "warning",
  Investigation: "warning",
  Review: "warning",
  "Under assessment": "warning",
  "Moderate shift": "warning",
  Validation: "warning",
  Alert: "critical",
  Critical: "critical",
  High: "critical",
  Open: "critical",
  Revoked: "critical",
  Rejected: "critical",
  Escalated: "critical",
  "Significant shift": "critical",
  "Not certified": "neutral",
  New: "info",
  Draft: "neutral",
  Development: "neutral",
  UAT: "info",
};

const TONE_ICON: Record<Tone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
  info: Info,
  neutral: CircleDashed,
};

export function StatusBadge({
  value,
  tone,
  icon = true,
  className,
}: {
  value: string;
  tone?: Tone;
  icon?: boolean;
  className?: string;
}) {
  const t = tone ?? TONE_MAP[value] ?? "neutral";
  const Icon = TONE_ICON[t];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-caption font-medium leading-none",
        toneCls[t],
        className,
      )}
    >
      {icon && <Icon className="h-3 w-3" aria-hidden />}
      {value}
    </span>
  );
}

// Every state in this demo comes from the sample data; no verification policy exists yet.
const SAMPLE = " In this demo the state is set in the sample data; no automated check has run.";

const EV: Record<
  EvidenceState,
  { tone: Tone; icon: typeof CheckCircle2; label: string; desc: string }
> = {
  VERIFIED: {
    tone: "success",
    icon: CheckCircle2,
    label: "Verified",
    desc: "Means: source, period, units and calculation checked and reconciled." + SAMPLE,
  },
  PARTIALLY_VERIFIED: {
    tone: "warning",
    icon: CircleDashed,
    label: "Partially verified",
    desc: "Means: some checks pass while limitations or data issues remain." + SAMPLE,
  },
  UNVERIFIED: {
    tone: "neutral",
    icon: CircleHelp,
    label: "Unverified",
    desc: "Means: not yet supported by validated evidence." + SAMPLE,
  },
  CONFLICTING_EVIDENCE: {
    tone: "critical",
    icon: AlertTriangle,
    label: "Conflicting evidence",
    desc: "Means: sources disagree and need review." + SAMPLE,
  },
  NOT_AVAILABLE: {
    tone: "neutral",
    icon: CircleSlash,
    label: "Not available",
    desc: "Means: the required evidence is not accessible here." + SAMPLE,
  },
};

export function EvidenceBadge({
  state,
  dataState,
  stateNote,
}: {
  state: EvidenceState;
  dataState?: DataState;
  stateNote?: string;
}) {
  const e = EV[state];
  const Icon = e.icon;
  return (
    <StateBoundary state={dataState} label="evidence state" note={stateNote} inline>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex cursor-help items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-caption font-semibold uppercase leading-none tracking-wide",
              toneCls[e.tone],
            )}
          >
            <Icon className="h-3 w-3" aria-hidden />
            {e.label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{e.desc}</TooltipContent>
      </Tooltip>
    </StateBoundary>
  );
}

export function SyntheticTag({ label = "Synthetic demo data" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-dashed border-cyan/60 bg-cyan/5 px-1.5 py-0.5 text-micro font-medium uppercase tracking-wider text-muted-foreground">
      <FlaskConical className="h-3 w-3 text-cyan" aria-hidden />
      {label}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
  tag = true,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  crumbs?: { label: string; to?: string }[];
  tag?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      <div className="min-w-0">
        {crumbs && (
          <nav
            aria-label="Breadcrumb"
            className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground"
          >
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {c.to ? (
                  <Link to={c.to} className="hover:text-foreground">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {tag && <SyntheticTag />}
        </div>
        {description && (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClass,
}: {
  title?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-md border bg-card", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b px-4 py-2.5">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("p-4", bodyClass)}>{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  sub,
  delta,
  deltaGood,
  definition,
  period = "FY2025",
  status,
  state,
  stateNote,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaGood?: boolean;
  definition: string;
  period?: string;
  status?: ReactNode;
  state?: DataState;
  stateNote?: string;
}) {
  return (
    <div className="rounded-md border bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <Tooltip>
          <TooltipTrigger
            aria-label={`Definition of ${label}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <Info className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p className="font-medium">{label}</p>
            <p className="mt-0.5">{definition}</p>
            <p className="mt-1 opacity-70">Period: {period} · Synthetic</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <StateBoundary state={state} label={label} note={stateNote}>
        <div className="mt-1.5 num text-2xl font-semibold">{value}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {delta && (
            <span
              className={cn(
                "num font-medium",
                deltaGood === undefined ? "" : deltaGood ? "text-success" : "text-critical",
              )}
            >
              {delta}
            </span>
          )}
          {sub && <span>{sub}</span>}
          {status}
        </div>
      </StateBoundary>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-md border px-3 py-2 text-xs",
        tone === "warning" ? toneCls.warning : "border-primary/20 bg-primary/5 text-foreground",
      )}
    >
      {tone === "warning" ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : (
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      )}
      <div>{children}</div>
    </div>
  );
}

export const CHART = {
  c1: "var(--chart-1)",
  c2: "var(--chart-2)",
  c3: "var(--chart-3)",
  c4: "var(--chart-4)",
  c5: "var(--chart-5)",
  grid: "var(--border)",
  text: "var(--muted-foreground)",
  success: "var(--success)",
  warning: "var(--warning)",
  critical: "var(--critical)",
};

export const axisProps = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  axisLine: false,
  tickLine: false,
} as const;
export const tooltipStyle = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--card)",
  },
};
