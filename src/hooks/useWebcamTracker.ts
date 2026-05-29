import { useEffect, useRef, useState, useCallback } from 'react';

interface WebcamTrackerResult {
  stream: MediaStream | null;
  movementIndex: number;
  fidgetLog: number[];
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  drawFaceOverlay: (canvas: HTMLCanvasElement) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useWebcamTracker(): WebcamTrackerResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [movementIndex, setMovementIndex] = useState<number>(0);
  const [fidgetLog, setFidgetLog] = useState<number[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const intervalRef = useRef<number | null>(null);
  
  // Custom futuristic tracking coordinates simulation
  const meshAnimationRef = useRef<number>(0);
  const targetXRef = useRef<number>(50); // percentage-based
  const targetYRef = useRef<number>(50);
  const currentXRef = useRef<number>(50);
  const currentYRef = useRef<number>(50);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    prevFrameDataRef.current = null;
    setMovementIndex(0);
  }, [stream]);

  const startTracking = useCallback(async () => {
    stopTracking(); // Ensure cleanup

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(err => console.log("Video play interrupted", err));
      }

      // Create a hidden canvas for processing
      const processingCanvas = document.createElement('canvas');
      processingCanvas.width = 80; // Keep it small for fast pixel processing
      processingCanvas.height = 60;
      const ctx = processingCanvas.getContext('2d');

      // Periodically compare frames for motion analysis (frame-differencing)
      const interval = window.setInterval(() => {
        if (!videoRef.current || !ctx) return;
        
        try {
          // Draw video onto small offscreen canvas
          ctx.drawImage(videoRef.current, 0, 0, processingCanvas.width, processingCanvas.height);
          const currentFrame = ctx.getImageData(0, 0, processingCanvas.width, processingCanvas.height);
          const data = currentFrame.data;

          if (prevFrameDataRef.current) {
            let diffSum = 0;
            const prevData = prevFrameDataRef.current;
            
            // Loop through pixels and calculate brightness difference
            for (let i = 0; i < data.length; i += 4) {
              const rDiff = Math.abs(data[i] - prevData[i]);
              const gDiff = Math.abs(data[i+1] - prevData[i+1]);
              const bDiff = Math.abs(data[i+2] - prevData[i+2]);
              
              const diff = (rDiff + gDiff + bDiff) / 3;
              if (diff > 15) { // Noise threshold
                diffSum += diff;
              }
            }

            // Calculate movement index relative to canvas size
            const pixelCount = processingCanvas.width * processingCanvas.height;
            const normalizedMovement = (diffSum / pixelCount) * 1.5; // Scale multiplier
            const finalMovement = Math.min(100, Math.round(normalizedMovement));
            
            setMovementIndex((prev) => {
              const smoothed = Math.round(prev * 0.7 + finalMovement * 0.3);
              setFidgetLog((log) => {
                const updated = [...log, smoothed];
                return updated.length > 50 ? updated.slice(1) : updated;
              });
              return smoothed;
            });
          }

          prevFrameDataRef.current = data;

          // Simulate slight jitter in face-tracking coordinates to mimic real-time lock-on
          meshAnimationRef.current += 0.05;
          if (Math.random() < 0.15) {
            // Pick a new target near the center (simulating where a face would be)
            targetXRef.current = 50 + (Math.random() * 8 - 4);
            targetYRef.current = 45 + (Math.random() * 8 - 4);
          }
          // Smoothly interpolate current tracking point towards target
          currentXRef.current += (targetXRef.current - currentXRef.current) * 0.1;
          currentYRef.current += (targetYRef.current - currentYRef.current) * 0.1;

        } catch (e) {
          console.error("Frame analysis error:", e);
        }
      }, 100); // 10 frames per second is plenty for stress tracking

      intervalRef.current = interval;
    } catch (err) {
      console.error('Error starting webcam analysis:', err);
    }
  }, [stopTracking]);

  // Method to draw the gorgeous cybernetic scanning overlay onto a canvas
  const drawFaceOverlay = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas for redrawing transparency
    ctx.clearRect(0, 0, width, height);

    // Map percentage-based tracking point to canvas coordinates
    const fx = (currentXRef.current / 100) * width;
    const fy = (currentYRef.current / 100) * height;

    // Outer scanning bounding box width/height
    const boxW = width * 0.55;
    const boxH = height * 0.65;
    const left = fx - boxW / 2;
    const top = fy - boxH / 2;

    ctx.save();

    // 1. Draw target reticle corners
    ctx.strokeStyle = '#00F0FF'; // Cyber cyan
    ctx.lineWidth = 2.5;
    const cornerLength = 20;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(left, top + cornerLength);
    ctx.lineTo(left, top);
    ctx.lineTo(left + cornerLength, top);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(left + boxW, top + cornerLength);
    ctx.lineTo(left + boxW, top);
    ctx.lineTo(left + boxW - cornerLength, top);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(left, top + boxH - cornerLength);
    ctx.lineTo(left, top + boxH);
    ctx.lineTo(left + cornerLength, top + boxH);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(left + boxW, top + boxH - cornerLength);
    ctx.lineTo(left + boxW, top + boxH);
    ctx.lineTo(left + boxW - cornerLength, top + boxH);
    ctx.stroke();

    // 2. Draw face contour oval outline (cyber style)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(fx, fy, boxW * 0.4, boxH * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Draw horizontal scanning bar moving up and down
    const scanProgress = (Math.sin(meshAnimationRef.current * 1.5) + 1) / 2; // 0 to 1
    const scanY = top + scanProgress * boxH;
    
    // Draw scanning glow
    const grad = ctx.createLinearGradient(0, scanY - 10, 0, scanY + 2);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    grad.addColorStop(0.5, 'rgba(0, 240, 255, 0.4)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(left + 2, scanY - 12, boxW - 4, 14);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(left + 2, scanY);
    ctx.lineTo(left + boxW - 2, scanY);
    ctx.stroke();

    // 4. Draw simulated biometric nodes (dots with connecting lines)
    const nodes = [
      { dx: -boxW * 0.2, dy: -boxH * 0.2, label: 'EYE_L' },
      { dx: boxW * 0.2, dy: -boxH * 0.2, label: 'EYE_R' },
      { dx: 0, dy: -boxH * 0.05, label: 'NOSE' },
      { dx: 0, dy: boxH * 0.18, label: 'MOUTH' },
      { dx: -boxW * 0.3, dy: boxH * 0.05, label: 'JAW_L' },
      { dx: boxW * 0.3, dy: boxH * 0.05, label: 'JAW_R' },
    ];

    ctx.fillStyle = '#00F0FF';
    ctx.font = '7px monospace';
    
    nodes.forEach((node) => {
      const nx = fx + node.dx;
      const ny = fy + node.dy;

      // Draw dot
      ctx.beginPath();
      ctx.arc(nx, ny, 3, 0, Math.PI * 2);
      ctx.fill();

      // Pulse ring around the dot
      const pulseSize = 3 + (Math.sin(meshAnimationRef.current * 4 + node.dx) + 1) * 3;
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.8 - pulseSize / 10})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(nx, ny, pulseSize, 0, Math.PI * 2);
      ctx.stroke();

      // Connect nose to eyes and mouth
      if (node.label === 'NOSE') {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 0.5;
        // left eye
        ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(fx - boxW * 0.2, fy - boxH * 0.2); ctx.stroke();
        // right eye
        ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(fx + boxW * 0.2, fy - boxH * 0.2); ctx.stroke();
        // mouth
        ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(fx, fy + boxH * 0.18); ctx.stroke();
      }

      // Draw coordinate text for some nodes
      if (node.label === 'EYE_L' || node.label === 'JAW_R') {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
        ctx.fillText(`${node.label}: [${Math.round(nx)}, ${Math.round(ny)}]`, nx + 8, ny + 3);
      }
    });

    // 5. Draw status panel overlay
    ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
    ctx.font = '9px Courier New';
    ctx.fillText('FACIAL LOCK: ACTIVE', left + 8, top + 15);
    ctx.fillText(`MOTION DET: ${Math.round(movementIndex)}%`, left + 8, top + 27);

    ctx.restore();
  }, [movementIndex]);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    stream,
    movementIndex,
    fidgetLog,
    startTracking,
    stopTracking,
    drawFaceOverlay,
    videoRef
  };
}
