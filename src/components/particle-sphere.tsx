"use client";

import { useEffect, useRef } from 'react';

export function ParticleSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    
    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const radius = Math.min(width, height) * 0.45;
    const particles: {
      x: number, y: number, z: number, 
      origX: number, origY: number, origZ: number,
      randX: number, randY: number, randZ: number
    }[] = [];

    const rows = 120;
    const cols = 120;
    const sliceAngle = Math.PI * 0.85; 
    
    // Generate base coordinates with random offsets for the "Big Bang" entrance
    const addParticle = (x: number, y: number, z: number) => {
      particles.push({ 
        x, y, z, origX: x, origY: y, origZ: z,
        randX: (Math.random() - 0.5) * 8, // Random explosion spread
        randY: (Math.random() - 0.5) * 8,
        randZ: (Math.random() - 0.5) * 8
      });
    };

    for (let i = 0; i <= rows; i++) {
      const phi = (i / rows) * Math.PI;
      if (phi > sliceAngle) continue;
      for (let j = 0; j < cols; j++) {
        const theta = (j / cols) * Math.PI * 2;
        addParticle(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      }
    }

    const bottomY = Math.cos(sliceAngle);
    const bottomR = Math.sin(sliceAngle);
    for (let i = 0; i < 2000; i++) {
      const r = Math.sqrt(Math.random()) * bottomR;
      const t = Math.random() * Math.PI * 2;
      addParticle(Math.cos(t) * r, bottomY, Math.sin(t) * r);
    }

    // Physics & Interaction State
    let rotationY = 0;
    let rotationX = 0.15;
    let velocity = { x: 0.002, y: 0 };
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };

    // Antigravity Cursor State
    let touchX = width / 2;
    let touchY = height / 2;
    let isHovering = false; // true when mouse is moving or finger is touching
    let swarmStrength = 0; // smoothly animates in and out

    const getCanvasPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (width / rect.width),
        y: (e.clientY - rect.top) * (height / rect.height)
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      isHovering = true;
      const pos = getCanvasPos(e);
      touchX = pos.x;
      touchY = pos.y;
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      isHovering = true;
      const pos = getCanvasPos(e);
      touchX = pos.x;
      touchY = pos.y;
      
      if (isDragging) {
        const deltaX = e.clientX - previousMouse.x;
        const deltaY = e.clientY - previousMouse.y;
        velocity.x = deltaX * 0.003; 
        velocity.y = deltaY * 0.003; 
        previousMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerUp = () => { 
      isDragging = false; 
      // On mobile, finger lifted means no more hovering. On desktop, mouseleave handles it.
      if (window.matchMedia("(hover: none)").matches) {
        isHovering = false;
      }
    };

    const handleMouseLeave = () => {
      isHovering = false;
      isDragging = false;
    };

    // Gyroscope Parallax (Mobile)
    let gyroX = 0;
    let gyroY = 0;
    let currentGyroX = 0;
    let currentGyroY = 0;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        const tiltY = Math.max(-45, Math.min(45, e.gamma));
        const tiltX = Math.max(-45, Math.min(45, e.beta - 40));
        gyroY = (tiltY / 45) * 0.7; 
        gyroX = (tiltX / 45) * 0.7;
      }
    };

    // Use window for move/up to catch fast swipes, but canvas for down/leave
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    const startTime = Date.now();
    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Intro Animation
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / 2500); 
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      // Sphere Rotation Physics
      if (!isDragging) {
        velocity.x *= 0.95;
        velocity.y *= 0.92;
        if (Math.abs(velocity.x) < 0.001) velocity.x += (0.0015 - velocity.x) * 0.05;
        if (Math.abs(velocity.y) < 0.0001) velocity.y *= 0.9;
      }

      rotationY -= velocity.x;
      rotationX -= velocity.y;
      rotationX = Math.max(-0.6, Math.min(0.6, rotationX));

      // Gyro Parallax
      currentGyroX += (gyroX - currentGyroX) * 0.05;
      currentGyroY += (gyroY - currentGyroY) * 0.05;

      // Antigravity Swarm Interpolation
      const targetSwarm = isHovering ? 1.0 : 0.0;
      swarmStrength += (targetSwarm - swarmStrength) * 0.05;

      const finalRotY = rotationY + currentGyroY;
      const finalRotX = rotationX + currentGyroX;
      const cosY = Math.cos(finalRotY);
      const sinY = Math.sin(finalRotY);
      const cosX = Math.cos(finalRotX);
      const sinX = Math.sin(finalRotX);
      const time = Date.now() * 0.0005;

      const project = (p: typeof particles[0]) => {
        const currX = p.origX + p.randX * (1 - easeProgress);
        const currY = p.origY + p.randY * (1 - easeProgress);
        const currZ = p.origZ + p.randZ * (1 - easeProgress);

        let x1 = currX * cosY - currZ * sinY;
        let z1 = currZ * cosY + currX * sinY;
        let y1 = currY * cosX - z1 * sinX;
        let z2 = z1 * cosX + currY * sinX;

        const perspective = radius * 4.5;
        const scale = perspective / (perspective + z2 * radius);
        
        let flowOpacity = 1.0;
        const n1 = Math.sin(p.origX * 3.5 + time) * Math.cos(p.origY * 3.5 + time) * Math.sin(p.origZ * 3.5);
        const n2 = Math.sin(p.origX * 7.0 - time) * Math.cos(p.origY * 7.0 + time) * Math.sin(p.origZ * 7.0);
        const noise = n1 * 0.7 + n2 * 0.3;
        
        flowOpacity = 0.05; 
        if (noise > 0.1) flowOpacity += Math.min(0.85, (noise - 0.1) * 2.5); 
        flowOpacity *= easeProgress;

        let finalX = width / 2 + x1 * radius * scale;
        let finalY = height / 2 - y1 * radius * scale;

        // Antigravity Magnetic Swarm Math
        if (swarmStrength > 0.01) {
           const dx = finalX - touchX;
           const dy = finalY - touchY;
           const dist = Math.sqrt(dx * dx + dy * dy);
           const pullRadius = Math.min(width, height) * 0.6; // Cursor influence area
           
           if (dist < pullRadius) {
             const normalizedDist = dist / pullRadius;
             // Non-linear gravitational pull towards cursor
             const pull = Math.pow(1 - normalizedDist, 3) * swarmStrength;
             
             // Move particle towards cursor
             const pullDist = dist * pull * 0.8; 
             const angle = Math.atan2(dy, dx);
             
             // Add a mesmerizing orbital swirl around the cursor
             const swirl = pull * 2.0; 
             
             finalX -= Math.cos(angle - swirl) * pullDist;
             finalY -= Math.sin(angle - swirl) * pullDist;
             
             // Illuminate particles caught in the gravity field
             flowOpacity = Math.max(flowOpacity, pull * 2.5);
           }
        }

        return { x: finalX, y: finalY, z: z2, scale, flowOpacity };
      };

      const projParticles = particles.map(project);
      
      const drawParticles = (pts: any[]) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        pts.forEach(p => {
          const size = Math.max(0.6, 1.8 * p.scale);
          const zNormalized = (p.z + 1) / 2;
          const depthOpacity = Math.max(0.05, 0.6 - (zNormalized * 0.4));
          
          ctx.globalAlpha = Math.min(1.0, depthOpacity * p.flowOpacity);
          ctx.fillRect(p.x, p.y, size, size);
        });
        ctx.globalAlpha = 1.0;
      };

      drawParticles(projParticles.filter(p => p.z > 0));
      drawParticles(projParticles.filter(p => p.z <= 0));

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] sm:w-[100vw] sm:h-[100vw] max-w-[750px] max-h-[750px] cursor-grab active:cursor-grabbing z-0 mix-blend-screen opacity-90"
      style={{ touchAction: 'none' }}
    />
  );
}
