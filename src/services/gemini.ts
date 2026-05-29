import type { Question, AnswerRecord, PersonalityReport } from '../types';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export async function fetchFromGemini(apiKey: string, prompt: string, systemInstruction?: string): Promise<string> {
  const url = `${BASE_URL}?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: systemInstruction ? {
        parts: [{ text: systemInstruction }]
      } : undefined,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }
  return text;
}

export async function generateGeminiQuestions(apiKey: string, role: string, difficulty: string): Promise<Question[]> {
  const systemPrompt = `You are a professional technical recruiter. Generate exactly 3 technical interview questions for a ${difficulty}-level ${role} developer.
Return a JSON array containing objects matching this schema:
[
  {
    "id": "gemini-q1",
    "role": "${role}",
    "difficulty": "${difficulty}",
    "type": "technical", // or "coding"
    "question": "Clear, challenging, and appropriate question text...",
    "codeTemplate": "optional starting code template if type is coding",
    "language": "javascript", // or python, typescript, etc. if coding
    "expectedAnswer": "Brief description of what an optimal answer looks like"
  }
]
Make sure to mix both conceptual technical questions and coding rounds. Provide complete, valid JSON output only.`;

  try {
    const responseText = await fetchFromGemini(apiKey, 'Generate 3 interview questions', systemPrompt);
    // Parse the JSON
    const parsed = JSON.parse(responseText.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to generate questions with Gemini, using fallback', err);
    throw err;
  }
}

export async function evaluateAnswer(
  apiKey: string,
  question: Question,
  record: Omit<AnswerRecord, 'aiScore' | 'aiFeedback'>
): Promise<{ score: number; feedback: string }> {
  const prompt = `
Question Details:
Type: ${question.type}
Question: ${question.question}
Expected Guideline: ${question.expectedAnswer || 'N/A'}

Candidate Submission:
Spoken/Text Explanation: "${record.userTextAnswer}"
Code Submitted: ${record.userCodeAnswer ? `\n\`\`\`${question.language || 'javascript'}\n${record.userCodeAnswer}\n\`\`\`` : 'None'}

Candidate Biometrics during this question:
- Avg Stress Score: ${record.avgStress.toFixed(1)} / 100
- Avg Confidence: ${record.avgConfidence.toFixed(1)} / 100
- Avg Hesitation: ${record.avgHesitation.toFixed(1)} / 100
- Total Silence/Hesitations Detected: ${record.hesitationCount} times
- Coding Backspaces Count: ${record.backspaceCount} (if coding round)
- Time Taken: ${record.durationSeconds} seconds

Provide a technical evaluation of the answer quality. Consider their explanation, code validity/style, and emotional metrics (e.g. if hesitation is high, note that they seemed uncertain; if stress is high but code is excellent, note they performed well under pressure).

Return a JSON object:
{
  "score": 85, // number from 0 to 100
  "feedback": "Your explanation of closures was clear, but your debouncing implementation was missing the timer clear step. You paused several times, indicating hesitation, but eventually recovered well."
}
Only output the JSON object.`;

  const systemInstruction = "You are an AI interviewer assessing both technical accuracy and soft skills/biometrics.";
  try {
    const responseText = await fetchFromGemini(apiKey, prompt, systemInstruction);
    const parsed = JSON.parse(responseText.trim());
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 70,
      feedback: parsed.feedback || 'Answer evaluated.'
    };
  } catch (err) {
    console.error('Failed to evaluate answer with Gemini', err);
    // Return simple baseline feedback
    let score = 75;
    if (record.avgHesitation > 50) score -= 10;
    if (record.userTextAnswer.length < 20 && (!record.userCodeAnswer || record.userCodeAnswer.length < 20)) score -= 30;
    return {
      score: Math.max(10, score),
      feedback: `[Local Evaluation] Your response was recorded. Hesitation was ${record.avgHesitation > 50 ? 'moderately high' : 'well controlled'}. You took ${record.durationSeconds} seconds to complete.`
    };
  }
}

export async function generateReport(apiKey: string, answers: AnswerRecord[]): Promise<PersonalityReport> {
  const answersSummary = answers.map((a, i) => `
Question ${i + 1}: ${a.questionText}
Type: ${a.type}
Answer Score: ${a.aiScore || 70}
Feedback: "${a.aiFeedback || 'N/A'}"
Biometrics: Stress=${a.avgStress.toFixed(0)}, Confidence=${a.avgConfidence.toFixed(0)}, Hesitation=${a.avgHesitation.toFixed(0)}, Movement=${a.avgMovement.toFixed(0)}
`).join('\n');

  const prompt = `
Generate a comprehensive performance and personality report for a candidate who completed an AI technical interview with the following details:

${answersSummary}

Evaluate across five core metrics (each 0 to 100):
1. Technical Accuracy (based on response scores)
2. Confidence (inverse of hesitation/stress, vocal steadiness)
3. Communication (clarity, flow of answers)
4. Stress Management (stability of metrics under difficult coding tasks)
5. Problem Solving (ability to explain thinking, complete code templates)

Return a JSON object matching this schema:
{
  "overallScore": 82,
  "technicalAccuracy": 85,
  "confidence": 75,
  "communication": 80,
  "stressManagement": 70,
  "problemSolving": 88,
  "personalityType": "The Resilient Tinkerer", // 3-4 word title
  "personalityDescription": "A detailed 2-3 sentence paragraph explaining their personality profile...",
  "strengths": ["Strong conceptual database knowledge", "Excellent recovery after initial hesitation"],
  "growthAreas": ["Improve implementation speed under pressure", "Minimize micro-hesitations by structuring thoughts first"],
  "durationMinutes": 12,
  "totalQuestions": 3
}
Only output the JSON object.`;

  const systemInstruction = "You are a professional industrial psychologist and tech recruiter specializing in candidate assessment reports.";
  try {
    const responseText = await fetchFromGemini(apiKey, prompt, systemInstruction);
    return JSON.parse(responseText.trim());
  } catch (err) {
    console.error('Failed to generate report with Gemini', err);
    // Generate fallback report
    const avgScore = Math.round(answers.reduce((acc, a) => acc + (a.aiScore || 70), 0) / answers.length);
    const avgStress = answers.reduce((acc, a) => acc + a.avgStress, 0) / answers.length;
    const avgConf = answers.reduce((acc, a) => acc + a.avgConfidence, 0) / answers.length;
    const avgHes = answers.reduce((acc, a) => acc + a.avgHesitation, 0) / answers.length;
    const avgMove = answers.reduce((acc, a) => acc + a.avgMovement, 0) / answers.length;

    return {
      overallScore: avgScore,
      technicalAccuracy: avgScore,
      confidence: Math.round(100 - avgHes),
      communication: Math.round(avgConf),
      stressManagement: Math.round(Math.max(0, 100 - (avgStress * 0.7 + avgMove * 0.3))),
      problemSolving: Math.round((avgScore + avgConf) / 2),
      personalityType: avgConf > 75 ? "The Confident Builder" : "The Analytical Problem Solver",
      personalityDescription: `The candidate demonstrates steady technical problem-solving capabilities. Their performance remained resilient throughout the interview, showing adaptive recovery during difficult coding sequences.`,
      strengths: ["Strong technical foundations", "Maintains logical focus when answering technical prompts"],
      growthAreas: ["Work on reducing pauses when explaining abstract topics", "Practice coding fluently under timed conditions"],
      durationMinutes: Math.round(answers.reduce((acc, a) => acc + a.durationSeconds, 0) / 60) || 5,
      totalQuestions: answers.length
    };
  }
}
