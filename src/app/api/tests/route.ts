import { jsonError } from "@/lib/apiResponse";
import { listTests } from "@/lib/testBank";

/** Published tests a student can take. */
export async function GET() {
  try {
    return Response.json({ tests: await listTests({ status: "published" }) });
  } catch (error) {
    return jsonError(error);
  }
}
