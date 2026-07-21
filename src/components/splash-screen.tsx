"use client";

import { useEffect, useState } from "react";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Timings optimized for cinematic tension and zero lag
    const t1 = setTimeout(() => setPhase(1), 100); // Quantum core ignition
    const t2 = setTimeout(() => setPhase(2), 700); // Wide-tracking snap-focus text reveal
    const t3 = setTimeout(() => setPhase(3), 2400); // Instant exposure blowout (Flash)
    const t4 = setTimeout(() => {
      setPhase(4); // Fade out entire wrapper
      setTimeout(onComplete, 500); // 500ms elegant handover to main app
    }, 2600); // Flash exposure stays for 200ms

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black text-white overflow-hidden transition-opacity duration-400 ease-out ${phase === 4 ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Background grain texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-0"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />
      
      {/* Deep Vignette for absolute center focus */}
      <div className="absolute inset-0 pointer-events-none z-1" style={{ background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.9) 100%)' }} />

      {/* Instant Flash Layer (Zero lag pure CSS opacity, replaces heavy scale/blur) */}
      <div 
        className={`absolute inset-0 bg-white z-50 transition-opacity duration-200 ease-in ${phase >= 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
      />

      <style>{`
        .gyro-container {
          position: relative;
          width: 32px;
          height: 32px;
          perspective: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1), transform 1.5s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0;
          transform: scale(0.05) translateY(60px) rotateX(60deg);
        }
        .gyro-container.phase-1 {
          opacity: 1;
          transform: scale(2.2) translateY(0) rotateX(0deg);
        }

        .gyro-core {
          position: absolute;
          width: 3px;
          height: 3px;
          background: #ffffff;
          border-radius: 50%;
          animation: corePulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
        }
        .gyro-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.06);
          border-top: 1px solid rgba(255,255,255,0.8);
          border-right: 1px solid rgba(255,255,255,0.3);
          box-shadow: inset 0 0 10px rgba(255,255,255,0.02),
                      -1px 0 3px rgba(255, 255, 255, 0.2), /* Subtle white blur */
                      1px 0 3px rgba(255, 255, 255, 0.4);  /* Sharp white edge */
        }
        /* Exact timings from chat-view */
        .ring-1 { animation: spin1 1.8s linear infinite; }
        .ring-2 { animation: spin2 2.4s linear infinite; }
        .ring-3 { animation: spin3 3s linear infinite; }

        /* Particle Burst System */
        .particle {
          position: absolute;
          width: 1.5px;
          height: 1.5px;
          background: #fff;
          border-radius: 50%;
          opacity: 0;
          box-shadow: 0 0 4px #fff;
        }
        .gyro-container.phase-1 .p1 { animation: shoot1 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .gyro-container.phase-1 .p2 { animation: shoot2 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .gyro-container.phase-1 .p3 { animation: shoot3 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .gyro-container.phase-1 .p4 { animation: shoot4 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes shoot1 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-40px, -50px) scale(0); opacity: 0; } }
        @keyframes shoot2 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(60px, -30px) scale(0); opacity: 0; } }
        @keyframes shoot3 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-50px, 40px) scale(0); opacity: 0; } }
        @keyframes shoot4 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(45px, 55px) scale(0); opacity: 0; } }

        @keyframes spin1 { 
          0% { transform: rotateX(65deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(65deg) rotateY(0deg) rotateZ(360deg); } 
        }
        @keyframes spin2 { 
          0% { transform: rotateX(0deg) rotateY(65deg) rotateZ(0deg); }
          100% { transform: rotateX(0deg) rotateY(65deg) rotateZ(360deg); } 
        }
        @keyframes spin3 { 
          0% { transform: rotateX(45deg) rotateY(45deg) rotateZ(0deg); }
          100% { transform: rotateX(45deg) rotateY(45deg) rotateZ(360deg); } 
        }
        
        @keyframes corePulse {
          0% { transform: scale(0.5); opacity: 0.3; box-shadow: 0 0 2px rgba(255,255,255,0.1); }
          100% { transform: scale(1.5); opacity: 1; box-shadow: 0 0 15px rgba(255,255,255,1); }
        }

        .lumensky-text {
          font-family: 'Inter', sans-serif;
          font-weight: 300;
          font-size: 22px;
          letter-spacing: 0.5em; /* Fixed wide tracking */
          padding-left: 0.5em; /* Optical centering */
          text-transform: uppercase;
          color: #ffffff;
          opacity: 0;
          transform: translateZ(0) scale(2.0); /* Start scaled up */
          transition: opacity 1.2s ease-out, 
                      transform 1.6s cubic-bezier(0.25, 1.25, 0.3, 1); /* Premium Rebound Curve */
          will-change: transform, opacity;
        }
        .lumensky-text.phase-2 {
          opacity: 1;
          transform: translateZ(0) scale(1);
        }


      `}</style>

      {/* Absolute Centering Wrapper to guarantee perfect alignment */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        
        {/* 3D Gyroscopic Core with Particles */}
        <div className={`gyro-container mb-2 z-20 ${phase >= 1 ? 'phase-1' : ''}`}>
          {/* High Velocity Particles */}
          <div className="particle p1"></div>
          <div className="particle p2"></div>
          <div className="particle p3"></div>
          <div className="particle p4"></div>
          
          <div className="gyro-ring ring-1"></div>
          <div className="gyro-ring ring-2"></div>
          <div className="gyro-ring ring-3"></div>
          <div className="gyro-core"></div>
        </div>

        {/* Cinematic Reveal Text */}
        <div className="lumensky-container mt-6 z-30">
          <div className={`lumensky-text ${phase >= 2 ? 'phase-2' : ''}`}>
            Lumensky
          </div>
        </div>

      </div>
      
    </div>
  );
}
