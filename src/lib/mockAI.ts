import { delay } from "@/lib/utils";
import { calculateInterviewScore, calculateGDOverall, calculateSpeakingOverall } from "@/lib/scoring";
import { analyzeLanguage } from "@/lib/languageCheck";
import type { GrammarError } from "@/types/interview";

const SAMPLE_TRANSCRIPTS = [
  "React is a JavaScript library used to build user interfaces. It uses components and helps developers create reusable UI elements. Basically, it makes building complex apps easier with the virtual DOM.",
  "I believe that artificial intelligence will change the type of jobs rather than completely eliminate employment. You know, new roles will emerge in AI development and data analysis.",
  "My career goals include becoming a full stack developer and contributing to meaningful products. Actually, I am focusing on improving my system design and communication skills.",
  "In Java, collections provide a framework for storing and manipulating groups of objects. Like ArrayList and HashMap are commonly used for dynamic data storage.",
  "Group discussions help us practice listening and presenting ideas clearly. Um, I try to support my points with examples and respond respectfully to others.",
];

const GRAMMAR_MISTAKES: GrammarError[] = [
  {
    id: "GE1",
    category: "Tense",
    original: "I am working here since two years.",
    correction: "I have been working here for two years.",
    explanation: "Use present perfect continuous for an activity that started in the past and is still continuing.",
  },
  {
    id: "GE2",
    category: "Articles",
    original: "I want to become software engineer.",
    correction: "I want to become a software engineer.",
    explanation: "Use the indefinite article 'a' before singular countable nouns when referring to a profession.",
  },
  {
    id: "GE3",
    category: "Prepositions",
    original: "I am interested on machine learning.",
    correction: "I am interested in machine learning.",
    explanation: "The adjective 'interested' is followed by the preposition 'in'.",
  },
  {
    id: "GE4",
    category: "Subject-Verb Agreement",
    original: "The team are working on the project.",
    correction: "The team is working on the project.",
    explanation: "In American English, collective nouns like 'team' usually take a singular verb.",
  },
  {
    id: "GE6",
    category: "Pronouns",
    original: "Me and him went to the meeting.",
    correction: "He and I went to the meeting.",
    explanation: "Use subject pronouns (I, he, she) when they are doing the action.",
  },
  {
    id: "GE7",
    category: "Pronouns",
    original: "This is between you and I.",
    correction: "This is between you and me.",
    explanation: "After a preposition, use object pronouns: me, him, her, us, them.",
  },
];

export type EvaluationStep = {
  label: string;
  done: boolean;
};

export async function simulateTranscript(seed?: number): Promise<string> {
  await delay(1200);
  const index = typeof seed === "number" ? seed % SAMPLE_TRANSCRIPTS.length : Math.floor(Math.random() * SAMPLE_TRANSCRIPTS.length);
  return SAMPLE_TRANSCRIPTS[index];
}

export async function simulateGrammarAnalysis(transcript?: string) {
  await delay(800);
  const language = transcript ? analyzeLanguage(transcript) : null;
  const mistakes = language?.mistakes.length
    ? language.mistakes
    : GRAMMAR_MISTAKES.slice(0, 3 + Math.floor(Math.random() * 3));
  const pronounErrors = mistakes.filter((m) => m.category === "Pronouns").length;
  return {
    score: language?.grammarScore ?? 68 + Math.floor(Math.random() * 18),
    pronounsScore: language?.pronounsScore ?? 70 + Math.floor(Math.random() * 20),
    totalSentences: language?.sentences ?? 12 + Math.floor(Math.random() * 10),
    errors: mistakes.length,
    pronounErrors,
    correctSentences: language
      ? Math.max(0, language.sentences - mistakes.length)
      : 10 + Math.floor(Math.random() * 8),
    mistakes,
    transcript: transcript || SAMPLE_TRANSCRIPTS[0],
  };
}

export async function simulateInterviewEvaluation(weights?: Parameters<typeof calculateInterviewScore>[1]) {
  await delay(1500);
  const scores = {
    technicalKnowledge: 75 + Math.floor(Math.random() * 20),
    relevance: 78 + Math.floor(Math.random() * 18),
    communication: 70 + Math.floor(Math.random() * 20),
    grammar: 65 + Math.floor(Math.random() * 20),
    fluency: 72 + Math.floor(Math.random() * 18),
    vocabulary: 74 + Math.floor(Math.random() * 18),
  };
  const overall = calculateInterviewScore(scores, weights);
  const grammar = await simulateGrammarAnalysis();

  return {
    scores: { ...scores, pronouns: grammar.pronounsScore, overall },
    strengths: [
      "Good technical fundamentals",
      "Relevant answers aligned with the question",
      "Clear vocabulary usage",
    ],
    improvementAreas: [
      "Grammar accuracy",
      "Answer organization",
      "Technical depth on advanced topics",
    ],
    aiSummary:
      "The candidate demonstrated solid technical understanding and answered with relevance. Communication was generally clear, though grammar and structure can be improved for more professional delivery.",
    topicCoverage: [
      { topic: "React", coverage: 85 },
      { topic: "JavaScript", coverage: 90 },
      { topic: "Node.js", coverage: 72 },
      { topic: "Database", coverage: 65 },
      { topic: "API", coverage: 40 },
    ],
    grammarAnalysis: grammar,
    speakingDuration: "1m 24s",
    wordCount: 58 + Math.floor(Math.random() * 40),
    fillerWords: 2 + Math.floor(Math.random() * 5),
  };
}

