import React from 'react';
import { AppLanguage, TEXT_LABELS } from '../types';

interface StartScreenProps {
  onStart: () => void;
  onSettings: () => void;
  isPlaying: boolean;
  language: AppLanguage;
  onToggleLanguage: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onSettings, isPlaying, language, onToggleLanguage }) => {
  const t = TEXT_LABELS[language];

  return (
    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-all duration-500">
      
      {/* Hero Title */}
      <div className="text-center mb-12 animate-float">
        <h1 className="text-6xl md:text-8xl font-display text-white text-shadow-blue mb-4">HORIS.FM</h1>
        <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-cyber-pink"></div>
            <p className="text-cyber-pink font-mono tracking-[0.5em] text-sm md:text-base uppercase">Neural Audio Interface</p>
            <div className="h-px w-12 bg-cyber-pink"></div>
        </div>
      </div>

      {/* Button Menu */}
      <div className="flex flex-col gap-6 w-full max-w-md relative z-10">
        
        {/* Listen Button */}
        <button 
          onClick={onStart}
          className="group relative h-16 md:h-20 bg-cyber-panel border border-cyber-green/50 hover:border-cyber-green transition-all overflow-hidden clip-path-slant"
        >
           <div className="absolute inset-0 bg-cyber-green/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
           <div className="absolute inset-0 flex items-center justify-between px-8">
              <span className="text-2xl md:text-3xl font-display text-white group-hover:text-cyber-green transition-colors">
                  {isPlaying ? t.resume : t.listen}
              </span>
              <svg className={`w-8 h-8 text-cyber-green opacity-0 group-hover:opacity-100 transition-opacity ${isPlaying ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
           </div>
        </button>

        {/* Settings Button */}
        <button 
          onClick={onSettings}
          className="group relative h-14 md:h-16 bg-cyber-panel border border-cyber-blue/50 hover:border-cyber-blue transition-all overflow-hidden clip-path-slant"
        >
           <div className="absolute inset-0 bg-cyber-blue/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
           <div className="absolute inset-0 flex items-center justify-between px-8">
              <span className="text-xl md:text-2xl font-display text-gray-300 group-hover:text-cyber-blue transition-colors">{t.settings}</span>
              <svg className="w-6 h-6 text-cyber-blue opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
           </div>
        </button>

        {/* Language Toggle Button */}
        <button 
          className="group relative h-12 md:h-14 bg-black/50 border border-gray-700 hover:border-white transition-all overflow-hidden clip-path-slant"
          onClick={onToggleLanguage}
        >
           <div className="absolute inset-0 bg-white/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
           <div className="absolute inset-0 flex items-center justify-between px-8">
              <span className="text-lg md:text-xl font-display text-gray-500 group-hover:text-white transition-colors">
                  {t.language}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gray-600 group-hover:text-gray-400">
                  {language === 'en' ? '[EN]' : language === 'cs' ? '[CZ]' : '[JP]'}
              </span>
           </div>
        </button>

      </div>
      
      {/* Footer Decoration */}
      <div className="absolute bottom-8 text-center opacity-50 text-[10px] font-mono text-gray-500">
         SYS.VER.2.5.0 // NEURAL_NET_ONLINE
      </div>
    </div>
  );
};