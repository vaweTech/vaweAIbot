import type { Interview, EvaluationWeights } from "@/types/interview";

export const DEFAULT_EVALUATION_WEIGHTS: EvaluationWeights = {
  "technicalKnowledge": 30,
  "relevance": 20,
  "communication": 15,
  "grammar": 15,
  "fluency": 10,
  "vocabulary": 10
};

export const interviews: Interview[] = [
  {
    "id": "INT001",
    "name": "Java Developer Mock Interview",
    "jobRole": "Java Developer",
    "course": "Java Full Stack",
    "batch": "JFS-2026-A",
    "difficulty": "Intermediate",
    "duration": 45,
    "questionIds": [
      "IQ003",
      "IQ015",
      "IQ025",
      "IQ036",
      "IQ011"
    ],
    "questionSelection": "Question Bank",
    "attempts": 0,
    "averageScore": 0,
    "status": "active",
    "createdAt": "2026-01-15T09:00:00Z",
    "questionCount": 5,
    "weights": {
      "technicalKnowledge": 30,
      "relevance": 20,
      "communication": 15,
      "grammar": 15,
      "fluency": 10,
      "vocabulary": 10
    }
  },
  {
    "id": "INT002",
    "name": "Frontend React Assessment",
    "jobRole": "Frontend Developer",
    "course": "Web Development",
    "batch": "WD-2026-A",
    "difficulty": "Intermediate",
    "duration": 40,
    "questionIds": [
      "IQ001",
      "IQ004",
      "IQ013",
      "IQ034",
      "IQ008"
    ],
    "questionSelection": "Question Bank",
    "attempts": 0,
    "averageScore": 0,
    "status": "active",
    "createdAt": "2026-01-20T10:30:00Z",
    "questionCount": 5,
    "weights": {
      "technicalKnowledge": 30,
      "relevance": 20,
      "communication": 15,
      "grammar": 15,
      "fluency": 10,
      "vocabulary": 10
    }
  },
  {
    "id": "INT003",
    "name": "Python Backend Interview",
    "jobRole": "Python Developer",
    "course": "Python Full Stack",
    "batch": "PFS-2026-A",
    "difficulty": "Intermediate",
    "duration": 45,
    "questionIds": [
      "IQ009",
      "IQ019",
      "IQ030",
      "IQ005",
      "IQ012"
    ],
    "questionSelection": "Manual",
    "attempts": 0,
    "averageScore": 0,
    "status": "active",
    "createdAt": "2026-02-01T08:00:00Z",
    "questionCount": 5,
    "weights": {
      "technicalKnowledge": 30,
      "relevance": 20,
      "communication": 15,
      "grammar": 15,
      "fluency": 10,
      "vocabulary": 10
    }
  },
  {
    "id": "INT004",
    "name": "Data Analyst Screening",
    "jobRole": "Data Analyst",
    "course": "Data Science",
    "batch": "DS-2026-A",
    "difficulty": "Intermediate",
    "duration": 50,
    "questionIds": [
      "IQ010",
      "IQ020",
      "IQ031",
      "IQ040",
      "IQ021"
    ],
    "questionSelection": "Question Bank",
    "attempts": 0,
    "averageScore": 0,
    "status": "active",
    "createdAt": "2026-02-05T11:00:00Z",
    "questionCount": 5,
    "weights": {
      "technicalKnowledge": 30,
      "relevance": 20,
      "communication": 15,
      "grammar": 15,
      "fluency": 10,
      "vocabulary": 10
    }
  },
  {
    "id": "INT005",
    "name": "Full Stack Developer Round",
    "jobRole": "Full Stack Developer",
    "course": "Java Full Stack",
    "batch": "JFS-2026-B",
    "difficulty": "Advanced",
    "duration": 60,
    "questionIds": [
      "IQ024",
      "IQ018",
      "IQ037",
      "IQ005",
      "IQ014"
    ],
    "questionSelection": "AI Generated",
    "attempts": 0,
    "averageScore": 0,
    "status": "active",
    "createdAt": "2026-02-10T09:30:00Z",
    "questionCount": 5,
    "weights": {
      "technicalKnowledge": 30,
      "relevance": 20,
      "communication": 15,
      "grammar": 15,
      "fluency": 10,
      "vocabulary": 10
    }
  },
  {
    "id": "INT006",
    "name": "Cloud Engineer Interview",
    "jobRole": "Cloud Engineer",
    "course": "Cloud Computing",
    "batch": "CC-2026-A",
    "difficulty": "Advanced",
    "duration": 55,
    "questionIds": [
      "IQ016",
      "IQ037",
      "IQ007",
      "IQ028",
      "IQ011"
    ],
    "questionSelection": "Question Bank",
    "attempts": 0,
    "averageScore": 0,
    "status": "active",
    "createdAt": "2026-02-15T14:00:00Z",
    "questionCount": 5,
    "weights": {
      "technicalKnowledge": 30,
      "relevance": 20,
      "communication": 15,
      "grammar": 15,
      "fluency": 10,
      "vocabulary": 10
    }
  },
  {
    "id": "INT007",
    "name": "Digital Marketing Executive",
    "jobRole": "Marketing Executive",
    "course": "Digital Marketing",
    "batch": "DM-2026-A",
    "difficulty": "Beginner",
    "duration": 30,
    "questionIds": [
      "IQ021",
      "IQ022",
      "IQ032",
      "IQ033",
      "IQ012"
    ],
    "questionSelection": "Manual",
    "attempts": 0,
    "averageScore": 0,
    "status": "active",
    "createdAt": "2026-02-20T10:00:00Z",
    "questionCount": 5,
    "weights": {
      "technicalKnowledge": 30,
      "relevance": 20,
      "communication": 15,
      "grammar": 15,
      "fluency": 10,
      "vocabulary": 10
    }
  },
  {
    "id": "INT008",
    "name": "Node.js Backend Specialist",
    "jobRole": "Backend Developer",
    "course": "Python Full Stack",
    "batch": "PFS-2026-B",
    "difficulty": "Advanced",
    "duration": 50,
    "questionIds": [
      "IQ005",
      "IQ016",
      "IQ026",
      "IQ006",
      "IQ027"
    ],
    "questionSelection": "Question Bank",
    "attempts": 0,
    "averageScore": 0,
    "status": "completed",
    "createdAt": "2026-03-01T09:00:00Z",
    "questionCount": 5,
    "weights": {
      "technicalKnowledge": 30,
      "relevance": 20,
      "communication": 15,
      "grammar": 15,
      "fluency": 10,
      "vocabulary": 10
    }
  },
  {
    "id": "INT009",
    "name": "Senior Java Developer Panel",
    "jobRole": "Senior Java Developer",
    "course": "Java Full Stack",
    "batch": "JFS-2026-A",
    "difficulty": "Advanced",
    "duration": 60,
    "questionIds": [
      "IQ015",
      "IQ036",
      "IQ025",
      "IQ007",
      "IQ038"
    ],
    "questionSelection": "Manual",
    "attempts": 0,
    "averageScore": 0,
    "status": "active",
    "createdAt": "2026-03-05T13:00:00Z",
    "questionCount": 5,
    "weights": {
      "technicalKnowledge": 30,
      "relevance": 20,
      "communication": 15,
      "grammar": 15,
      "fluency": 10,
      "vocabulary": 10
    }
  },
  {
    "id": "INT010",
    "name": "Data Science Capstone Review",
    "jobRole": "Data Scientist",
    "course": "Data Science",
    "batch": "DS-2026-B",
    "difficulty": "Advanced",
    "duration": 55,
    "questionIds": [
      "IQ010",
      "IQ020",
      "IQ031",
      "IQ040",
      "IQ012"
    ],
    "questionSelection": "AI Generated",
    "attempts": 0,
    "averageScore": 0,
    "status": "active",
    "createdAt": "2026-03-10T11:30:00Z",
    "questionCount": 5,
    "weights": {
      "technicalKnowledge": 30,
      "relevance": 20,
      "communication": 15,
      "grammar": 15,
      "fluency": 10,
      "vocabulary": 10
    }
  }
];

export function getInterviewById(id: string): Interview | undefined {
  return interviews.find((interview) => interview.id === id);
}
