import { useRef, useState, useCallback, useEffect } from "react";

interface TrackSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const TrackSlider = ({ label, value, onChange, disabled }: TrackSliderProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateValue = useCallback((clientY: number) => {
    if (!sliderRef.current || disabled) return 0;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = 1 - (clientY - rect.top) / rect.height;
    return Math.max(-100, Math.min(100, (percentage - 0.5) * 200));
  }, [disabled]);

  const handleStart = useCallback((clientY: number) => {
    if (disabled) return;
    setIsDragging(true);
    onChange(calculateValue(clientY));
  }, [calculateValue, onChange, disabled]);

  const handleMove = useCallback((clientY: number) => {
    if (!isDragging || disabled) return;
    onChange(calculateValue(clientY));
  }, [isDragging, calculateValue, onChange, disabled]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    onChange(0);
  }, [onChange]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientY);
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

  // Calculate fill position (center is 50%, positive goes up, negative goes down)
  const fillPercent = Math.abs(value) / 2;
  const isPositive = value >= 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
        {label}
      </span>

      {/* Slider Track */}
      <div
        ref={sliderRef}
        onMouseDown={(e) => {
          e.preventDefault();
          handleStart(e.clientY);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          handleStart(e.touches[0].clientY);
        }}
        className={`
          relative w-16 h-48 rounded-lg
          bg-muted border border-border
          cursor-pointer select-none touch-none
          overflow-hidden
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="absolute w-full h-px bg-border/50"
            style={{ top: `${(i + 1) * 10}%` }}
          />
        ))}

        {/* Center line (zero point) */}
        <div className="absolute w-full h-0.5 bg-border top-1/2 -translate-y-1/2" />

        {/* Fill indicator */}
        <div
          className="absolute left-1 right-1 bg-primary/80 rounded transition-all duration-75"
          style={{
            height: `${fillPercent}%`,
            top: isPositive ? `${50 - fillPercent}%` : '50%',
          }}
        />

        {/* Thumb indicator */}
        <div
          className="absolute left-0 right-0 h-1 bg-primary rounded transition-all duration-75"
          style={{
            top: `${50 - (value / 2)}%`,
          }}
        />
      </div>

      {/* Value display */}
      <div className={`text-xl font-mono font-bold ${value !== 0 ? 'text-primary' : 'text-muted-foreground'}`}>
        {Math.round(value)}%
      </div>
      <span className={`text-xs font-mono uppercase ${value !== 0 ? 'text-primary' : 'text-destructive'}`}>
        {value !== 0 ? (value > 0 ? 'FWD' : 'REV') : 'STOP'}
      </span>
    </div>
  );
};

interface TrackMotorsProps {
  leftValue: number;
  rightValue: number;
  onLeftChange: (value: number) => void;
  onRightChange: (value: number) => void;
  disabled?: boolean;
}

export const TrackMotors = ({
  leftValue,
  rightValue,
  onLeftChange,
  onRightChange,
  disabled,
}: TrackMotorsProps) => {
  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xl font-semibold text-foreground">Track Motors</h2>

      <div className="flex gap-12">
        <TrackSlider
          label="Left Track"
          value={leftValue}
          onChange={onLeftChange}
          disabled={disabled}
        />
        <TrackSlider
          label="Right Track"
          value={rightValue}
          onChange={onRightChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
};
