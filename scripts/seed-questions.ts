/**
 * Loads seed/questions.json into Firestore, generating embeddings for each one.
 *
 *   npm run seed                 # skips anything that looks like a duplicate
 *   npm run seed -- --force      # saves even if a near-identical question exists
 *
 * Calls the repository directly rather than the HTTP API, so the dev server does
 * not need to be running and no admin code is required. Safe to re-run: existing
 * questions are reported as duplicates and skipped.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { isEmbeddingConfigured } from "@/lib/embeddings";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { toQuestionDraft } from "@/lib/questionImport";
import { createQuestion } from "@/lib/questionBank";
import { validateQuestionDraft } from "@/types/questionBank";

const SEED_FILE = path.join(process.cwd(), "seed", "questions.json");

async function main() {
  if (!isFirebaseConfigured() || !isEmbeddingConfigured()) {
    console.error(
      "Setup is incomplete. Run `npm run check` first — Firestore credentials and GOOGLE_AI_API_KEY are both required."
    );
    process.exitCode = 1;
    return;
  }

  const force = process.argv.includes("--force");
  const raw = JSON.parse(await readFile(SEED_FILE, "utf8")) as Record<string, unknown>[];
  const drafts = raw.map(toQuestionDraft);

  console.log(`Seeding ${drafts.length} questions from seed/questions.json\n`);

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, draft] of drafts.entries()) {
    const label = `${index + 1}/${drafts.length} [${draft.type}] ${draft.question.slice(0, 58)}`;

    const problems = validateQuestionDraft(draft);
    if (problems.length > 0) {
      console.log(`  INVALID  ${label}\n           ${problems.join("; ")}`);
      failed++;
      continue;
    }

    try {
      const { id, duplicates } = await createQuestion(draft, { allowDuplicate: force });
      if (!id) {
        const match = duplicates[0];
        console.log(
          `  EXISTS   ${label}\n           matches "${match?.question.slice(0, 50)}" at ${match?.similarity.toFixed(3)}`
        );
        skipped++;
        continue;
      }
      console.log(`  SAVED    ${label}`);
      saved++;
    } catch (error) {
      console.log(
        `  ERROR    ${label}\n           ${error instanceof Error ? error.message : String(error)}`
      );
      failed++;
    }
  }

  console.log(`\nSaved ${saved}, skipped ${skipped} as duplicates, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

void main();
