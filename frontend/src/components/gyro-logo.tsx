"use client";
import React from 'react';

export function GyroLogo({ className = "", size = 24 }: { className?: string; size?: number }) {
  // To keep the exact crispness of the white orbital lines, 
  // we do NOT scale down a large container. Instead, we render natively at the target size
  // so that the 1px/1.5px borders and box-shadows remain fully visible and glowing.
  
  // Create a unique class suffix based on size to prevent CSS collisions if multiple sizes exist
  const id = `gyro-${size}`;

  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 ${className} ${id}`} 
      style={{ width: size, height: size }}
    >
      <style>{`
        .${id} .gyro-container-exact {
          position: relative;
          width: ${size}px;
          height: ${size}px;
          perspective: ${size * 5}px;
          transform-style: preserve-3d;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .${id} .gyro-core-exact {
          position: absolute;
          width: ${Math.max(2, size * 0.1)}px;
          height: ${Math.max(2, size * 0.1)}px;
          background: #ffffff;
          border-radius: 50%;
          animation: corePulseExact 2s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
        }

        .${id} .gyro-ring-exact {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          /* Native 1px borders so they don't get compressed to sub-pixels */
          border: 1px solid rgba(255,255,255,0.06);
          border-top: 1.5px solid rgba(255,255,255,0.9);
          border-right: 1px solid rgba(255,255,255,0.4);
          /* Adjusted shadows for smaller size, keeping the glow sharp */
          box-shadow: inset 0 0 4px rgba(255,255,255,0.05),
                      -1px 0 2px rgba(255, 255, 255, 0.3),
                      1px 0 4px rgba(255, 255, 255, 0.5);
          transform-style: preserve-3d;
        }

        .${id} .ring-exact-1 { animation: spinExact1 1.8s linear infinite; }
        .${id} .ring-exact-2 { animation: spinExact2 2.4s linear infinite; }
        .${id} .ring-exact-3 { animation: spinExact3 3s linear infinite; }

        @keyframes spinExact1 { 
          0% { transform: rotateX(65deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(65deg) rotateY(0deg) rotateZ(360deg); } 
        }
        @keyframes spinExact2 { 
          0% { transform: rotateX(0deg) rotateY(65deg) rotateZ(0deg); }
          100% { transform: rotateX(0deg) rotateY(65deg) rotateZ(360deg); } 
        }
        @keyframes spinExact3 { 
          0% { transform: rotateX(45deg) rotateY(45deg) rotateZ(0deg); }
          100% { transform: rotateX(45deg) rotateY(45deg) rotateZ(360deg); } 
        }
        
        @keyframes corePulseExact {
          0% { transform: scale(0.5); opacity: 0.3; box-shadow: 0 0 2px rgba(255,255,255,0.1); }
          100% { transform: scale(1.5); opacity: 1; box-shadow: 0 0 6px rgba(255,255,255,1); }
        }
      `}</style>

      <div className="gyro-container-exact">
        <div className="gyro-ring-exact ring-exact-1"></div>
        <div className="gyro-ring-exact ring-exact-2"></div>
        <div className="gyro-ring-exact ring-exact-3"></div>
        <div className="gyro-core-exact"></div>
      </div>
    </div>
  );
}
