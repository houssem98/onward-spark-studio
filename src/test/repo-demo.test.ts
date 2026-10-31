import { describe, expect, it } from "vitest";

import { demoRepo } from "@/repo/demo";

describe("demo repository", () => {
  it("reads every domain", async () => {
    const [finance, credit, crime, datasets, models, investigations, audit] = await Promise.all([
      demoRepo.finance.read(),
      demoRepo.credit.read(),
      demoRepo.crime.read(),
      demoRepo.datasets.read(),
      demoRepo.models.read(),
      demoRepo.investigations.read(),
      demoRepo.audit.read(),
    ]);
    const counts = {
      departments: finance.departments.length,
      bridges: finance.bridges.length,
      slices: credit.slices.length,
      alerts: crime.alerts.length,
      datasets: datasets.datasets.length,
      models: models.models.length,
      investigations: investigations.investigations.length,
      audit: audit.length,
    };
    expect(Object.entries(counts).filter(([, n]) => n === 0)).toEqual([]);
  });

  it("writes through: the next read shows the change and the audit trail records it", async () => {
    const alert = (await demoRepo.crime.read()).alerts[0]!;
    await demoRepo.crime.updateAlert(alert.id, { status: "Closed" });
    expect((await demoRepo.crime.read()).alerts.find((a) => a.id === alert.id)?.status).toBe(
      "Closed",
    );
    expect((await demoRepo.audit.read())[0]).toMatchObject({
      entity: alert.id,
      action: "Alert updated",
    });
  });
});
