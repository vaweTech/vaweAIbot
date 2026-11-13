import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** The logo as a data URL, for `next/og` images, which cannot load files from /public by path. */
export async function logoDataUrl(): Promise<string> {
  const file = await readFile(join(process.cwd(), "public", "vawe-logo.png"));
  return `data:image/png;base64,${file.toString("base64")}`;
}
