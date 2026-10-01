export interface GrammarMistake {
  id: string;
  category: string;
  original: string;
  correction: string;
  explanation: string;
}

export interface GrammarResultRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  score: number;
  totalSentences: number;
  errors: number;
  correctSentences: number;
  mistakes: GrammarMistake[];
  categoryBreakdown: {
    tense: number;
    articles: number;
    prepositions: number;
    subjectVerb: number;
    sentenceStructure: number;
    wordChoice: number;
  };
}

export const grammarResults: GrammarResultRecord[] = [];

export function getGrammarResultById(id: string): GrammarResultRecord | undefined {
  return grammarResults.find((result) => result.id === id);
}

export function getGrammarResultsByStudentId(studentId: string): GrammarResultRecord[] {
  return grammarResults.filter((result) => result.studentId === studentId);
}
