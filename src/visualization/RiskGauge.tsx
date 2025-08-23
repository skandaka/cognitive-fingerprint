import React from 'react';

interface RiskGaugeProps {
  risk: number; // 0-1
  confidence: number; // 0-1
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ risk, confidence }) => {
  const percent = Math.round(risk * 100);
  const angle = (percent / 100) * 180;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-56 h-28">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <defs>
            <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3DDC97" />
              <stop offset="50%" stopColor="#FFC857" />
              <stop offset="100%" stopColor="#FF6B6B" />
            </linearGradient>
          </defs>
          <path d="M10 50 A40 40 0 0 1 90 50" stroke="url(#riskGradient)" strokeWidth="10" fill="none" strokeLinecap="round" />
          <line x1="50" y1="50" x2={50 + 35 * Math.cos(Math.PI - (angle * Math.PI / 180))} y2={50 - 35 * Math.sin(Math.PI - (angle * Math.PI / 180))} stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <text x="50" y="47" textAnchor="middle" fontSize="10" fill="#aaa">Risk</text>
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-lg font-semibold">{percent}%</span>
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-1">Confidence: {(confidence * 100).toFixed(1)}%</div>
    </div>
  );
};
