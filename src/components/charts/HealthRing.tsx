'use client';

import { useEffect, useRef } from 'react';

export function HealthRing({ score }: { score: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 140 * dpr;
    canvas.height = 140 * dpr;
    ctx.scale(dpr, dpr);

    const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

    ctx.clearRect(0, 0, 140, 140);
    ctx.beginPath();
    ctx.arc(70, 70, 56, 0, 2 * Math.PI);
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(70, 70, 56, -Math.PI / 2, -Math.PI / 2 + (score / 100) * 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [score]);

  const color = score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="relative w-[140px] h-[140px] mx-auto mb-4">
      <canvas ref={canvasRef} className="w-[140px] h-[140px]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-extrabold ${color}`}>{score}</span>
        <span className="text-[10px] text-gray-400 mt-0.5">out of 100</span>
      </div>
    </div>
  );
}
