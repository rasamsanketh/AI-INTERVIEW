import { useState } from 'react';
import { Cpu } from 'lucide-react';
import type { InterviewSession, AnswerRecord, Question } from './types';
import { Dashboard } from './components/Dashboard';
import { InterviewRoom } from './components/InterviewRoom';
import { ReportCard } from './components/ReportCard';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { useWebcamTracker } from './hooks/useWebcamTracker';
import { getQuestionsForConfig } from './services/mockQuestions';
import { generateGeminiQuestions, evaluateAnswer, generateReport } from './services/gemini';

export default function App() {
  const [session, setSession] = useState<InterviewSession>({
    role: 'Frontend',
    difficulty: 'Mid',
    questions: [],
    currentIndex: 0,
    status: 'idle',
    answers: []
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [backspaceCount, setBackspaceCount] = useState<number>(0);

  // Initialize biometric trackers
  const isCurrentlyInterviewing = session.status === 'interviewing';
  const {
    volume: micVolume,
    stressScore,
    isHesitating,
    hesitationCount,
    hesitationIndex,
    resetHesitation,
    audioAnalyser,
    startAnalysis: startAudioAnalysis,
    stopAnalysis: stopAudioAnalysis
  } = useAudioAnalyzer(isCurrentlyInterviewing);

  const {
    stream: webcamStream,
    movementIndex,
    startTracking: startWebcamTracking,
    stopTracking: stopWebcamTracking,
    drawFaceOverlay,
    videoRef
  } = useWebcamTracker();

  // Custom live confidence calculation formula
  // Drops when stress/hesitations/backspaces increase; baseline starts high
  const liveConfidenceScore = Math.max(
    10,
    Math.min(
      100,
      Math.round(85 - stressScore * 0.2 - hesitationCount * 3.5 - backspaceCount * 0.8)
    )
  );

  // Start devices for dashboard calibration
  const startCalibrationDevices = async () => {
    await startWebcamTracking();
    await startAudioAnalysis();
  };

  // Stop all camera and audio streams
  const stopCalibrationDevices = () => {
    stopWebcamTracking();
    stopAudioAnalysis();
  };

  // Triggered when entering interview room from dashboard
  const handleStartInterview = async (config: {
    role: string;
    difficulty: 'Junior' | 'Mid' | 'Senior';
    apiKey: string;
  }) => {
    setLoading(true);
    setLoadingMessage('Initializing AI evaluator and generating custom questions...');
    
    try {
      let activeQuestions: Question[] = [];
      if (config.apiKey) {
        // Try generating questions using Gemini API
        activeQuestions = await generateGeminiQuestions(config.apiKey, config.role, config.difficulty);
      }
      
      // Fallback if API fails or is not provided
      if (!activeQuestions || activeQuestions.length === 0) {
        activeQuestions = getQuestionsForConfig(config.role, config.difficulty);
      }

      setSession({
        role: config.role,
        difficulty: config.difficulty,
        questions: activeQuestions,
        currentIndex: 0,
        status: 'interviewing',
        answers: [],
        geminiKey: config.apiKey
      });

      // Restart sensors for active interviewing session
      await startWebcamTracking();
      await startAudioAnalysis();
    } catch (err) {
      console.error('Failed to start interview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Triggered when user submits an answer
  const handleAnswerSubmit = async (record: Omit<AnswerRecord, 'aiScore' | 'aiFeedback'>) => {
    setLoading(true);
    setLoadingMessage(`Analyzing voice stress, coding patterns, and scoring response ${session.currentIndex + 1}...`);

    try {
      const currentQuestion = session.questions[session.currentIndex];
      let scoringResult = { score: 75, feedback: 'Good response.' };

      if (session.geminiKey) {
        // Evaluate answer using Gemini
        scoringResult = await evaluateAnswer(session.geminiKey, currentQuestion, record);
      } else {
        // Run offline local rule-based evaluation fallback
        let score = 80;
        if (record.avgHesitation > 30) score -= 10;
        if (record.avgStress > 50) score -= 8;
        if (record.backspaceCount > 15) score -= 5;
        if (record.userTextAnswer.length < 30 && (!record.userCodeAnswer || record.userCodeAnswer.length < 30)) {
          score -= 25;
        }
        score = Math.max(15, score);
        scoringResult = {
          score,
          feedback: `[Offline Analysis] Your explanation showed ${
            record.avgStress > 50 ? 'moderately elevated' : 'well-managed'
          } stress levels. You finished in ${record.durationSeconds} seconds with ${
            record.hesitationCount
          } pauses detected.`
        };
      }

      const completedAnswer: AnswerRecord = {
        ...record,
        aiScore: scoringResult.score,
        aiFeedback: scoringResult.feedback
      };

      const updatedAnswers = [...session.answers, completedAnswer];
      const nextIndex = session.currentIndex + 1;

      if (nextIndex >= session.questions.length) {
        // Complete the interview and generate final report
        setLoadingMessage('Processing behavioral charts and compiling psychological report...');
        
        let reportData;
        if (session.geminiKey) {
          reportData = await generateReport(session.geminiKey, updatedAnswers);
        } else {
          // Trigger fallback local evaluator
          const totalScore = updatedAnswers.reduce((a, b) => a + (b.aiScore || 70), 0);
          const finalScore = Math.round(totalScore / updatedAnswers.length);
          const avgHes = updatedAnswers.reduce((a, b) => a + b.avgHesitation, 0) / updatedAnswers.length;
          
          reportData = {
            overallScore: finalScore,
            technicalAccuracy: finalScore,
            confidence: Math.round(100 - avgHes),
            communication: Math.min(100, Math.round(finalScore + 5)),
            stressManagement: Math.round(100 - (updatedAnswers.reduce((a, b) => a + b.avgStress, 0) / updatedAnswers.length)),
            problemSolving: Math.round(finalScore * 0.95),
            personalityType: finalScore > 80 ? 'The Fluid Architect' : 'The Resilient Debugger',
            personalityDescription: 'The candidate demonstrates competent mental models. They retain solid technical boundaries and recovered well when biometric thresholds spiked during coding sessions.',
            strengths: ['Strong technical conceptual foundation', 'Good recovery speed after pauses'],
            growthAreas: ['Reduce micro-pauses during technical explanations', 'Improve structural coding speed under time limits'],
            durationMinutes: Math.round(updatedAnswers.reduce((a, b) => a + b.durationSeconds, 0) / 60) || 4,
            totalQuestions: updatedAnswers.length
          };
        }

        setSession((prev) => ({
          ...prev,
          answers: updatedAnswers,
          status: 'completed',
          report: reportData
        }));

        stopCalibrationDevices();
      } else {
        // Advance to next question
        setBackspaceCount(0);
        setSession((prev) => ({
          ...prev,
          answers: updatedAnswers,
          currentIndex: nextIndex
        }));
      }
    } catch (err) {
      console.error('Answer submission failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipQuestion = () => {
    // Treat skip as empty answer
    const currentQuestion = session.questions[session.currentIndex];
    const skippedRecord: AnswerRecord = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      type: currentQuestion.type,
      userTextAnswer: 'Candidate skipped the question.',
      userCodeAnswer: currentQuestion.type === 'coding' ? '// Skipped' : undefined,
      stressScores: [50],
      confidenceScores: [30],
      hesitationScores: [80],
      movementScores: [30],
      avgStress: 50,
      avgConfidence: 30,
      avgMovement: 30,
      avgHesitation: 80,
      durationSeconds: 10,
      hesitationCount: 1,
      backspaceCount: 0,
      aiScore: 0,
      aiFeedback: 'Question was skipped by candidate.'
    };

    const updatedAnswers = [...session.answers, skippedRecord];
    const nextIndex = session.currentIndex + 1;

    if (nextIndex >= session.questions.length) {
      // Offline fallback report for skips
      const reportData = {
        overallScore: Math.round(updatedAnswers.reduce((a, b) => a + b.aiScore!, 0) / updatedAnswers.length),
        technicalAccuracy: 30,
        confidence: 40,
        communication: 50,
        stressManagement: 60,
        problemSolving: 30,
        personalityType: 'The Reluctant Solver',
        personalityDescription: 'The candidate exhibited high hesitation indexes, skipping sections when faced with structural tasks.',
        strengths: ['Identifies personal complexity limits early'],
        growthAreas: ['Improve core resilience under pressure', 'Attempt coding tasks even if incomplete'],
        durationMinutes: 1,
        totalQuestions: updatedAnswers.length
      };

      setSession((prev) => ({
        ...prev,
        answers: updatedAnswers,
        status: 'completed',
        report: reportData
      }));
      stopCalibrationDevices();
    } else {
      setBackspaceCount(0);
      setSession((prev) => ({
        ...prev,
        answers: updatedAnswers,
        currentIndex: nextIndex
      }));
    }
  };

  const handleReset = () => {
    stopCalibrationDevices();
    setSession({
      role: 'Frontend',
      difficulty: 'Mid',
      questions: [],
      currentIndex: 0,
      status: 'idle',
      answers: []
    });
    setBackspaceCount(0);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Dynamic Nav Header */}
      <header className="dashboard-nav" style={{ padding: '16px 32px', background: 'rgba(5, 7, 14, 0.4)', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu className="text-cyan-glow" size={20} />
          <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '1px', background: 'linear-gradient(to right, #00f0ff, #ab47bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AURA SIMULATOR
          </span>
        </div>

        {isCurrentlyInterviewing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--stress-color)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '3px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <span className="pulse-heart" style={{ color: 'var(--stress-color)' }}>●</span> BIOMETRICS ACTIVE
            </span>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {loading ? (
          <div className="glass-panel flex-center" style={{ flexDirection: 'column', gap: '20px', padding: '40px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
            <Cpu size={48} className="text-cyan-glow pulse-heart" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Processing Neural Node...</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {loadingMessage}
            </p>
          </div>
        ) : (
          <>
            {session.status === 'idle' && (
              <Dashboard
                onStartInterview={handleStartInterview}
                videoRef={videoRef}
                stream={webcamStream}
                drawOverlay={drawFaceOverlay}
                audioAnalyser={audioAnalyser}
                startCalibrationDevices={startCalibrationDevices}
                stopCalibrationDevices={stopCalibrationDevices}
                micVolume={micVolume}
              />
            )}

            {session.status === 'interviewing' && (
              <InterviewRoom
                questions={session.questions}
                currentIndex={session.currentIndex}
                onAnswerSubmit={handleAnswerSubmit}
                onSkipQuestion={handleSkipQuestion}
                videoRef={videoRef}
                stream={webcamStream}
                drawOverlay={drawFaceOverlay}
                movementIndex={movementIndex}
                audioAnalyser={audioAnalyser}
                stressScore={stressScore}
                confidenceScore={liveConfidenceScore}
                hesitationIndex={hesitationIndex}
                hesitationCount={hesitationCount}
                isHesitating={isHesitating}
                resetHesitation={resetHesitation}
              />
            )}

            {session.status === 'completed' && session.report && (
              <ReportCard
                report={session.report}
                answers={session.answers}
                onReset={handleReset}
              />
            )}
          </>
        )}
      </main>
      
      {/* Footer */}
      <footer style={{ padding: '16px', background: 'rgba(5, 7, 14, 0.4)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        AURA (AI User Reaction Analyser) Interview Sandbox. Built with React, Web Audio & HTML5 Canvas.
      </footer>
    </div>
  );
}
