import React, { useEffect, useRef } from 'react';
import { VisualizerMode, ColorPalette } from '../types';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  mode: VisualizerMode;
  isDjTalking?: boolean;
  palette?: ColorPalette; // Added palette prop
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying, mode, isDjTalking, palette = 'NEON' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper to get current CSS var value
  const getCssVar = (name: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback;
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return val || fallback;
  };

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle HiDPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const centerX = width / 2;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;
    
    // Theme Colors (Read from CSS variables which are updated in App.tsx)
    const primaryColor = getCssVar('--accent-primary', '#ff2a6d');
    const secondaryColor = getCssVar('--accent-secondary', '#05d9e8');
    const tertiaryColor = getCssVar('--accent-tertiary', '#00ff9f');

    // Theme Colors Logic
    const getPrimaryColor = (percent: number) => {
        if (isDjTalking) {
            // Use Tertiary for Voice
            return `rgba(${parseInt(tertiaryColor.slice(1, 3), 16)}, ${parseInt(tertiaryColor.slice(3, 5), 16)}, ${parseInt(tertiaryColor.slice(5, 7), 16)}, ${0.5 + percent * 0.5})`; 
        }
        // Standard Music Gradients
        if (percent > 0.8) return primaryColor; 
        if (percent > 0.5) return secondaryColor; 
        return secondaryColor; 
    };

    const getStrokeColor = () => {
        return isDjTalking ? tertiaryColor : secondaryColor;
    };

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      
      ctx.clearRect(0, 0, width, height);

      if (mode === 'WAVE') {
        analyser.getByteTimeDomainData(dataArray);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = getStrokeColor();
        ctx.beginPath();
        
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * centerY;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }
        
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Add glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = getStrokeColor();
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (mode === 'ORB') {
        analyser.getByteFrequencyData(dataArray);
        const radius = Math.min(width, height) / 3; // Larger orb
        const bars = 60;
        const step = Math.floor((bufferLength * 0.6) / bars);

        ctx.translate(centerX, centerY);
        
        // Inner Glow
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 1.5);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(1, isDjTalking ? tertiaryColor : primaryColor);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < bars; i++) {
          const value = dataArray[i * step];
          const percent = value / 255;
          const barHeight = percent * (radius * 1.5);
          
          ctx.rotate((Math.PI * 2) / bars);
          
          // Color based on palette
          ctx.fillStyle = isDjTalking 
             ? tertiaryColor 
             : (percent > 0.6 ? secondaryColor : primaryColor);

          ctx.fillRect(0, radius, 4, barHeight);
          
          // Reflection
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillRect(0, radius + barHeight, 2, 2);
        }
        
        ctx.translate(-centerX, -centerY);

      } else if (mode === 'PIXEL') {
        analyser.getByteFrequencyData(dataArray);
        const cols = 32;
        const rows = 16;
        const cellW = width / cols;
        const cellH = height / rows;
        const step = Math.floor((bufferLength * 0.5) / cols);

        for (let i = 0; i < cols; i++) {
           const value = dataArray[i * step];
           const percent = value / 255;
           const activeRows = Math.floor(percent * rows);

           for(let j = 0; j < rows; j++) {
              // Draw from bottom up
              if (rows - j <= activeRows) {
                 // Simple hue shift is hard with custom colors, so we block fill
                 ctx.fillStyle = isDjTalking ? tertiaryColor : (i % 2 === 0 ? primaryColor : secondaryColor);
                 ctx.fillRect(i * cellW + 1, j * cellH + 1, cellW - 2, cellH - 2);
              } else {
                 ctx.fillStyle = 'rgba(20, 20, 30, 0.5)';
                 ctx.fillRect(i * cellW + 1, j * cellH + 1, cellW - 2, cellH - 2);
              }
           }
        }

      } else {
        // BARS (Default)
        analyser.getByteFrequencyData(dataArray);
        
        // Grid Line
        ctx.beginPath();
        ctx.strokeStyle = secondaryColor;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        const bars = 64; 
        const barWidth = width / bars;
        const usefulBuffer = Math.floor(bufferLength * 0.7);
        const step = Math.floor(usefulBuffer / bars);

        for (let i = 0; i < bars; i++) {
          const dataIndex = Math.floor(i * step);
          const value = dataArray[dataIndex];
          const percent = value / 255;
          const barHeight = percent * (height * 0.8);
          
          const x = i * barWidth;
          const yTop = centerY - (barHeight / 2);
          
          ctx.fillStyle = getPrimaryColor(percent);
          
          if (barHeight > 2) {
             ctx.fillRect(x + 1, yTop, barWidth - 2, barHeight);
             ctx.fillStyle = '#ffffff';
             ctx.fillRect(x + 1, yTop - 2, barWidth - 2, 2);
             ctx.fillRect(x + 1, yTop + barHeight, barWidth - 2, 2);
          }
        }
      }
    };

    if (isPlaying) {
      draw();
    } else {
       // Idle State
       ctx.clearRect(0, 0, width, height);
       
       if (mode === 'ORB') {
          // Pulse center
          const time = Date.now() * 0.002;
          const r = (Math.sin(time) * 10) + 30;
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.strokeStyle = isDjTalking ? tertiaryColor : primaryColor;
          ctx.stroke();
       } else {
          // Flatline
          ctx.beginPath();
          ctx.strokeStyle = isDjTalking ? tertiaryColor : (mode === 'WAVE' ? tertiaryColor : secondaryColor);
          ctx.lineWidth = 1;
          ctx.moveTo(0, centerY);
          ctx.lineTo(width, centerY);
          ctx.stroke();
       }
       
       ctx.font = '10px "Share Tech Mono"';
       ctx.fillStyle = 'rgba(255,255,255,0.5)';
       ctx.fillText(`${mode}_MODE // ${isDjTalking ? 'VOICE_DETECTED' : 'AWAITING_INPUT'}`, 10, 20);
    }

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isPlaying, mode, isDjTalking, palette]); // Re-run when palette changes

  return <canvas ref={canvasRef} className="w-full h-full" />;
};