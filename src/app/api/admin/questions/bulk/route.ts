import { assertAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/apiResponse";
import { createQuestion } from "@/lib/questionBank";
import type { BulkImportRow, QuestionDraft } from "@/types/questionBank";

const MAX_ROWS = 200;

export async function POST(request: Request) {
  try {
    assertAdmin(request);
    const body = (await request.json()) as {
      drafts: QuestionDraft[];
      allowDuplicate?: boolean;
    };

    const drafts = body?.drafts;
    if (!Array.isArray(drafts) || drafts.length === 0) {
      return Response.json({ error: "No questions to import" }, { status: 400 });
    }
    if (drafts.length > MAX_ROWS) {
      return Response.json(
        { error: `Import at most ${MAX_ROWS} questions per batch` },
        { status: 400 }
      );
    }

    const rows: BulkImportRow[] = [];

    // Sequential so one bad row cannot abort the rest, and to stay polite to
    // the embedding API's rate limits.
    for (let index = 0; index < drafts.length; index++) {
      const draft = drafts[index];
      const label = draft?.question?.slice(0, 80) ?? `Row ${index + 1}`;
      try {
        const { id, duplicates } = await createQuestion(draft, {
          allowDuplicate: body.allowDuplicate,
        });
        if (!id) {
          rows.push({
            index,
            question: label,
            ok: false,
            error: `Looks like a duplicate of "${duplicates[0]?.question.slice(0, 60)}"`,
            duplicateOf: duplicates[0]?.id,
          });
          continue;
        }
        rows.push({ index, question: label, ok: true, id });
      } catch (error) {
        rows.push({
          index,
          question: label,
          ok: false,
          error: error instanceof Error ? error.message : "Failed to save",
        });
      }
    }

    return Response.json({
      imported: rows.filter((r) => r.ok).length,
      failed: rows.filter((r) => !r.ok).length,
      rows,
    });
  } catch (error) {
    return jsonError(error);
  }
}