export async function simulateGDEvaluation() {
  await delay(1200);
  const scores = {
    communication: 75 + Math.floor(Math.random() * 18),
    grammar: 68 + Math.floor(Math.random() * 20),
    pronouns: 70 + Math.floor(Math.random() * 20),
    fluency: 72 + Math.floor(Math.random() * 18),
    relevance: 78 + Math.floor(Math.random() * 16),
    topicUnderstanding: 76 + Math.floor(Math.random() * 18),
    teamInteraction: 74 + Math.floor(Math.random() * 18),
  };
  return {
    scores: {
      ...scores,
      overall: calculateGDOverall({
        communication: scores.communication,
        grammar: Math.round((scores.grammar + scores.pronouns) / 2),
        fluency: scores.fluency,
        relevance: scores.relevance,
        topicUnderstanding: scores.topicUnderstanding,
        teamInteraction: scores.teamInteraction,
      }),
    },
    speakingTime: 180 + Math.floor(Math.random() * 120),
    turns: 6 + Math.floor(Math.random() * 10),
    relevantContributions: 5 + Math.floor(Math.random() * 6),
    interruptions: Math.floor(Math.random() * 3),
    fillerWords: 2 + Math.floor(Math.random() * 6),
    strengths: [
      "Relevant topic contributions",
      "Good listening and response",
      "Clear articulation of ideas",
    ],
    improvementAreas: [
      "Reduce filler words",
      "Improve sentence structure",
      "Avoid repeating similar arguments",
    ],
    keyContributions: [
      "Highlighted the shift from job elimination to job transformation",
      "Referenced skill development as a mitigation strategy",
      "Responded constructively to opposing views",
    ],
    aiSummary:
      "The student contributed several relevant points and responded appropriately to other participants. The student maintained topic relevance but could improve sentence structure and avoid repeating similar arguments.",
  };
}

export async function simulateGDSummary() {
  await delay(900);
  return {
    summary:
      "The discussion was balanced with multiple perspectives on technology and employment. Participants engaged respectfully and covered economic, educational, and ethical angles.",
    strengths: ["Topic relevance", "Collaborative tone", "Diverse viewpoints"],
    improvementAreas: ["Time management", "Deeper evidence", "Turn-taking fairness"],
  };
}

export async function simulateSpeakingEvaluation() {
  await delay(1400);
  const scores = {
    fluency: 72 + Math.floor(Math.random() * 20),
    grammar: 68 + Math.floor(Math.random() * 20),
    vocabulary: 74 + Math.floor(Math.random() * 18),
    communication: 76 + Math.floor(Math.random() * 16),
    topicRelevance: 80 + Math.floor(Math.random() * 15),
    sentenceStructure: 70 + Math.floor(Math.random() * 20),
  };
  return {
    scores: { ...scores, overall: calculateSpeakingOverall(scores) },
    speakingDuration: "2m 48s",
    wordCount: 180 + Math.floor(Math.random() * 80),
    fillerWords: 3 + Math.floor(Math.random() * 8),
    transcript: SAMPLE_TRANSCRIPTS[2],
    strengths: ["Topic relevance", "Adequate vocabulary", "Steady pace"],
    improvementAreas: ["Grammar consistency", "Reduce fillers", "Richer sentence variety"],
    aiSummary:
      "The speaker stayed on topic and communicated ideas clearly. Fluency was adequate, with room to improve grammar accuracy and reduce filler words for a more polished delivery.",
  };
}

export async function runEvaluationSteps(
  onStep: (steps: EvaluationStep[]) => void
): Promise<void> {
  const steps: EvaluationStep[] = [
    { label: "Transcript analyzed", done: false },
    { label: "Grammar checked", done: false },
    { label: "Pronouns checked", done: false },
    { label: "Relevance checked", done: false },
    { label: "Communication analyzed", done: false },
    { label: "Technical answer evaluated", done: false },
  ];
  onStep([...steps]);
  for (let i = 0; i < steps.length; i++) {
    await delay(500);
    steps[i] = { ...steps[i], done: true };
    onStep([...steps]);
  }
}
