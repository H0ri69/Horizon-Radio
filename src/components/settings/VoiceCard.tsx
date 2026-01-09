import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Play, Square, CheckCircle2 } from "lucide-react";
import { cn } from "@sglara/cn";
import { VOICE_PROFILES } from "../../config";
import type { AppLanguage } from "../../types";

interface VoiceCardProps {
  profile: typeof VOICE_PROFILES[0];
  isSelected: boolean;
  onSelect: () => void;
  playingVoiceId: string | null;
  loadingVoiceId: string | null;
  cachedVoices: Set<string>;
  language: string;
  onTest: (voiceId: string) => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  profile, isSelected, onSelect, playingVoiceId, loadingVoiceId, cachedVoices, language, onTest
}) => {
  const isPlaying = playingVoiceId === profile.id;
  const isLoading = loadingVoiceId === profile.id;
  const isCached = cachedVoices.has(`${profile.id}_${language}`);

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.01, translateY: -2 }}
      className={cn(
        "relative p-6 rounded-2xl transition-all duration-300 border overflow-hidden",
        isSelected
          ? "bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/50 shadow-xl shadow-indigo-500/10"
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-lg"
      )}
    >
      {/* Selectable area */}
      <button
        onClick={onSelect}
        className="w-full text-left"
      >
        <div className="flex justify-between items-center mb-4">
          <span className={`text-xl font-bold transition-colors ${isSelected ? "text-white" : "text-white/60"}`}>
            {profile.personaNames[language as AppLanguage]}
          </span>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {isCached && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-[9px] px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 font-bold uppercase tracking-wider"
                >
                  Cached
                </motion.span>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.tags.map((tag) => (
            <span key={tag} className="bg-black/40 px-3 py-1 rounded-lg border border-white/5 text-[10px] uppercase font-bold tracking-widest text-white/60">
              {tag}
            </span>
          ))}
        </div>
      </button>

      {/* Play/Stop button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={(e) => {
          e.stopPropagation();
          onTest(profile.id);
        }}
        disabled={isLoading || (loadingVoiceId !== null && loadingVoiceId !== profile.id)}
        className={`mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all
          ${isPlaying
            ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30"
            : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          }
          disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Generating...</>
        ) : isPlaying ? (
          <><Square className="w-4 h-4" /> Stop Preview</>
        ) : (
          <><Play className="w-4 h-4" /> Listen Preview</>
        )}
      </motion.button>
    </motion.div>
  );
};
