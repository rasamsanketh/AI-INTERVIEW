import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioAnalysisResult {
  volume: number;
  pitch: number;
  stressScore: number;
  isHesitating: boolean;
  hesitationCount: number;
  hesitationIndex: number;
  resetHesitation: () => void;
  audioAnalyser: AnalyserNode | null;
  startAnalysis: () => Promise<void>;
  stopAnalysis: () => void;
}

export function useAudioAnalyzer(isInterviewing: boolean): AudioAnalysisResult {
  const [volume, setVolume] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [stressScore, setStressScore] = useState<number>(0);
  const [isHesitating, setIsHesitating] = useState<boolean>(false);
  const [hesitationCount, setHesitationCount] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // For hesitation tracking
  const lastVoiceTimeRef = useRef<number>(Date.now());
  const silenceThreshold = 0.015; // Noise gate volume threshold
  const hesitationTimeout = 2500; // 2.5 seconds of silence is hesitation
  const isHesitatingRef = useRef<boolean>(false);

  // For pitch & stress analysis history
  const pitchHistoryRef = useRef<number[]>([]);
  const volumeHistoryRef = useRef<number[]>([]);

  const resetHesitation = useCallback(() => {
    setIsHesitating(false);
    isHesitatingRef.current = false;
    setHesitationCount(0);
    lastVoiceTimeRef.current = Date.now();
  }, []);

  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVolume(0);
    setPitch(0);
    setStressScore(0);
  }, []);

  const startAnalysis = useCallback(async () => {
    stopAnalysis(); // Reset if already running

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);

      lastVoiceTimeRef.current = Date.now();

      const analyze = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getFloatTimeDomainData(dataArray);

        // 1. Calculate Volume (RMS)
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          sumSquares += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        const smoothedVolume = rms * 0.7 + volume * 0.3; // Simple smoothing
        setVolume(smoothedVolume);

        // 2. Pitch Detection via Autocorrelation
        const detectedPitch = detectPitch(dataArray, audioContext.sampleRate);
        if (detectedPitch > 0 && smoothedVolume > 0.01) {
          setPitch(detectedPitch);
          pitchHistoryRef.current.push(detectedPitch);
          if (pitchHistoryRef.current.length > 50) pitchHistoryRef.current.shift();
        }

        // Keep track of volume history
        volumeHistoryRef.current.push(smoothedVolume);
        if (volumeHistoryRef.current.length > 50) volumeHistoryRef.current.shift();

        // 3. Stress Score estimation
        // Volume variance + high volume peaks indicate voice instability/stress.
        // Dynamic range of pitch also tells us if voice is shaky (high frequency jitter).
        if (volumeHistoryRef.current.length > 10) {
          const avgVol = volumeHistoryRef.current.reduce((a, b) => a + b, 0) / volumeHistoryRef.current.length;
          const volVariance = volumeHistoryRef.current.reduce((a, b) => a + Math.pow(b - avgVol, 2), 0) / volumeHistoryRef.current.length;
          
          let pitchVariance = 0;
          if (pitchHistoryRef.current.length > 10) {
            const avgPitch = pitchHistoryRef.current.reduce((a, b) => a + b, 0) / pitchHistoryRef.current.length;
            pitchVariance = pitchHistoryRef.current.reduce((a, b) => a + Math.pow(b - avgPitch, 2), 0) / pitchHistoryRef.current.length;
          }

          // Stress score calculation (0 - 100)
          // Shaky volume (high variance relative to volume) + irregular pitch = high stress
          let stress = 0;
          if (avgVol > 0.01) {
            const volShakiness = Math.min(100, (volVariance / (avgVol * avgVol)) * 50);
            const pitchShakiness = Math.min(100, Math.sqrt(pitchVariance) * 0.5);
            stress = volShakiness * 0.6 + pitchShakiness * 0.4;
            
            // Add spike penalty for loud shouts/screams
            if (smoothedVolume > 0.25) {
              stress += 25;
            }
          }
          const finalStress = Math.min(100, Math.round(stress));
          setStressScore((prev) => Math.round(prev * 0.85 + finalStress * 0.15)); // Smooth transition
        }

        // 4. Silence & Hesitation Tracking (only active during interview rounds)
        if (isInterviewing) {
          if (smoothedVolume > silenceThreshold) {
            // User is speaking
            lastVoiceTimeRef.current = Date.now();
            if (isHesitatingRef.current) {
              setIsHesitating(false);
              isHesitatingRef.current = false;
            }
          } else {
            // User is silent
            const silentDuration = Date.now() - lastVoiceTimeRef.current;
            if (silentDuration > hesitationTimeout && !isHesitatingRef.current) {
              setIsHesitating(true);
              isHesitatingRef.current = true;
              setHesitationCount((c) => c + 1);
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(analyze);
      };

      analyze();
    } catch (err) {
      console.error('Error starting audio analysis:', err);
    }
  }, [isInterviewing, stopAnalysis, volume]);

  // Autocorrelation pitch detector
  const detectPitch = (buffer: Float32Array, sampleRate: number): number => {
    const SIZE = buffer.length;
    const c = new Float32Array(SIZE);

    // Compute autocorrelation
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        c[i] = c[i] + buffer[j] * buffer[j + i];
      }
    }

    // Find the first peak
    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;
    // Parabolic interpolation for sub-sample accuracy
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    // Check if the signal is periodic enough
    if (c[maxpos] > 0.05) {
      return sampleRate / T0;
    }
    return -1;
  };

  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  const hesitationIndex = Math.min(100, hesitationCount * 15);

  return {
    volume,
    pitch,
    stressScore,
    isHesitating,
    hesitationCount,
    hesitationIndex,
    resetHesitation,
    audioAnalyser: analyserRef.current,
    startAnalysis,
    stopAnalysis,
  };
}
