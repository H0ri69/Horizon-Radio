import React from "react";
import { motion } from "framer-motion";
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
  const handleCopyCode = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (subLabel) {
          await navigator.clipboard.writeText(subLabel);
          // Optional: Show simplified toast
      }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, translateY: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative p-6 rounded-2xl border transition-all duration-300 group overflow-hidden text-left w-full",
        selected
          ? "bg-indigo-500/20 border-indigo-500/50 text-white ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/10"
          : "bg-white/5 border-white/5 text-white/60 hover:text-white hover:border-white/10 hover:bg-white/10",
        className
      )}
    >
      <div className="flex justify-between items-start w-full">
        <div className="relative z-10 leading-tight w-full">
          <div className={cn("font-bold text-[14px] mb-1", labelClassName)}>{label}</div>
          {subLabel && (
              <div 
                  className="text-sm opacity-50 font-mono uppercase tracking-widest flex items-center gap-2 hover:opacity-100 transition-opacity"
                  title="Click to copy pairing code"
                  onClick={label === "Host Pairing Code" ? handleCopyCode : undefined}
              >
                  {subLabel}
              </div>
          )}
        </div>
        {icon && (
          <motion.span
            animate={{ scale: selected ? 1.1 : 1, rotate: selected ? [0, -10, 10, 0] : 0 }}
            className="text-2xl transition-transform"
          >
            {icon}
          </motion.span>
        )}
      </div>
    </motion.button>
  );
};
