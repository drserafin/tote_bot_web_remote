import { AlertTriangle, CheckCircle } from "lucide-react";

interface StairAlertProps {
  isVisible: boolean;
}

export const StairAlert = ({ isVisible }: StairAlertProps) => {
  return (
    <div className={`
      flex items-center gap-3 px-4 py-2 rounded-full border-2 transition-all duration-500
      ${isVisible 
        ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse' 
        : 'bg-white/5 border-white/10 opacity-40'}
    `}>
      {isVisible ? (
        <AlertTriangle className="w-4 h-4 text-red-500" />
      ) : (
        <CheckCircle className="w-4 h-4 text-emerald-500" />
      )}
      
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${isVisible ? 'text-red-500' : 'text-slate-400'}`}>
        {isVisible ? "STAIR DETECTED" : "PATH CLEAR"}
      </span>
    </div>
  );
};