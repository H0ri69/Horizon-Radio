import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@sglara/cn";

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export const SettingsSection: React.FC<SettingsSectionProps> = ({ icon: Icon, title, children, className = "" }) => {
  return (
    <motion.section variants={itemVariants} className={cn(className)}>
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60 mb-8 flex items-center gap-3">
        <Icon className="w-4 h-4 text-indigo-400" /> {title}
      </h2>
      {children}
    </motion.section>
  );
};
