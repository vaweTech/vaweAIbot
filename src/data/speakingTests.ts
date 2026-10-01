import type { Difficulty, SpeakingTest } from "@/types/speaking";

export interface SpeakingTopic {
  id: string;
  topic: string;
  category: string;
  difficulty: Difficulty;
  duration: number;
  prompts: string[];
}

export const speakingTests: SpeakingTest[] = [
  {
    "id": "SPK001",
    "topic": "Introduce yourself and your career goals",
    "category": "Personal",
    "duration": 3,
    "difficulty": "Beginner",
    "evaluationCriteria": [
      "Fluency",
      "Grammar",
      "Clarity",
      "Confidence"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 73,
    "status": "active",
    "createdAt": "2026-01-10T08:00:00Z"
  },
  {
    "id": "SPK002",
    "topic": "Describe your favorite project",
    "category": "Technical",
    "duration": 5,
    "difficulty": "Intermediate",
    "evaluationCriteria": [
      "Technical vocabulary",
      "Structure",
      "Fluency",
      "Grammar"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 76,
    "status": "active",
    "createdAt": "2026-01-12T09:00:00Z"
  },
  {
    "id": "SPK003",
    "topic": "Explain a technical concept to a beginner",
    "category": "Communication",
    "duration": 4,
    "difficulty": "Intermediate",
    "evaluationCriteria": [
      "Clarity",
      "Vocabulary",
      "Grammar",
      "Topic relevance"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 70,
    "status": "active",
    "createdAt": "2026-01-15T10:00:00Z"
  },
  {
    "id": "SPK004",
    "topic": "Discuss the importance of teamwork",
    "category": "Soft Skills",
    "duration": 3,
    "difficulty": "Beginner",
    "evaluationCriteria": [
      "Fluency",
      "Communication",
      "Grammar",
      "Examples"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 72,
    "status": "active",
    "createdAt": "2026-01-18T11:00:00Z"
  },
  {
    "id": "SPK005",
    "topic": "Present a solution to a real-world problem",
    "category": "Problem Solving",
    "duration": 5,
    "difficulty": "Advanced",
    "evaluationCriteria": [
      "Structure",
      "Relevance",
      "Vocabulary",
      "Fluency"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 75,
    "status": "active",
    "createdAt": "2026-01-22T09:30:00Z"
  },
  {
    "id": "SPK006",
    "topic": "Talk about a current technology trend",
    "category": "Technology",
    "duration": 4,
    "difficulty": "Intermediate",
    "evaluationCriteria": [
      "Topic relevance",
      "Vocabulary",
      "Fluency",
      "Grammar"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 74,
    "status": "active",
    "createdAt": "2026-01-25T14:00:00Z"
  },
  {
    "id": "SPK007",
    "topic": "Describe a challenging situation you overcame",
    "category": "Behavioral",
    "duration": 4,
    "difficulty": "Intermediate",
    "evaluationCriteria": [
      "Story structure",
      "Communication",
      "Grammar",
      "Fluency"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 71,
    "status": "active",
    "createdAt": "2026-02-01T10:00:00Z"
  },
  {
    "id": "SPK008",
    "topic": "Explain REST APIs in simple terms",
    "category": "Technical",
    "duration": 4,
    "difficulty": "Intermediate",
    "evaluationCriteria": [
      "Technical accuracy",
      "Clarity",
      "Grammar",
      "Vocabulary"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 77,
    "status": "active",
    "createdAt": "2026-02-05T09:00:00Z"
  },
  {
    "id": "SPK009",
    "topic": "Discuss work-life balance in tech careers",
    "category": "Career",
    "duration": 3,
    "difficulty": "Beginner",
    "evaluationCriteria": [
      "Fluency",
      "Communication",
      "Grammar",
      "Relevance"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 69,
    "status": "active",
    "createdAt": "2026-02-08T11:30:00Z"
  },
  {
    "id": "SPK010",
    "topic": "Pitch a mobile app idea",
    "category": "Creative",
    "duration": 5,
    "difficulty": "Advanced",
    "evaluationCriteria": [
      "Persuasion",
      "Structure",
      "Vocabulary",
      "Fluency"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 78,
    "status": "active",
    "createdAt": "2026-02-12T13:00:00Z"
  },
  {
    "id": "SPK011",
    "topic": "Describe your hometown",
    "category": "Personal",
    "duration": 2,
    "difficulty": "Beginner",
    "evaluationCriteria": [
      "Fluency",
      "Grammar",
      "Descriptive language",
      "Clarity"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 74,
    "status": "active",
    "createdAt": "2026-02-15T08:30:00Z"
  },
  {
    "id": "SPK012",
    "topic": "Explain machine learning to a manager",
    "category": "Data Science",
    "duration": 5,
    "difficulty": "Advanced",
    "evaluationCriteria": [
      "Clarity",
      "Vocabulary",
      "Relevance",
      "Grammar"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 79,
    "status": "active",
    "createdAt": "2026-02-18T10:00:00Z"
  },
  {
    "id": "SPK013",
    "topic": "Talk about digital marketing trends in India",
    "category": "Marketing",
    "duration": 4,
    "difficulty": "Intermediate",
    "evaluationCriteria": [
      "Topic relevance",
      "Vocabulary",
      "Fluency",
      "Communication"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 72,
    "status": "active",
    "createdAt": "2026-02-22T09:00:00Z"
  },
  {
    "id": "SPK014",
    "topic": "Discuss cloud migration benefits",
    "category": "Cloud",
    "duration": 4,
    "difficulty": "Advanced",
    "evaluationCriteria": [
      "Technical accuracy",
      "Structure",
      "Grammar",
      "Vocabulary"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 76,
    "status": "active",
    "createdAt": "2026-02-25T14:30:00Z"
  },
  {
    "id": "SPK015",
    "topic": "Give feedback on a peer's presentation",
    "category": "Communication",
    "duration": 3,
    "difficulty": "Intermediate",
    "evaluationCriteria": [
      "Constructiveness",
      "Clarity",
      "Grammar",
      "Fluency"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 70,
    "status": "completed",
    "createdAt": "2026-03-01T11:00:00Z"
  },
  {
    "id": "SPK016",
    "topic": "Explain the importance of version control",
    "category": "Technical",
    "duration": 3,
    "difficulty": "Beginner",
    "evaluationCriteria": [
      "Clarity",
      "Technical vocabulary",
      "Grammar",
      "Fluency"
    ],
    "attempts": 0,
    "averageScore": 0,
    "averageFluency": 75,
    "status": "active",
    "createdAt": "2026-03-05T09:00:00Z"
  }
];

export const speakingTopics: SpeakingTopic[] = [
  {
    "id": "SPK001",
    "topic": "Introduce yourself and your career goals",
    "category": "Personal",
    "difficulty": "Beginner",
    "duration": 3,
    "prompts": [
      "Tell us about your background",
      "Why did you choose this course?",
      "Where do you see yourself in 3 years?"
    ]
  },
  {
    "id": "SPK002",
    "topic": "Describe your favorite project",
    "category": "Technical",
    "difficulty": "Intermediate",
    "duration": 5,
    "prompts": [
      "What problem did it solve?",
      "What technologies did you use?",
      "What was your role?"
    ]
  },
  {
    "id": "SPK003",
    "topic": "Explain a technical concept to a beginner",
    "category": "Communication",
    "difficulty": "Intermediate",
    "duration": 4,
    "prompts": [
      "Choose any concept from your course",
      "Avoid jargon",
      "Use an analogy"
    ]
  },
  {
    "id": "SPK004",
    "topic": "Discuss the importance of teamwork",
    "category": "Soft Skills",
    "difficulty": "Beginner",
    "duration": 3,
    "prompts": [
      "Share a team experience",
      "How do you handle disagreements?",
      "What makes a good team player?"
    ]
  },
  {
    "id": "SPK005",
    "topic": "Present a solution to a real-world problem",
    "category": "Problem Solving",
    "difficulty": "Advanced",
    "duration": 5,
    "prompts": [
      "Identify the problem clearly",
      "Propose your solution",
      "Explain expected impact"
    ]
  },
  {
    "id": "SPK006",
    "topic": "Talk about a current technology trend",
    "category": "Technology",
    "difficulty": "Intermediate",
    "duration": 4,
    "prompts": [
      "AI, cloud, or blockchain",
      "Why is it important?",
      "How will it affect jobs?"
    ]
  },
  {
    "id": "SPK007",
    "topic": "Describe a challenging situation you overcame",
    "category": "Behavioral",
    "difficulty": "Intermediate",
    "duration": 4,
    "prompts": [
      "Use the STAR method",
      "What did you learn?",
      "How did you grow?"
    ]
  },
  {
    "id": "SPK008",
    "topic": "Explain REST APIs in simple terms",
    "category": "Technical",
    "difficulty": "Intermediate",
    "duration": 4,
    "prompts": [
      "What is an API?",
      "HTTP methods",
      "Real-world example"
    ]
  },
  {
    "id": "SPK009",
    "topic": "Discuss work-life balance in tech careers",
    "category": "Career",
    "difficulty": "Beginner",
    "duration": 3,
    "prompts": [
      "Your ideal balance",
      "Handling deadlines",
      "Avoiding burnout"
    ]
  },
  {
    "id": "SPK010",
    "topic": "Pitch a mobile app idea",
    "category": "Creative",
    "difficulty": "Advanced",
    "duration": 5,
    "prompts": [
      "Target audience",
      "Key features",
      "Monetization strategy"
    ]
  },
  {
    "id": "SPK011",
    "topic": "Describe your hometown",
    "category": "Personal",
    "difficulty": "Beginner",
    "duration": 2,
    "prompts": [
      "Location and culture",
      "Famous places",
      "What you miss about it"
    ]
  },
  {
    "id": "SPK012",
    "topic": "Explain machine learning to a manager",
    "category": "Data Science",
    "difficulty": "Advanced",
    "duration": 5,
    "prompts": [
      "Business value",
      "Simple definition",
      "Use case example"
    ]
  },
  {
    "id": "SPK013",
    "topic": "Talk about digital marketing trends in India",
    "category": "Marketing",
    "difficulty": "Intermediate",
    "duration": 4,
    "prompts": [
      "Social media marketing",
      "Influencer economy",
      "SEO basics"
    ]
  },
  {
    "id": "SPK014",
    "topic": "Discuss cloud migration benefits",
    "category": "Cloud",
    "difficulty": "Advanced",
    "duration": 4,
    "prompts": [
      "Cost benefits",
      "Scalability",
      "Security considerations"
    ]
  },
  {
    "id": "SPK015",
    "topic": "Give feedback on a peer's presentation",
    "category": "Communication",
    "difficulty": "Intermediate",
    "duration": 3,
    "prompts": [
      "What went well?",
      "Areas to improve",
      "Actionable suggestions"
    ]
  },
  {
    "id": "SPK016",
    "topic": "Explain the importance of version control",
    "category": "Technical",
    "difficulty": "Beginner",
    "duration": 3,
    "prompts": [
      "What is Git?",
      "Branching basics",
      "Collaboration benefits"
    ]
  }
];

export function getSpeakingTestById(id: string): SpeakingTest | undefined {
  return speakingTests.find((test) => test.id === id);
}

export function getSpeakingTopicById(id: string): SpeakingTopic | undefined {
  return speakingTopics.find((topic) => topic.id === id);
}
