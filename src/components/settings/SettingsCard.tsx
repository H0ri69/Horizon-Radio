import React from "react";
import { cn } from "@sglara/cn";

interface SettingsCardProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  labelClassName?: string;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ selected, onClick, label, subLabel, icon, className = "", labelClassName = "" }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-6 rounded-2xl border transition-all duration-300 group overflow-hidden text-left",
        selected
          ? "bg-indigo-500/20 border-indigo-500/50 text-white ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/10"
          : "bg-white/5 border-white/5 text-white/60 hover:text-white hover:border-white/10 hover:bg-white/10",
        className
      )}
    >
      <div className="flex justify-between items-start w-full">
        <div className="relative z-10 leading-tight w-full">
          <div className={cn("font-bold text-[14px] mb-1", labelClassName)}>{label}</div>
          {subLabel && <div className="text-xs opacity-50 font-mono uppercase tracking-widest">{subLabel}</div>}
        </div>
        {icon && <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>}
      </div>
    </button>
  );
};
