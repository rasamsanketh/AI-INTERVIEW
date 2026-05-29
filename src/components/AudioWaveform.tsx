import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  analyser: AnalyserNode | null;
  height?: number;
  color?: string;
  glowColor?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  analyser,
  height = 80,
  color = '#00f0ff',
  glowColor = 'rgba(0, 240, 255, 0.5)'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing to container width
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = (rect?.width || 300) * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = '100%';
      canvas.style.height = `${height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Render loop
    const draw = () => {
      if (!ctx || !canvas) return;

      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      // Draw background (slight alpha for trailing motion blur effect)
      ctx.fillStyle = 'rgba(7, 11, 21, 0.2)';
      ctx.fillRect(0, 0, w, h);

      if (analyser) {
        // Frequency domain data visualizer
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // We only want to visualize up to vocal frequencies (first ~40% of bins)
        const activeBins = Math.round(bufferLength * 0.4);
        const barWidth = (w / activeBins) * 1.5;
        let barHeight;
        let x = 0;

        ctx.shadowBlur = 8;
        ctx.shadowColor = glowColor;

        for (let i = 0; i < activeBins; i++) {
          // Normalize value
          const val = dataArray[i] / 255.0;
          barHeight = val * (h * 0.85);

          // Create a gradient for each bar
          const gradient = ctx.createLinearGradient(x, h, x, h - barHeight);
          gradient.addColorStop(0, 'rgba(0, 240, 255, 0.1)');
          gradient.addColorStop(0.5, color);
          gradient.addColorStop(1, '#ffffff');

          ctx.fillStyle = gradient;
          
          // Draw rounded bars
          ctx.beginPath();
          ctx.roundRect(x, h - barHeight, barWidth - 2, barHeight, [2, 2, 0, 0]);
          ctx.fill();

          x += barWidth;
        }
        
        ctx.shadowBlur = 0; // Reset
      } else {
        // Draw flat baseline with minor random noise when not connected/silent
        ctx.shadowBlur = 4;
        ctx.shadowColor = glowColor;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);

        const sliceWidth = w / 50;
        let x = 0;

        for (let i = 0; i < 50; i++) {
          const noise = (Math.random() - 0.5) * 1.5;
          ctx.lineTo(x, h / 2 + noise);
          x += sliceWidth;
        }

        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, height, color, glowColor]);

  return (
    <div style={{ width: '100%', overflow: 'hidden', borderRadius: '8px' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};
