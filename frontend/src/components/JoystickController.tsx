import React, { useRef, useState, useCallback, useEffect } from "react";

interface JoystickControllerProps {
  onMove: (x: number, y: number) => void;
  disabled?: boolean;
}

// Configuration for High-Safety Stair Climbing
const MAX_RADIUS = 80;
const DEADZONE = 0.50;       
const MAGNET_ZONE = 0.30; 

export const JoystickController = ({ onMove, disabled }: JoystickControllerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const processMovement = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || disabled) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dX = clientX - centerX;
    const dY = clientY - centerY;
    const magnitude = Math.sqrt(dX * dX + dY * dY);

    if (magnitude < MAX_RADIUS * DEADZONE) {
      setPosition({ x: 0, y: 0 });
      onMove(0, 0);
      return;
    }

    let finalX = dX;
    let finalY = dY;
    
    const angle = Math.atan2(dY, dX);
    const absAngleFromVertical = Math.abs(Math.abs(angle) - Math.PI / 2);
    const absAngleFromHorizontal = Math.min(Math.abs(angle), Math.abs(Math.abs(angle) - Math.PI));

    // Magnetic Rail Logic (Snaps to 0 drift for safety)
    if (absAngleFromVertical < MAGNET_ZONE) {
      finalX = 0; 
    } else if (absAngleFromHorizontal < MAGNET_ZONE) {
      finalY = 0; 
    }

    const currentMag = Math.sqrt(finalX * finalX + finalY * finalY);
    if (currentMag > MAX_RADIUS) {
      const ratio = MAX_RADIUS / currentMag;
      finalX *= ratio;
      finalY *= ratio;
    }

    setPosition({ x: finalX, y: finalY });
    
    onMove(
      parseFloat((finalX / MAX_RADIUS).toFixed(2)), 
      parseFloat((-finalY / MAX_RADIUS).toFixed(2))
    );
  }, [disabled, onMove]);

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled) return;
    setIsDragging(true);
    processMovement(clientX, clientY);
  };

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    if (!isDragging) return;
    const moveHandler = (e: MouseEvent) => processMovement(e.clientX, e.clientY);
    const touchHandler = (e: TouchEvent) => {
      if (e.touches.length > 0) processMovement(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', touchHandler, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', touchHandler);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, processMovement, handleEnd]);

  const turn = Math.round((position.x / MAX_RADIUS) * 100);
  const speed = Math.round((-position.y / MAX_RADIUS) * 100);

  return (
    <div className="flex flex-col items-center gap-8 p-10 bg-[#0f1113] rounded-[3.5rem] border-4 border-slate-800 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.9)] select-none w-fit">
      
      <div className="text-center">
        <h2 className="text-2xl font-black text-white tracking-[0.3em] italic uppercase">Totebot</h2>
      </div>

      <div className="relative">
        {/* Directional Glow labels */}
        <div className={`absolute -top-10 left-1/2 -translate-x-1/2 font-black text-xs tracking-widest transition-all duration-300 ${speed > 10 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'text-slate-700'}`}>FORWARD</div>
        <div className={`absolute -bottom-10 left-1/2 -translate-x-1/2 font-black text-xs tracking-widest transition-all duration-300 ${speed < -10 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'text-slate-700'}`}>REVERSE</div>

        <div
          ref={containerRef}
          onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX, e.clientY); }}
          onTouchStart={(e) => { e.preventDefault(); handleStart(e.touches[0].clientX, e.touches[0].clientY); }}
          className="relative w-64 h-64 rounded-full border-[14px] border-[#1e2124] bg-[#050607] shadow-[inset_0_15px_50px_rgba(0,0,0,1)] flex items-center justify-center touch-none"
        >
          {/* SYMMETRICAL HIGH-BRIGHTNESS RAIL GUIDES */}
          <div className="absolute inset-0 p-1 pointer-events-none overflow-hidden rounded-full">
            {/* The Vertical Rail */}
            <div className="absolute left-1/2 top-4 bottom-4 w-[2.5px] bg-white -translate-x-1/2 shadow-[0_0_15px_white]" />
            {/* The Horizontal Rail (Now matching vertical brightness) */}
            <div className="absolute top-1/2 left-4 right-4 h-[2.5px] bg-white -translate-y-1/2 shadow-[0_0_15px_white]" />
          </div>

          {/* Neutral Center Zone Ring */}
          <div className="absolute w-14 h-14 rounded-full border border-white/10 bg-white/[0.03]" />

          {/* The Control Stick */}
          <div
            className={`
              absolute w-20 h-20 rounded-full
              bg-gradient-to-tr from-slate-400 via-slate-100 to-white
              border-4 border-slate-500 shadow-2xl flex items-center justify-center
              ${isDragging ? 'scale-105 brightness-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'transition-transform duration-200'}
            `}
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          >
            <div className="w-12 h-12 rounded-full bg-slate-200 shadow-inner border border-slate-300/50" />
          </div>
        </div>
      </div>

      {/* FIXED TELEMETRY SECTION */}
      <div className="grid grid-cols-2 gap-4 w-full pt-4">
        <div className="flex flex-col items-center justify-center w-36 p-4 bg-black/60 rounded-2xl border border-white/5 shadow-inner">
          <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Steering</span>
          <span className={`text-4xl font-mono font-black tabular-nums transition-colors duration-300 ${turn !== 0 ? 'text-cyan-400' : 'text-slate-800'}`}>
            {turn}%
          </span>
        </div>
        
        <div className="flex flex-col items-center justify-center w-36 p-4 bg-black/60 rounded-2xl border border-white/5 shadow-inner">
          <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Power</span>
          <span className={`text-4xl font-mono font-black tabular-nums transition-colors duration-300 ${speed !== 0 ? 'text-emerald-400' : 'text-slate-800'}`}>
            {speed}%
          </span>
        </div>
      </div>

      <p className="text-[9px] text-slate-600 font-mono uppercase text-center opacity-40 leading-relaxed tracking-widest">
        Enhanced Centerline Lock<br/>High Stability Stair Logic
      </p>
    </div>
  );
};