import { createContext, useContext, useState, type ReactNode } from "react";
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
import { AnimatedNumber } from "@/components/motion";
import { UNAVAILABLE } from "@/lib/calc";
import { DEFINITIONS, type Definition, type DefinitionId } from "@/lib/definitions";
import { repo } from "@/repo/queries";
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
  const [open, setOpen] = useState(false);
  return (
    <StateBoundary state={dataState} label="evidence state" note={stateNote} inline>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          {/* Focusable so keyboard users get the caveat; a tap toggles it, since tooltips ignore touch. */}
          <span
            tabIndex={0}
            onPointerDown={(ev) => ev.preventDefault()}
            onClick={(ev) => {
              ev.preventDefault();
              setOpen((o) => !o);
            }}
            className={cn(
              "inline-flex cursor-help items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-caption font-medium leading-none",
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
    <span className="inline-flex items-center gap-1 rounded-sm border border-dashed border-cyan/60 bg-cyan/5 px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
      <FlaskConical className="h-3 w-3 text-cyan" aria-hidden />
      {label}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
  crumbs,
  tag = true,
}: {
  title: string;
  description?: string;
  /** Context line beside the synthetic tag, above the title. */
  meta?: string;
  actions?: ReactNode;
  crumbs?: { label: string; to?: string }[];
  tag?: boolean;
}) {
  return (
    <header data-page-header className="flex flex-wrap items-end justify-between gap-4">
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
        {(tag || meta) && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {tag && <SyntheticTag />}
            {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
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
    <section className={cn("min-w-0 card-surface", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("p-5", bodyClass)}>{children}</div>
    </section>
  );
}

const InBand = createContext(false);

/** One panel of figures with hairline dividers; KPIs inside it drop their own card. */
export function KpiBand({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section data-kpi-band aria-label={label} className="overflow-hidden rounded-lg border bg-card">
      <div className={cn("-mb-px -mr-px grid [&>*]:border-b [&>*]:border-r", className)}>
        <InBand.Provider value>{children}</InBand.Provider>
      </div>
    </section>
  );
}

/**
 * A formatted figure as prefix, number and suffix, so a change can tween in the figure's own
 * format; the target itself is always the exact text given. Text that is not one figure stays put.
 */
function Figure({ text }: { text: string }) {
  // The sign may stand before the prefix ("−$12M") or after it ("$-12M").
  const m = /^([−-]?)(\D*?)([−-]?)(\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(text);
  if (!m) return <>{text}</>;
  const [, lead, pre, inner, digits, post] = m as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const minus = lead || inner;
  const decimals = digits.split(".")[1]?.length ?? 0;
  const n = (minus ? -1 : 1) * parseFloat(digits.replace(/,/g, ""));
  const format = (x: number) => {
    if (x === n) return text;
    const abs = Math.abs(x).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: digits.includes(","),
    });
    const sign = x < 0 && /[1-9]/.test(abs) ? minus || "−" : "";
    return inner ? `${pre}${sign}${abs}${post}` : `${sign}${pre}${abs}${post}`;
  };
  return <AnimatedNumber value={n} format={format} />;
}

export function Kpi({
  def,
  value,
  sub,
  delta,
  versus,
  deltaGood,
  status,
  state,
  stateNote,
  size = "md",
  basis = false,
  className,
}: {
  def: DefinitionId;
  value: string;
  sub?: string;
  status?: ReactNode;
  state?: DataState;
  stateNote?: string;
  size?: "md" | "lg";
  /** States unit, period and source in the tile, not only in the tooltip. */
  basis?: boolean;
  className?: string | undefined;
} &
  // A change always says what it compares to, such as "vs FY2024".
  (
    | { delta: string; versus: string; deltaGood?: boolean }
    | { delta?: undefined; versus?: undefined; deltaGood?: undefined }
  )) {
  const flat = useContext(InBand);
  const d: Definition = DEFINITIONS[def];
  const caption = sub ?? d.sub;
  const tone =
    delta === undefined || deltaGood === undefined || delta.startsWith(UNAVAILABLE)
      ? undefined
      : deltaGood;
  // The arrow states direction; colour alone states good or bad (a cost rise is ▲ in red).
  const sign = delta === undefined ? 0 : Math.sign(parseFloat(delta.replace("−", "-")));
  return (
    <div
      className={cn(
        // In a band each tile is a subgrid, so labels, figures and captions share rows.
        flat ? "row-span-4 grid grid-cols-1 grid-rows-subgrid bg-card" : "card-surface card-lift",
        size === "lg" ? "p-5" : "p-4",
        className,
      )}
      data-definition={def}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow">{d.label}</span>
        <Tooltip>
          <TooltipTrigger
            aria-label={`Definition of ${d.label}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <Info className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p className="font-medium">{d.label}</p>
            <p className="mt-0.5">{d.definition}</p>
            <p className="mt-0.5">Formula: {d.formula}</p>
            <p className="mt-1 opacity-70">
              {d.unit} · Period: {d.period} · Source: {d.source}
              {repo.environment === "demo" ? " · Synthetic" : ""}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <StateBoundary state={state} label={d.label} note={stateNote}>
        <div
          data-kpi-value
          className={cn(
            "mt-2 num shrink-0 font-semibold tracking-tight",
            size === "lg" ? "text-3xl" : "text-2xl",
          )}
        >
          <Figure text={value} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {delta && (
            <span
              data-kpi-delta
              data-versus={versus}
              className={cn(
                "num inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 font-medium",
                tone === undefined
                  ? "bg-muted"
                  : tone
                    ? "bg-success/10 text-success"
                    : "bg-critical/10 text-critical",
              )}
            >
              {tone === undefined || !sign ? "" : sign > 0 ? "▲ " : "▼ "}
              {delta} {versus}
            </span>
          )}
          {caption && <span>{caption}</span>}
          {status}
        </div>
      </StateBoundary>
      {basis && (
        <p className="mt-2 text-caption text-muted-foreground">
          {d.unit} · {d.period} · {d.source}
        </p>
      )}
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

// The type scale in px, for chart text sized by props; a test keeps it equal to the CSS tokens.
export const TYPE = { micro: 10, caption: 11, xs: 12, ui: 13 } as const;

export const axisProps = {
  tick: { fontSize: TYPE.caption, fill: "var(--muted-foreground)" },
  axisLine: false,
  tickLine: false,
} as const;
export const tooltipStyle = {
  contentStyle: {
    fontSize: TYPE.xs,
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--card)",
  },
};
