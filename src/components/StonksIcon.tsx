import React from 'react';
import stonksIconUrl from '/icon.png?url';

interface StonksIconProps {
  className?: string;
  size?: number;
  useImage?: boolean;
}

export const StonksIcon: React.FC<StonksIconProps> = ({ className = '', size = 22, useImage = false }) => {
  if (useImage) {
    return (
      <img
        src={stonksIconUrl}
        alt="Stonks Icon"
        width={size}
        height={size}
        className={`object-contain select-none ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      style={{
        borderRadius: `${Math.max(4, Math.round(size * 0.22))}px`,
        overflow: 'hidden',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      {/* Background dark squircle */}
      <rect width="100" height="100" rx="22" fill="#1C1C1E" />
      <rect width="98" height="98" x="1" y="1" rx="21" fill="url(#bgGrad)" stroke="#3A3A3C" strokeWidth="1.5" />

      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#2A2A2D" />
          <stop offset="100%" stopColor="#121214" />
        </linearGradient>
        <filter id="cyanGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Shaky vertical grid lines (poorly hand-drawn feel) */}
      <path d="M 22 6 C 20.5 32, 23 64, 21.5 94" stroke="rgba(255,255,255,0.12)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 40 7 C 41.5 30, 38.5 62, 40.2 93" stroke="rgba(255,255,255,0.12)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 59 6 C 60.5 34, 57.5 66, 59.2 94" stroke="rgba(255,255,255,0.12)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 78 7 C 76.5 31, 79 63, 77.8 93" stroke="rgba(255,255,255,0.12)" strokeWidth="1.8" strokeLinecap="round" />

      {/* Hand-drawn sketchy white stock trend line */}
      <path
        d="M 6 74 
           L 15 62 
           L 22 66 
           L 31 52 
           L 39 58 
           L 47 38 
           L 52 46 
           L 60 22 
           L 68 36 
           L 75 28 
           L 84 46 
           L 94 20"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Secondary shaky highlight overlay to give crayon/hand-drawn texture */}
      <path
        d="M 6.5 73.5 
           L 15.5 62.5 
           L 21.5 65.5 
           L 30.5 51.5 
           L 39.5 58.5 
           L 46.5 37.5 
           L 52.5 46.5 
           L 59.5 22.5 
           L 67.5 35.5 
           L 75.5 28.5 
           L 83.5 45.5 
           L 93.5 20.5"
        fill="none"
        stroke="#E2E8F0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Hand-drawn vertical cyan cursor line */}
      <path
        d="M 60 6 C 60.8 28, 59.2 58, 60.2 94"
        stroke="#00D9FF"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M 60.3 8 C 59.5 32, 60.5 62, 59.7 92"
        stroke="#7DD3FC"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Hand-drawn messy blue glowing circle over the peak at (60, 22) */}
      <circle cx="60" cy="22" r="9" fill="#0284C7" opacity="0.4" />
      <circle cx="60" cy="22" r="6" fill="#38BDF8" filter="url(#cyanGlow)" />
      
      {/* Hand-drawn scribble ring around node */}
      <path
        d="M 51 22 C 51 16.5, 55 13, 60 13.5 C 65 14, 69 17.5, 68.5 22.5 C 68 27.5, 64 31, 59.5 30.5 C 55 30, 51.5 26.5, 51 22 Z"
        fill="none"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
