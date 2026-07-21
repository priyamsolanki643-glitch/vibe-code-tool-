"use client";

import { useRef, useState, ReactNode, MouseEvent } from "react";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}

export function MagneticButton({ children, className = "", strength = 20, onClick }: MagneticButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!buttonRef.current) return;
    
    const { clientX, clientY } = e;
    const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
    
    // Calculate distance from center
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Calculate magnetic pull based on strength
    const moveX = ((clientX - centerX) / (width / 2)) * strength;
    const moveY = ((clientY - centerY) / (height / 2)) * strength;
    
    setPosition({ x: moveX, y: moveY });
  };

  const handleMouseEnter = () => setIsHovered(true);
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    // Smoothly spring back to center
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={buttonRef}
      className={`relative inline-block ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${isHovered ? 1.05 : 1})`,
        transition: isHovered 
          ? "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)" 
          : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
        willChange: "transform"
      }}
    >
      {children}
    </div>
  );
}
