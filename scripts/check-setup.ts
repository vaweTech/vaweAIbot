/**
 * Verifies that .env.local is wired correctly before you rely on it.
 *
 *   npm run check
 *
 * Reads credentials from the environment only — nothing is printed that could
 * leak a key. Makes one real embedding call so a bad or restricted API key is
 * caught here instead of halfway through a bulk import.
 */

import { cosineSimilarity, EMBEDDING_MODEL, embedTexts, isEmbeddingConfigured } from "@/lib/embeddings";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { countQuestionsByType } from "@/lib/questionBank";

const ok = (msg: string) => console.log(`  PASS  ${msg}`);
const bad = (msg: string) => console.log(`  FAIL  ${msg}`);
const skip = (msg: string) => console.log(`  SKIP  ${msg}`);

let failures = 0;

async function checkEmbeddings() {
  console.log("\nEmbeddings (semantic answer scoring)");

  if (!isEmbeddingConfigured()) {
    skip("GOOGLE_AI_API_KEY is not set — add it to .env.local");
    failures++;
    return;
  }

  // Two ways of saying the same thing, plus something unrelated. If the key and
  // model work, the paraphrase must score far higher than the unrelated text.
  const modelAnswer = "A closure is a function that remembers variables from the scope where it was created.";
  const paraphrase = "It is a function that still has access to its outer lexical scope after that scope returned.";
  const unrelated = "Cricket is the most widely followed sport in India.";

  try {
    const [a, b, c] = await embedTexts([modelAnswer, paraphrase, unrelated]);
    ok(`${EMBEDDING_MODEL} responded — ${a.length} dimensions per vector`);

    const similar = cosineSimilarity(a, b);
    const different = cosineSimilarity(a, c);
    console.log(`        paraphrase similarity  ${similar.toFixed(3)}`);
    console.log(`        unrelated similarity   ${different.toFixed(3)}`);

    if (similar > different + 0.15) {
      ok("Meaning-based matching works — paraphrase scores well above unrelated text");
    } else {
      bad("Similarity scores are too close together; scoring thresholds need review");
      failures++;
    }
  } catch (error) {
    bad(error instanceof Error ? error.message : String(error));
    failures++;
  }
}

async function checkFirestore() {
  console.log("\nFirestore (question storage)");

  if (!isFirebaseConfigured()) {
    skip("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local");
    failures++;
    return;
  }

  try {
    const counts = await countQuestionsByType();
    ok("Connected with the service account and read the questions collection");
    console.log(
      `        technical ${counts.technical}   hr ${counts.hr}   gd ${counts.gd}   approved ${counts.approved}`
    );
  } catch (error) {
    bad(error instanceof Error ? error.message : String(error));
    failures++;
  }
}

async function main() {
  console.log("Checking VAWE AI setup");
  await checkEmbeddings();
  await checkFirestore();

  console.log(
    failures === 0
      ? "\nEverything is ready. You can save questions and score answers.\n"
      : `\n${failures} item(s) still need attention.\n`
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
