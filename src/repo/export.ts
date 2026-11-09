import { toast } from "sonner";

import { downloadFile } from "@/lib/calc";

import { repo } from "./queries";

/** An export's toast and audit detail, which call records synthetic only where they are. */
export const exportedRecords = (n: number, environment: string) =>
  `Exported ${n} ${environment === "demo" ? "synthetic " : ""}records`;

/** Downloads a file only when the server allows the export; the server records every attempt. */
export async function exportFile(name: string, content: string, type?: string, done?: string) {
  if (!(await repo.audit.export(name, done ?? name))) {
    toast.error("Your role may not export. The attempt was recorded.");
    return;
  }
  downloadFile(name, content, type);
  if (done) toast.success(done);
}
