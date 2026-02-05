import { Power } from "lucide-react";

interface PowerToggleProps {
  isOn: boolean;
  onToggle: () => void;
}

export const PowerToggle = ({ isOn, onToggle }: PowerToggleProps) => {
  return (
    <button
      onClick={onToggle}
      className={`
        relative w-20 h-32 rounded-xl
        border-2 transition-all duration-300
        flex items-center justify-center
        ${isOn 
          ? 'bg-primary/20 border-primary' 
          : 'bg-muted border-border hover:border-muted-foreground'
        }
      `}
    >
      <div
        className={`
          w-12 h-12 rounded-lg
          flex items-center justify-center
          transition-all duration-300
          ${isOn 
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50' 
            : 'bg-secondary text-muted-foreground'
          }
        `}
      >
        <Power className="w-6 h-6" />
      </div>

      {/* Status indicator */}
      <div
        className={`
          absolute bottom-3 w-2 h-2 rounded-full
          transition-all duration-300
          ${isOn ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}
        `}
      />
    </button>
  );
};
