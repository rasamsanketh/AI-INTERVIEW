import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, SkipForward, Clock, Brain } from 'lucide-react';
import type { Question, AnswerRecord, BiometricLogEntry } from '../types';
import { CodeEditor } from './CodeEditor';
import { BiometricConsole } from './BiometricConsole';
import { AudioWaveform } from './AudioWaveform';

interface InterviewRoomProps {
  questions: Question[];
  currentIndex: number;
  onAnswerSubmit: (record: Omit<AnswerRecord, 'aiScore' | 'aiFeedback'>) => void;
  onSkipQuestion: () => void;
  
  // Webcam hooks
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  drawOverlay: (canvas: HTMLCanvasElement) => void;
  movementIndex: number;
  
  // Audio hooks
  audioAnalyser: AnalyserNode | null;
  stressScore: number;
  confidenceScore: number;
  hesitationIndex: number;
  hesitationCount: number;
  isHesitating: boolean;
  resetHesitation: () => void;
}

export const InterviewRoom: React.FC<InterviewRoomProps> = ({
  questions,
  currentIndex,
  onAnswerSubmit,
  onSkipQuestion,
  videoRef,
  stream,
  drawOverlay,
  movementIndex,
  audioAnalyser,
  stressScore,
  confidenceScore,
  hesitationIndex,
  hesitationCount,
  isHesitating,
  resetHesitation
}) => {
  const currentQuestion = questions[currentIndex];
  
  // Answer states
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [codeAnswer, setCodeAnswer] = useState<string>('');
  const [backspaceCount, setBackspaceCount] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 mins
  
  // Speech Recognition state
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Biometric aggregators for the current question
  const [stressHistory, setStressHistory] = useState<number[]>([]);
  const [confidenceHistory, setConfidenceHistory] = useState<number[]>([]);
  const [hesitationHistory, setHesitationHistory] = useState<number[]>([]);
  const [movementHistory, setMovementHistory] = useState<number[]>([]);
  const [biometricLogs, setBiometricLogs] = useState<BiometricLogEntry[]>([]);

  const questionStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<number | null>(null);

  // Synthesize Speech (AI speaks the question)
  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel any existing speech
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Attempt to pick a professional-sounding default voice
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
      if (premiumVoice) utterance.voice = premiumVoice;

      utterance.rate = 0.95; // Slightly slower for clarity
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Trigger TTS on question change
  useEffect(() => {
    speakQuestion(`Question ${currentIndex + 1}: ${currentQuestion.question}`);
    
    // Reset trackers for the new question
    setTextAnswer('');
    setCodeAnswer(currentQuestion.codeTemplate || '');
    setBackspaceCount(0);
    setTimeRemaining(300);
    setStressHistory([]);
    setConfidenceHistory([]);
    setHesitationHistory([]);
    setMovementHistory([]);
    setBiometricLogs([
      {
        timestamp: new Date().toISOString(),
        type: 'info',
        message: `Round ${currentIndex + 1} started. Ready for audio/video input.`
      }
    ]);
    resetHesitation();
    questionStartTimeRef.current = Date.now();

    // Start speech recognition automatically if supported
    startSpeechRecognition();

    return () => {
      stopSpeechRecognition();
    };
  }, [currentIndex, currentQuestion]);

  // Question countdown timer
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          handleSubmit(); // Auto submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [currentIndex, textAnswer, codeAnswer, stressHistory]);

  // Periodically aggregate biometrics & generate event logs
  useEffect(() => {
    const interval = setInterval(() => {
      setStressHistory((h) => [...h, stressScore]);
      setConfidenceHistory((h) => [...h, confidenceScore]);
      setHesitationHistory((h) => [...h, hesitationIndex]);
      setMovementHistory((h) => [...h, movementIndex]);

      // Dynamic log generator based on thresholds
      const timestamp = new Date().toISOString();
      if (stressScore > 65 && Math.random() < 0.2) {
        logBiometricEvent({
          timestamp,
          type: 'stress',
          message: `Elevated stress indicators detected (${stressScore}%). Take a breath.`
        });
      }
      if (movementIndex > 50 && Math.random() < 0.2) {
        logBiometricEvent({
          timestamp: new Date().toISOString(),
          type: 'stress',
          message: `Candidate physical fidgeting index high (${movementIndex}%).`
        });
      }
      if (confidenceScore > 85 && Math.random() < 0.15) {
        logBiometricEvent({
          timestamp,
          type: 'confidence',
          message: 'Steady answering pace. Confidence index strong.'
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stressScore, confidenceScore, hesitationIndex, movementIndex]);

  // Log a specific hesitation event when triggered by hook
  useEffect(() => {
    if (isHesitating) {
      logBiometricEvent({
        timestamp: new Date().toISOString(),
        type: 'hesitation',
        message: `Vocal hesitation detected. Answering pause exceeded 2.5s.`
      });
    }
  }, [isHesitating]);

  const logBiometricEvent = (entry: BiometricLogEntry) => {
    setBiometricLogs((prev) => [entry, ...prev.slice(0, 15)]);
  };

  // Speech Recognition API setup
  const startSpeechRecognition = () => {
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechClass) return;

    try {
      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTextAnswer((prev) => prev + finalTranscript);
          logBiometricEvent({
            timestamp: new Date().toISOString(),
            type: 'typing',
            message: 'Voice transcription updated successfully.'
          });
        }
      };

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.log('Failed to start speech recognition', e);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  // Format time (mm:ss)
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmit = () => {
    stopSpeechRecognition();
    window.speechSynthesis.cancel();

    // Calculate averages (with safety fallbacks if history is empty)
    const avgStress = stressHistory.length ? stressHistory.reduce((a, b) => a + b, 0) / stressHistory.length : 20;
    const avgConfidence = confidenceHistory.length ? confidenceHistory.reduce((a, b) => a + b, 0) / confidenceHistory.length : 80;
    const avgHesitation = hesitationHistory.length ? hesitationHistory.reduce((a, b) => a + b, 0) / hesitationHistory.length : 5;
    const avgMovement = movementHistory.length ? movementHistory.reduce((a, b) => a + b, 0) / movementHistory.length : 15;
    const durationSeconds = Math.round((Date.now() - questionStartTimeRef.current) / 1000);

    onAnswerSubmit({
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      type: currentQuestion.type,
      userTextAnswer: textAnswer,
      userCodeAnswer: currentQuestion.type === 'coding' ? codeAnswer : undefined,
      stressScores: stressHistory,
      confidenceScores: confidenceHistory,
      hesitationScores: hesitationHistory,
      movementScores: movementHistory,
      avgStress,
      avgConfidence,
      avgMovement,
      avgHesitation,
      durationSeconds,
      hesitationCount,
      backspaceCount
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '20px', height: 'calc(100vh - 120px)', minHeight: '550px' }}>
      
      {/* Left Workspace Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
        
        {/* Top Header Card */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--cyber-cyan)', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ROUND {currentIndex + 1} OF {questions.length}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              TYPE: {currentQuestion.type.toUpperCase()}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Timer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: timeRemaining < 60 ? 'var(--stress-color)' : 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
              <Clock size={16} className={timeRemaining < 60 ? 'pulse-heart' : ''} />
              <span>{formatTimer(timeRemaining)}</span>
            </div>
            
            <button onClick={onSkipQuestion} className="btn-cyber purple" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}>
              <SkipForward size={12} /> Skip
            </button>
          </div>
        </div>

        {/* AI Avatar & Waveform Grid */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          {/* Pulsing Hologram Circle */}
          <div className="hologram-avatar" style={{ width: '60px', height: '60px', flexShrink: 0, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', background: '#0e172a' }}>
            <Brain size={30} className="text-cyan-glow" />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--cyber-cyan)', letterSpacing: '1px', fontWeight: 700 }}>AI INTERVIEWER</span>
              {/* Simple audio wave visualizer */}
              <div style={{ width: '80px' }}>
                <AudioWaveform analyser={audioAnalyser} height={20} />
              </div>
            </div>
            {/* Question Text */}
            <p style={{ fontSize: '1.05rem', fontWeight: 500, lineHeight: '1.5', color: '#ffffff' }}>
              {currentQuestion.question}
            </p>
          </div>
        </div>

        {/* Dynamic Sandbox Workspace */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {currentQuestion.type === 'coding' ? (
            <CodeEditor
              initialCode={currentQuestion.codeTemplate || ''}
              language={currentQuestion.language || 'javascript'}
              onChange={(code) => setCodeAnswer(code)}
              onBackspacePressed={() => setBackspaceCount((c) => c + 1)}
            />
          ) : (
            // Verbal round note pad / answering board
            <div className="glass-panel" style={{ height: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  VERBAL RESPONSE BOARD
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Speak or type your technical explanation below
                </span>
              </div>
              
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  padding: '16px',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  resize: 'none',
                  outline: 'none'
                }}
                placeholder="Click the microphone and explain your thoughts aloud, or type your answer directly here..."
              />
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Speech Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={toggleListening} 
              className={`btn-cyber ${isListening ? '' : 'purple'}`}
              style={{ padding: '8px 16px', fontSize: '0.8rem', textTransform: 'none' }}
            >
              {isListening ? (
                <>
                  <MicOff size={14} /> Stop Listening
                </>
              ) : (
                <>
                  <Mic size={14} /> Start Voice Capture
                </>
              )}
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isListening ? '🎙 Live transcribing audio...' : 'Speech-to-text idle.'}
            </span>
          </div>

          {/* Submit Answer */}
          <button onClick={handleSubmit} className="btn-cyber" style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
            Submit Answer <Send size={14} />
          </button>
        </div>
      </div>

      {/* Right Biosensor Sidebar */}
      <div style={{ height: '100%', overflowY: 'auto', paddingRight: '2px' }}>
        <BiometricConsole
          videoRef={videoRef}
          stream={stream}
          drawOverlay={drawOverlay}
          movementIndex={movementIndex}
          stressScore={stressScore}
          confidenceScore={confidenceScore}
          hesitationIndex={hesitationIndex}
          hesitationCount={hesitationCount}
          isHesitating={isHesitating}
          logs={biometricLogs}
        />
      </div>
    </div>
  );
};
