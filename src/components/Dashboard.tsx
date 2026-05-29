import React, { useState, useEffect, useRef } from 'react';
import { Play, Shield, Video, Mic, Settings, Key, Info } from 'lucide-react';
import { AudioWaveform } from './AudioWaveform';

interface DashboardProps {
  onStartInterview: (config: {
    role: string;
    difficulty: 'Junior' | 'Mid' | 'Senior';
    apiKey: string;
  }) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  drawOverlay: (canvas: HTMLCanvasElement) => void;
  audioAnalyser: AnalyserNode | null;
  startCalibrationDevices: () => Promise<void>;
  stopCalibrationDevices: () => void;
  micVolume: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartInterview,
  videoRef,
  stream,
  drawOverlay,
  audioAnalyser,
  startCalibrationDevices,
  stopCalibrationDevices,
  micVolume
}) => {
  const [role, setRole] = useState<string>('Frontend');
  const [difficulty, setDifficulty] = useState<'Junior' | 'Mid' | 'Senior'>('Mid');
  const [apiKey, setApiKey] = useState<string>('');
  
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibratedCam, setCalibratedCam] = useState<boolean>(false);
  const [calibratedMic, setCalibratedMic] = useState<boolean>(false);
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Retrieve API key from localStorage if it exists
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Request Animation Loop to render webcam face overlay during calibration
  useEffect(() => {
    let active = true;
    const render = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      if (canvas && stream) {
        drawOverlay(canvas);
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    if (stream) {
      render();
    }

    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [stream, drawOverlay]);

  // Track mic volume level to auto-approve microphone calibration
  useEffect(() => {
    if (stream && micVolume > 0.05 && !calibratedMic) {
      setCalibratedMic(true);
    }
  }, [stream, micVolume, calibratedMic]);

  // Track stream status to auto-approve webcam calibration
  useEffect(() => {
    if (stream && !calibratedCam) {
      // Small timeout to ensure feed loads
      const t = setTimeout(() => setCalibratedCam(true), 1500);
      return () => clearTimeout(t);
    }
  }, [stream, calibratedCam]);

  const handleStartCalibration = async () => {
    setIsCalibrating(true);
    setCalibratedCam(false);
    setCalibratedMic(false);
    try {
      await startCalibrationDevices();
    } catch (err) {
      console.error(err);
      setIsCalibrating(false);
    }
  };

  const handleSaveKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem('gemini_api_key', val);
  };

  const handleLaunch = () => {
    stopCalibrationDevices();
    onStartInterview({ role, difficulty, apiKey });
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Intro Header */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>
          AI INTERVIEW <span style={{ background: 'linear-gradient(to right, var(--cyber-cyan), var(--cyber-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SIMULATOR</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          Evaluate your technical knowledge, coding structure, and biometrics in real-time. Connect standard audio/video inputs to initialize evaluation.
        </p>
      </div>

      <div className="grid-cols-2" style={{ gridTemplateColumns: '4.5fr 5.5fr', gap: '24px' }}>
        
        {/* Left Side: Parameters Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Interview Config Card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} className="text-cyan-glow" /> SETUP CONFIGURATION
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TARGET ROLE</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                className="cyber-select"
              >
                <option value="Frontend">Frontend Engineer</option>
                <option value="Backend">Backend Engineer</option>
                <option value="System Design">System Design Engineer</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>DIFFICULTY LEVEL</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['Junior', 'Mid', 'Senior'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setDifficulty(lvl)}
                    className="glass-panel"
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      background: difficulty === lvl ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                      borderColor: difficulty === lvl ? 'var(--cyber-cyan)' : 'rgba(255,255,255,0.08)',
                      color: difficulty === lvl ? 'var(--cyber-cyan)' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle API key panel */}
            <div>
              <button 
                onClick={() => setShowApiSettings(!showApiSettings)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--cyber-purple)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  outline: 'none'
                }}
              >
                <Key size={12} /> {showApiSettings ? 'Hide' : 'Use'} Live Gemini AI (Optional)
              </button>

              {showApiSettings && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  <input
                    type="password"
                    placeholder="Enter Gemini API Key..."
                    value={apiKey}
                    onChange={(e) => handleSaveKey(e.target.value)}
                    className="cyber-input"
                  />
                  <div className="custom-alert info" style={{ padding: '8px 10px', fontSize: '0.75rem', margin: 0 }}>
                    <Info size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Your API key is saved strictly locally. If omitted, local mock scenarios will be run.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Guidelines Alert */}
          <div className="glass-panel purple-glow" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid var(--cyber-purple)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyber-purple)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} /> DATA & SENSOR PRIVACY
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              All audio/video calculations occur strictly inside your browser sandbox. No camera images or raw voice audio records are ever uploaded to any database.
            </p>
          </div>
        </div>

        {/* Right Side: Calibration Module */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={18} className="text-cyan-glow" /> SENSOR CALIBRATION
          </h2>

          {/* Test Screen View */}
          <div 
            style={{ 
              position: 'relative', 
              aspectRatio: '4/3', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              background: '#04070e', 
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {stream ? (
              <>
                <video 
                  ref={videoRef}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                  muted
                  playsInline
                />
                <canvas 
                  ref={canvasRef}
                  width={320}
                  height={240}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                />
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                <Video size={36} />
                <span style={{ fontSize: '0.8rem' }}>Feed Deactivated</span>
              </div>
            )}
            
            {/* Hologram Overlay scanning text */}
            {isCalibrating && !calibratedCam && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 240, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--cyber-cyan)',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                letterSpacing: '1px'
              }}>
                ACQUIRING WEBCAM TARGET...
              </div>
            )}
          </div>

          {/* Calibration Control Button */}
          {!isCalibrating ? (
            <button onClick={handleStartCalibration} className="btn-cyber purple" style={{ width: '100%', justifyContent: 'center' }}>
              <Video size={16} /> Enable Camera & Mic
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Mic Audio Graph */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mic size={12} /> MICROPHONE INPUT WAVEFORM
                </span>
                <AudioWaveform analyser={audioAnalyser} height={50} />
              </div>

              {/* Calibration prompts */}
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.75rem', lineHeight: '1.4', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  "To calibrate microphone, speak clearly: 'I am ready to begin my interview simulation.'"
                </p>
              </div>

              {/* Status indicators */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: calibratedCam ? 'var(--confidence-color)' : 'var(--stress-color)' }}>●</span>
                  Webcam: {calibratedCam ? 'CALIBRATED' : 'WAITING...'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: calibratedMic ? 'var(--confidence-color)' : 'var(--stress-color)' }}>●</span>
                  Microphone: {calibratedMic ? 'CALIBRATED' : 'SPEAK TO CALIBRATE'}
                </span>
              </div>

              {/* Start Button */}
              <button 
                onClick={handleLaunch} 
                className="btn-cyber" 
                style={{ 
                  width: '100%', 
                  justifyContent: 'center',
                  opacity: calibratedCam && calibratedMic ? 1 : 0.6,
                  cursor: calibratedCam && calibratedMic ? 'pointer' : 'not-allowed'
                }}
                disabled={!calibratedCam || !calibratedMic}
              >
                <Play size={16} /> Enter Interview Room
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
