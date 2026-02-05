import { XCircle } from "lucide-react";

interface EmergencyStopProps {
  onStop: () => void;
  isActive: boolean;
}

export const EmergencyStop = ({ onStop, isActive }: EmergencyStopProps) => {
  return (
    <button
      onClick={onStop}
      className={`
        w-full py-4 px-6 rounded-lg
        bg-destructive text-destructive-foreground
        font-semibold text-lg tracking-wide
        flex items-center justify-center gap-3
        transition-all duration-200
        hover:brightness-90 active:scale-[0.98]
        ${isActive ? 'emergency-glow animate-pulse' : ''}
      `}
    >
      <XCircle className="w-6 h-6" />
      EMERGENCY STOP
    </button>
  );
};
