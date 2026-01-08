import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio } from "lucide-react";
import { cn } from "@sglara/cn";

interface SettingsToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({ label, description, enabled, onChange, icon, children }) => {
  return (
    <div className={cn(
      "rounded-3xl border transition-all duration-300 overflow-hidden",
      enabled ? "bg-indigo-500/5 border-indigo-500/20" : "bg-white/5 border-white/5"
    )}>
      <div
        className="p-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => onChange(!enabled)}
      >
        <div className="flex items-center gap-6">
          <div className={`p-4 rounded-2xl border transition-colors ${enabled ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-black/20 border-white/5 text-white/20"}`}>
            {icon || <Radio className="w-6 h-6" />}
          </div>
          <div>
            <div className="font-bold text-xl text-white">{label}</div>
            <div className="text-lg text-white/60 mt-1 font-medium">{description}</div>
          </div>
        </div>
        <div className={`w-14 h-8 rounded-full p-1 transition-colors ${enabled ? "bg-indigo-500" : "bg-white/10"}`}>
          <motion.div 
            layout 
            className="w-6 h-6 rounded-full bg-white shadow-lg" 
            transition={{ type: "spring", stiffness: 500, damping: 30 }} 
          />
        </div>
      </div>

      <AnimatePresence>
        {enabled && children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-8 pb-8 pt-4 border-t border-white/5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SettingsSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (val: number) => string;
}

export const SettingsSlider: React.FC<SettingsSliderProps> = ({ 
  label, description, value, onChange, min = 0, max = 1, step = 0.1, formatValue 
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
      <div className="flex justify-between items-center mb-10">
        <div>
          <div className="text-white font-bold text-lg mb-1">{label}</div>
          <div className="text-white/60 text-base">{description}</div>
        </div>
        <div className="font-mono text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 text-lg font-bold">
          {formatValue ? formatValue(value) : `${Math.round(percentage)}%`}
        </div>
      </div>

      <div className="relative group p-2">
        <div className="absolute inset-x-0 h-1.5 bg-black/40 rounded-full overflow-hidden">
          <motion.div
            layout
            className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            initial={false}
            animate={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range" min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
        />
        <motion.div
          layout
          className="absolute top-1/2 h-6 w-6 bg-white rounded-full shadow-2xl pointer-events-none -translate-y-1/2"
          initial={false}
          animate={{ left: `${percentage}%` }}
          style={{ marginLeft: "-12px" }}
        />
      </div>
    </div>
  );
};

interface SettingsInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const SettingsInput: React.FC<SettingsInputProps> = ({ 
  label, value, onChange, placeholder, type = "text", icon, footer, className = ""
}) => {
  return (
    <div className={cn("bg-white/5 rounded-3xl p-8 border border-white/5", className)}>
      <div className="mb-2">
        <label className="block text-sm font-bold text-white/70 mb-4 ml-1">
          {label}
        </label>
        <div className="relative group">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-indigo-400 transition-colors">
              {icon}
            </div>
          )}
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all",
              icon ? "pl-12" : ""
            )}
          />
        </div>
        {footer}
      </div>
    </div>
  );
};

interface SettingsTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SettingsTextArea: React.FC<SettingsTextAreaProps> = ({ value, onChange, placeholder, className = "" }) => {
  return (
    <div className={cn("bg-white/5 rounded-3xl p-6 border border-white/5", className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
      />
    </div>
  );
};
