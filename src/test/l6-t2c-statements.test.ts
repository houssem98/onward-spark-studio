import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { pdfItems } from "@/lib/tn-connector.server";
import { parseIndicators } from "@/lib/tn-filings";

// Every listed bank's latest statement, recorded on 2026-11-11 from tunis-stockexchange.com. The
// figures are the period-end column as each PDF prints it, scaled to dinars by the unit the
// statement states: in its table's header, or, for BNA and UIB, only in its notes.
const K = 1000;
const EXPECTED: Record<string, [number, number, number, number]> = {
  amen: [512_448 * K, 7_545_244 * K, 9_312_610 * K, 1_581_578 * K],
  atb: [283_611 * K, 4_997_117 * K, 6_759_408 * K, 581_456 * K],
  attijari: [551_742 * K, 6_569_262 * K, 12_378_716 * K, 920_091 * K],
  bh: [510_686 * K, 10_297_379 * K, 10_457_118 * K, 1_363_757 * K],
  biat: [1_236_054_972.0, 13_324_356_427.0, 23_517_607_180.0, 2_123_642_172.5],
  bna: [858_465 * K, 15_597_545 * K, 15_819_124 * K, 2_301_477 * K],
  bte: [62_724 * K, 1_214_879 * K, 1_393_017 * K, 29_585 * K],
  stb: [507_688_319, 8_625_301_372, 13_209_132_800, 1_308_632_489],
  ubci: [289_107 * K, 3_864_067 * K, 4_300_542 * K, 563_278 * K],
  uib: [419_246 * K, 6_517_326 * K, 7_048_237 * K, 1_044_041 * K],
  wifack: [91_743 * K, 1_568_036 * K, 1_596_799 * K, 170_666 * K],
};

const items = (bank: string) =>
  pdfItems(new Uint8Array(readFileSync(`src/test/recorded/tn/${bank}-q3-2026.pdf`)));

describe("every listed bank's statement, read by column position and its own unit (L6 T2c)", () => {
  it.each(Object.entries(EXPECTED))(
    "reads %s's period-end figures",
    async (bank, [nbi, loans, deposits, equity]) => {
      expect(parseIndicators(await items(bank))).toEqual({
        periodEnd: "2026-09-30",
        tnd: {
          net_banking_income: nbi,
          net_loans: loans,
          customer_deposits: deposits,
          bank_equity: equity,
        },
      });
    },
  );

  it("refuses a statement that names its unit neither in its table nor in its notes", async () => {
    const bare = (await items("uib")).filter((i) => !/MTND|millions? de dinars/i.test(i.s));
    expect(() => parseIndicators(bare)).toThrow(/names no unit/);
  });

  it("refuses a balance with no figure in the period-end column", async () => {
    const all = await items("bh");
    const equityRow = all.find((i) => /CAPITAUX PROPRES/.test(i.s))!.y;
    const bare = all.filter((i) => !(Math.abs(i.y - equityRow) < 2 && i.s === "1 363 757"));
    expect(() => parseIndicators(bare)).toThrow(/"Capitaux propres" row has no figure/);
  });
});
