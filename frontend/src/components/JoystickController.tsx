import { useRef, useState, useCallback, useEffect } from "react";

interface JoystickControllerProps {
  onMove: (x: number, y: number) => void;
  disabled?: boolean;
}

export const JoystickController = ({ onMove, disabled }: JoystickControllerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const maxRadius = 100; // Maximum distance from center
  const handleRadius = 24; // Size of the handle

  const calculatePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || disabled) return { x: 0, y: 0 };

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;

    // Calculate distance from center
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Constrain to circle
    if (distance > maxRadius) {
      const angle = Math.atan2(deltaY, deltaX);
      deltaX = Math.cos(angle) * maxRadius;
      deltaY = Math.sin(angle) * maxRadius;
    }

    return { x: deltaX, y: deltaY };
  }, [disabled]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (disabled) return;
    setIsDragging(true);
    const pos = calculatePosition(clientX, clientY);
    setPosition(pos);
    onMove(pos.x / maxRadius, -pos.y / maxRadius); // Invert Y for intuitive up = forward
  }, [calculatePosition, onMove, disabled]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || disabled) return;
    const pos = calculatePosition(clientX, clientY);
    setPosition(pos);
    onMove(pos.x / maxRadius, -pos.y / maxRadius);
  }, [isDragging, calculatePosition, onMove, disabled]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onEnd = () => handleEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Calculate direction indicators
  const turn = Math.round((position.x / maxRadius) * 100);
  const speed = Math.round((-position.y / maxRadius) * 100);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Joystick Title */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isDragging ? 'bg-primary animate-pulse' : 'bg-accent'}`} />
        <h2 className="text-xl font-semibold text-foreground">Arcade Drive</h2>
      </div>

      {/* Direction Labels Container */}
      <div className="relative mt-12 mb-16"> {/* Added margin to give labels breathing room */}
        
        {/* CARDINAL DIRECTIONS (Pushed further out) */}
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-sm font-mono text-muted-foreground font-bold">FWD</span>
        <span className="absolute top-1/2 -left-12 -translate-y-1/2 text-sm font-mono text-muted-foreground font-bold">L</span>
        <span className="absolute top-1/2 -right-12 -translate-y-1/2 text-sm font-mono text-muted-foreground font-bold">R</span>
        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-sm font-mono text-muted-foreground font-bold">REV</span>

        {/* DIAGONAL DIRECTIONS (Pushed further out) */}
        <span className="absolute -top-8 -left-8 text-xs font-mono text-muted-foreground opacity-50">FWD-L</span>
        <span className="absolute -top-8 -right-8 text-xs font-mono text-muted-foreground opacity-50">FWD-R</span>
        <span className="absolute -bottom-8 -left-8 text-xs font-mono text-muted-foreground opacity-50">REV-L</span>
        <span className="absolute -bottom-8 -right-8 text-xs font-mono text-muted-foreground opacity-50">REV-R</span>

        {/* Joystick Circle (Restored to original large size) */}
        <div
          ref={containerRef}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          className={`
            relative w-56 h-56 rounded-full 
            border-2 border-accent
            bg-card/50
            cursor-pointer select-none touch-none
            transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isDragging ? 'border-primary shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)]' : ''}
          `}
        >
          {/* Internal lines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-px h-full bg-border/30" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-px w-full bg-border/30" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-px h-full bg-border/20 rotate-45 origin-center" style={{ height: '141%' }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-px h-full bg-border/20 -rotate-45 origin-center" style={{ height: '141%' }} />
          </div>

          {/* Handle */}
          <div
            className={`
              absolute w-12 h-12 rounded-full
              bg-primary joystick-glow
              transition-all ${isDragging ? 'duration-0' : 'duration-200'}
              pointer-events-none
            `}
            style={{
              left: `calc(50% + ${position.x}px - ${handleRadius}px)`,
              top: `calc(50% + ${position.y}px - ${handleRadius}px)`,
            }}
          />
        </div>
      </div>

      {/* Stats Display */}
      <div className="flex gap-8">
        <div className="bg-card rounded-lg px-6 py-3 card-glow border border-border/50">
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Turn</div>
          <div className={`text-2xl font-mono font-bold ${turn !== 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            {turn > 0 ? '+' : ''}{turn}%
          </div>
        </div>
        <div className="bg-card rounded-lg px-6 py-3 card-glow border border-border/50">
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Speed</div>
          <div className={`text-2xl font-mono font-bold ${speed !== 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            {speed > 0 ? '+' : ''}{speed}%
          </div>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground">Drag to drive</p>
    </div>
  );
};