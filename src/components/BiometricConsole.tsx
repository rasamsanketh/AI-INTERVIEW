import React, { useEffect, useRef, useState } from 'react';
import { Camera, Activity, ShieldAlert, Cpu, Heart, CheckCircle } from 'lucide-react';
import type { BiometricLogEntry } from '../types';

interface BiometricConsoleProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  drawOverlay: (canvas: HTMLCanvasElement) => void;
  movementIndex: number;
  stressScore: number;
  confidenceScore: number;
  hesitationIndex: number;
  hesitationCount: number;
  isHesitating: boolean;
  logs: BiometricLogEntry[];
}

export const BiometricConsole: React.FC<BiometricConsoleProps> = ({
  videoRef,
  stream,
  drawOverlay,
  movementIndex,
  stressScore,
  confidenceScore,
  hesitationIndex,
  hesitationCount,
  isHesitating,
  logs
}) => {
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ecgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Local state for historical chart data
  const [stressHistory, setStressHistory] = useState<number[]>(Array(30).fill(25));
  const [confidenceHistory, setConfidenceHistory] = useState<number[]>(Array(30).fill(80));
  const [hesitationHistory, setHesitationHistory] = useState<number[]>(Array(30).fill(0));
  const [heartRate, setHeartRate] = useState<number>(72);

  // Periodically update biometric history logs for charting
  useEffect(() => {
    const interval = setInterval(() => {
      setStressHistory((history) => [...history.slice(1), stressScore]);
      setConfidenceHistory((history) => [...history.slice(1), confidenceScore]);
      setHesitationHistory((history) => [...history.slice(1), hesitationIndex]);
      
      // Calculate dynamic heart rate based on biometric inputs
      // Stress & Movement spike heart rate
      setHeartRate((prev) => {
        const baseHR = 70;
        const targetHR = baseHR + (stressScore * 0.3) + (movementIndex * 0.2);
        // Smoothly step towards target
        const nextHR = prev + (targetHR - prev) * 0.15;
        return Math.round(nextHR);
      });
    }, 500);

    return () => clearInterval(interval);
  }, [stressScore, confidenceScore, hesitationIndex, movementIndex]);

  // Request Animation Frame loop for drawing the webcam cyber overlay
  useEffect(() => {
    let active = true;

    const render = () => {
      if (!active) return;
      const canvas = overlayCanvasRef.current;
      if (canvas) {
        drawOverlay(canvas);
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawOverlay]);

  // Request Animation Frame loop for drawing the ECG pulse line
  useEffect(() => {
    const canvas = ecgCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x = 0;
    let step = 0;

    const drawEcg = () => {
      if (!ctx || !canvas) return;

      const w = canvas.width;
      const h = canvas.height;

      // Draw background with slight transparency for fade trail
      ctx.fillStyle = 'rgba(7, 11, 21, 0.08)';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#ef4444'; // Red ECG pulse
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
      ctx.beginPath();
      ctx.moveTo(x - 3, h / 2);

      // Determine ECG wave pattern based on step
      // Calculate pulse rate speed based on current heartRate state
      const pulseFrequency = Math.max(15, 60 - Math.round((heartRate - 70) * 0.3)); 
      const stepInCycle = step % pulseFrequency;

      let y = h / 2;
      if (stepInCycle === 0) {
        y = h / 2 - 2; // P wave
      } else if (stepInCycle === 4) {
        y = h / 2 + 3; // Q wave
      } else if (stepInCycle === 6) {
        y = h / 2 - 20; // R wave (spike)
      } else if (stepInCycle === 8) {
        y = h / 2 + 10; // S wave
      } else if (stepInCycle === 11) {
        y = h / 2 - 4; // T wave
      }

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Move cursor forward
      x += 2;
      step++;
      
      if (x > w) {
        x = 0;
        ctx.fillStyle = '#070b15';
        ctx.fillRect(0, 0, w, h);
      }

      requestAnimationFrame(drawEcg);
    };

    drawEcg();
  }, [heartRate]);

  // Helper to generate coordinates path for custom React SVGs
  const generateSvgPath = (data: number[], width: number, height: number) => {
    if (data.length < 2) return '';
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      // Invert Y because SVG coordinate starts top-left
      const y = height - (val / 100) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const generateSvgArea = (data: number[], width: number, height: number) => {
    const linePath = generateSvgPath(data, width, height);
    if (!linePath) return '';
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  // Helper to format timestamps nicely
  const formatTime = (tsStr: string) => {
    try {
      const d = new Date(tsStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* Webcam Feed Box */}
      <div 
        className="glass-panel" 
        style={{ 
          position: 'relative', 
          overflow: 'hidden', 
          aspectRatio: '4/3', 
          borderRadius: '12px',
          background: '#04070f'
        }}
      >
        {stream ? (
          <>
            <video 
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Mirror effect
              }}
              muted
              playsInline
            />
            {/* Visual Mesh Canvas Overlay */}
            <canvas 
              ref={overlayCanvasRef}
              width={320}
              height={240}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            />
          </>
        ) : (
          <div className="flex-center" style={{ flexDirection: 'column', height: '100%', gap: '12px', color: 'var(--text-muted)' }}>
            <Camera size={40} className="pulse-heart" />
            <span style={{ fontSize: '0.85rem' }}>WEBCAM DEACTIVATED</span>
          </div>
        )}
        
        {/* Dynamic Scan Info overlay */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(5, 10, 20, 0.75)',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          fontFamily: 'monospace'
        }}>
          <Cpu size={12} className="text-cyan-glow" />
          <span style={{ color: 'var(--cyber-cyan)' }}>SYS_STATUS: CALIBRATED</span>
        </div>
      </div>

      {/* Heart Rate & Biometric Indicators */}
      <div className="grid-cols-2" style={{ gap: '12px' }}>
        {/* Heart Rate card */}
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239, 68, 68, 0.04)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
          <div style={{ color: 'var(--stress-color)' }}>
            <Heart size={20} className="pulse-heart" fill="var(--stress-color)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>HEART RATE (EST)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--stress-color)' }}>
              {heartRate} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>BPM</span>
            </div>
          </div>
          <canvas ref={ecgCanvasRef} width={60} height={25} style={{ background: '#070b15', borderRadius: '4px', border: '1px solid rgba(255,0,0,0.1)' }} />
        </div>

        {/* Hesitation Monitor */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            background: isHesitating ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.04)', 
            borderColor: isHesitating ? 'var(--hesitation-color-glow)' : 'rgba(16, 185, 129, 0.1)' 
          }}
        >
          <div style={{ color: isHesitating ? 'var(--hesitation-color)' : 'var(--confidence-color)' }}>
            {isHesitating ? <ShieldAlert size={20} className="pulse-heart" /> : <CheckCircle size={20} />}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>HESITATION INDEX</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isHesitating ? 'var(--hesitation-color)' : 'var(--confidence-color)' }}>
              {hesitationIndex}% <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-secondary)' }}>({hesitationCount} detected)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Biometric Chart (Custom SVG area plot) */}
      <div className="glass-panel" style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} className="text-cyan-glow" /> REALTIME BIOMETRIC FLUX
          </span>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.65rem' }}>
            <span style={{ color: 'var(--cyber-cyan)' }}>● CONFIDENCE</span>
            <span style={{ color: 'var(--stress-color)' }}>● STRESS</span>
            <span style={{ color: 'var(--hesitation-color)' }}>● HESITATION</span>
          </div>
        </div>

        {/* Custom SVG Rendering Area */}
        <div style={{ flex: 1, minHeight: '80px', position: 'relative', width: '100%' }}>
          <svg style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }} viewBox="0 0 300 80" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cyber-cyan)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--cyber-cyan)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--stress-color)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--stress-color)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--hesitation-color)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--hesitation-color)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            <line x1="0" y1="40" x2="300" y2="40" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

            {/* Fill Paths */}
            <path d={generateSvgArea(confidenceHistory, 300, 80)} fill="url(#cyanGrad)" />
            <path d={generateSvgArea(stressHistory, 300, 80)} fill="url(#redGrad)" />
            <path d={generateSvgArea(hesitationHistory, 300, 80)} fill="url(#amberGrad)" />

            {/* Line Paths */}
            <path d={generateSvgPath(confidenceHistory, 300, 80)} fill="none" stroke="var(--cyber-cyan)" strokeWidth="1.5" />
            <path d={generateSvgPath(stressHistory, 300, 80)} fill="none" stroke="var(--stress-color)" strokeWidth="1.5" />
            <path d={generateSvgPath(hesitationHistory, 300, 80)} fill="none" stroke="var(--hesitation-color)" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Biometric Activity Log */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '12px', 
          height: '100px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px',
          background: 'rgba(5, 7, 12, 0.4)' 
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>BIOMETRIC EVENTS LOG</span>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {logs.map((log, idx) => (
            <div 
              key={idx} 
              style={{ 
                fontSize: '0.65rem', 
                fontFamily: 'monospace', 
                color: log.type === 'stress' ? 'var(--stress-color)' :
                       log.type === 'hesitation' ? 'var(--hesitation-color)' :
                       log.type === 'confidence' ? 'var(--confidence-color)' : 'var(--text-secondary)'
              }}
            >
              [{formatTime(log.timestamp)}] {log.message}
            </div>
          ))}
          {logs.length === 0 && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Waiting for biometric events...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
