export interface Question {
  id: string;
  role: string;
  difficulty: 'Junior' | 'Mid' | 'Senior';
  type: 'technical' | 'coding';
  question: string;
  codeTemplate?: string;
  language?: string;
  expectedAnswer?: string;
}

export interface BiometricStats {
  stressScore: number;
  confidenceScore: number;
  hesitationIndex: number;
  heartRate: number;
  speechRate: number;
  movementIndex: number;
}

export interface BiometricLogEntry {
  timestamp: string;
  type: 'hesitation' | 'stress' | 'confidence' | 'typing' | 'info';
  message: string;
}

export interface AnswerRecord {
  questionId: string;
  questionText: string;
  type: 'technical' | 'coding';
  userTextAnswer: string;
  userCodeAnswer?: string;
  stressScores: number[];
  confidenceScores: number[];
  hesitationScores: number[];
  movementScores: number[];
  avgStress: number;
  avgConfidence: number;
  avgHesitation: number;
  avgMovement: number;
  durationSeconds: number;
  hesitationCount: number;
  backspaceCount: number;
  aiScore?: number; // 0-100
  aiFeedback?: string;
}

export interface PersonalityReport {
  overallScore: number;
  technicalAccuracy: number;
  confidence: number;
  communication: number;
  stressManagement: number;
  problemSolving: number;
  personalityType: string;
  personalityDescription: string;
  strengths: string[];
  growthAreas: string[];
  durationMinutes: number;
  totalQuestions: number;
}

export interface InterviewSession {
  role: string;
  difficulty: 'Junior' | 'Mid' | 'Senior';
  questions: Question[];
  currentIndex: number;
  status: 'idle' | 'calibrating' | 'interviewing' | 'completed';
  answers: AnswerRecord[];
  geminiKey?: string;
  report?: PersonalityReport;
}
