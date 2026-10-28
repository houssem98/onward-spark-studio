import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadFile, toCSV } from "@/lib/calc";
import { toast } from "sonner";
import { StateBoundary, type DataState } from "@/components/states";

export interface Column<T> {
  key: string;
  header: string;
  cell?: (row: T) => ReactNode;
  value?: (row: T) => string | number;
  align?: "left" | "right";
  className?: string;
}

export function DataTable<T extends object>({
  rows,
  columns,
  searchPlaceholder = "Search…",
  pageSize = 10,
  onRowClick,
  exportName,
  toolbar,
  rowKey,
  selectedKey,
  state,
  stateNote,
}: {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  exportName?: string;
  toolbar?: ReactNode;
  rowKey: (row: T) => string;
  selectedKey?: string | undefined;
  state?: DataState;
  stateNote?: string;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const val = (r: T, c: Column<T>) =>
    c.value ? c.value(r) : ((r as Record<string, unknown>)[c.key] as string | number);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let out = qq
      ? rows.filter((r) =>
          columns.some((c) =>
            String(val(r, c) ?? "")
              .toLowerCase()
              .includes(qq),
          ),
        )
      : rows;
    if (sort) {
      const c = columns.find((x) => x.key === sort.key)!;
      out = [...out].sort((a, b) => {
        const va = val(a, c),
          vb = val(b, c);
        return (
          (typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb))) * sort.dir
        );
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, sort, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const p = Math.min(page, pages - 1);
  const visible = filtered.slice(p * pageSize, p * pageSize + pageSize);

  const exportCsv = () => {
    const data = filtered.map((r) => Object.fromEntries(columns.map((c) => [c.header, val(r, c)])));
    downloadFile(`${exportName}.csv`, toCSV(data));
    toast.success(`Exported ${data.length} synthetic records`);
  };

  return (
    <div className="rounded-md border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-2.5">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="h-8 pl-7 text-sm"
            aria-label="Search table"
          />
        </div>
        {toolbar}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="num">{filtered.length} rows</span>
          {exportName && (
            <Button variant="outline" size="sm" className="h-8" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          )}
        </div>
      </div>
      <StateBoundary state={state} label="records" note={stateNote}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((c) => {
                  const active = sort?.key === c.key;
                  return (
                    <th
                      key={c.key}
                      className={cn(
                        "whitespace-nowrap px-3 py-2 text-left text-caption font-semibold uppercase tracking-wider text-muted-foreground",
                        c.align === "right" && "text-right",
                      )}
                    >
                      <button
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-foreground",
                          c.align === "right" && "flex-row-reverse",
                        )}
                        onClick={() =>
                          setSort(
                            active
                              ? sort!.dir === 1
                                ? { key: c.key, dir: -1 }
                                : null
                              : { key: c.key, dir: 1 },
                          )
                        }
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === 1 ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No records match the current filters.
                  </td>
                </tr>
              )}
              {visible.map((r) => {
                const k = rowKey(r);
                return (
                  <tr
                    key={k}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick(r);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "border-b last:border-0",
                      onRowClick && "cursor-pointer hover:bg-accent/50",
                      selectedKey === k && "bg-accent",
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-3 py-2 align-middle",
                          c.align === "right" && "num text-right",
                          c.className,
                        )}
                      >
                        {c.cell ? c.cell(r) : String(val(r, c) ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </StateBoundary>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t p-2 text-xs">
          <span className="text-muted-foreground">
            Page {p + 1} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={p === 0}
            onClick={() => setPage(p - 1)}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={p >= pages - 1}
            onClick={() => setPage(p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground"
      >
        <option value="All">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
