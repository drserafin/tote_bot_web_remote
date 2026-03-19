import { Footprints } from "lucide-react";

interface StairModeToggleProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const StairModeToggle = ({ isActive, onToggle, disabled }: StairModeToggleProps) => {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`
        relative w-20 h-32 rounded-xl
        border-2 transition-all duration-300
        flex items-center justify-center
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        ${isActive 
          ? 'bg-orange-500/20 border-orange-500' 
          : 'bg-muted border-border hover:border-muted-foreground'
        }
      `}
    >
      {/* Icon Container - Matches PowerToggle's internal box */}
      <div
        className={`
          w-12 h-12 rounded-lg
          flex items-center justify-center
          transition-all duration-300
          ${isActive 
            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50' 
            : 'bg-secondary text-muted-foreground'
          }
        `}
      >
        <Footprints className="w-6 h-6" />
      </div>

      {/* Status indicator LED - Matches PowerToggle's placement */}
      <div
        className={`
          absolute bottom-3 w-2 h-2 rounded-full
          transition-all duration-300
          ${isActive ? 'bg-orange-500 animate-pulse' : 'bg-muted-foreground'}
        `}
      />
    </button>
  );
};