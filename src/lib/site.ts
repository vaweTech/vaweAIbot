import type { Metadata } from "next";

/** Public identity of the site, used for metadata, sitemap, social cards and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ai.skillwins.in").replace(/\/+$/, "");

export const SITE_NAME = "VAWE AI";

/** The company behind the product. */
export const ORGANIZATION_NAME = "VAWE";
export const ORGANIZATION_FULL_NAME = "VAWE – Value Added Work in Empowerment";

export const SITE_TITLE = "VAWE AI – Free AI Mock Interview & Group Discussion Practice";

export const SITE_DESCRIPTION =
  "Practise job interviews and group discussions with an AI interviewer that listens to your spoken answers and scores them instantly — technical and HR questions, grammar, fluency and confidence feedback, with a downloadable report.";

export const SITE_KEYWORDS = [
  "AI mock interview",
  "AI interview practice",
  "mock interview online",
  "interview preparation",
  "HR interview questions",
  "technical interview practice",
  "group discussion practice",
  "GD practice online",
  "spoken English practice",
  "communication skills test",
  "campus placement preparation",
  "fresher interview preparation",
  "AI interview feedback",
  "VAWE AI",
  "VAWE",
];

export const SITE_LOCALE = "en_IN";

/**
 * Metadata for one public page. Next.js replaces (not merges) nested objects like
 * `openGraph`, so every page needs the full set.
 */
export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
}: {
  title?: string;
  description?: string;
  path: string;
}): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_TITLE;
  const image = { url: "/opengraph-image", width: 1200, height: 630, alt: fullTitle };
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      locale: SITE_LOCALE,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image.url] },
  };
}

/** For signed-in, admin and per-session pages that should never appear in search results. */
export const PRIVATE_PAGE_METADATA: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export const FAQS: { question: string; answer: string }[] = [
  {
    question: "How does the AI mock interview work?",
    answer:
      "The AI interviewer reads each question aloud. You answer by speaking, your voice is converted to text, and the answer is graded on the key points covered, accuracy, grammar, fluency and confidence. You get a full report at the end.",
  },
  {
    question: "Is VAWE AI free to use?",
    answer:
      "Yes. You can take published interview tests, quick practice rounds and AI group discussions in your browser without installing anything.",
  },
  {
    question: "Which interview questions can I practise?",
    answer:
      "Technical, HR and behavioural questions set by trainers. HR answers are judged on relevance, real examples (the STAR method) and attitude, not on technical terms.",
  },
  {
    question: "What do I need to take an interview?",
    answer:
      "A laptop or phone with a microphone and the Chrome or Edge browser. A webcam is optional and is used only to remind you to stay in frame and look at the screen.",
  },
  {
    question: "Can I download my interview result?",
    answer:
      "Yes. When the interview ends you can download a PDF report with your scores, answer-by-answer feedback, grammar corrections and points to improve.",
  },
  {
    question: "How does the AI group discussion work?",
    answer:
      "You join a group discussion with four AI participants on a topic, speak your points on your turn, and get scored on relevance, clarity, balance of arguments and leadership.",
  },
];
