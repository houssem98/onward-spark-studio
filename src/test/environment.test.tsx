import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EnvironmentBanner } from "@/components/AppShell";
import { demoRepo } from "@/repo/demo";
import { productionRepo } from "@/repo/production";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
// The records of a collection: an array, or a map whose every value is an array.
const records = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter(isRecord)
    : isRecord(v) && Object.values(v).every(Array.isArray)
      ? Object.values(v).flatMap(records)
      : [];

const domains = (repo: object) =>
  Object.entries(repo).filter(([, api]) => isRecord(api)) as [
    string,
    Record<string, (...args: never[]) => Promise<unknown>>,
  ][];

describe("environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("marks every record a demo read returns as synthetic", async () => {
    expect(demoRepo.environment).toBe("demo");
    const unmarked = new Set<string>();
    for (const [domain, api] of domains(demoRepo)) {
      const data = await api["read"]!();
      const fields = Array.isArray(data) ? { items: data } : (data as Record<string, unknown>);
      for (const [field, value] of Object.entries(fields))
        for (const r of records(value))
          if (r["synthetic"] !== true) unmarked.add(`${domain}.${field}`);
    }
    expect([...unmarked]).toEqual([]);
    const { bank, scorecard } = await demoRepo.finance.read();
    const { user } = await demoRepo.session.read();
    expect([bank, scorecard, user].map((r) => (r as { synthetic?: unknown }).synthetic)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it("has a production adapter that serves no data and accepts no write", async () => {
    expect(productionRepo.environment).toBe("production");
    const answered: string[] = [];
    for (const [domain, api] of domains(productionRepo))
      for (const [name, method] of Object.entries(api))
        await method().then(
          () => answered.push(`${domain}.${name}`),
          (e: Error) => /not configured/.test(e.message) || answered.push(`${domain}.${name}`),
        );
    expect(answered).toEqual([]);
  });

  it("serves the production adapter when VITE_DATA_SOURCE is production", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "production");
    expect((await import("@/repo/queries")).repo.environment).toBe("production");
    vi.unstubAllEnvs();
    vi.resetModules();
    expect((await import("@/repo/queries")).repo.environment).toBe("demo");
  });

  it("fails closed: only an unset, empty or demo source serves the demo adapter", async () => {
    const served: Record<string, string> = {};
    for (const v of [
      undefined,
      "",
      "demo",
      "production",
      "Production",
      "prod",
      "production ",
      "staging",
    ]) {
      vi.resetModules();
      vi.stubEnv("VITE_DATA_SOURCE", v);
      served[String(v)] = (await import("@/repo/queries")).repo.environment;
    }
    expect(served).toEqual({
      undefined: "demo",
      "": "demo",
      demo: "demo",
      production: "production",
      Production: "production",
      prod: "production",
      "production ": "production",
      staging: "production",
    });
  });

  it("labels the banner from the environment", () => {
    const { unmount } = render(<EnvironmentBanner environment="demo" />);
    expect(screen.getByRole("note", { name: "Environment" })).toHaveTextContent(
      "Demo · synthetic data",
    );
    unmount();
    render(<EnvironmentBanner environment="production" />);
    expect(screen.getByRole("note", { name: "Environment" })).not.toHaveTextContent(/synthetic/i);
  });
});
