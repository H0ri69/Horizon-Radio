import React from 'react';
import { AppSettings, AppTheme, ColorPalette, DJStyle, VOICE_PROFILES } from '../types';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdate: (newSettings: Partial<AppSettings>) => void;
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, onUpdate, onClose }) => {
  
  return (
    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-cyber-blue/30 bg-cyber-panel shrink-0">
         <h2 className="text-2xl font-display text-white">SYS.CONFIG</h2>
         <button onClick={onClose} className="bg-cyber-blue/10 text-cyber-blue hover:text-white px-4 py-2 font-bold border border-cyber-blue text-xs tracking-widest">
            SAVE & EXIT
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col gap-12 max-w-4xl mx-auto w-full">
         
         {/* Theme Section */}
         <section>
            <h3 className="text-cyber-pink text-sm font-mono tracking-[0.2em] mb-4 border-b border-gray-800 pb-2">INTERFACE_THEME</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {(['CYBER', 'ANIME', 'RETRO'] as AppTheme[]).map(theme => (
                  <button
                    key={theme}
                    onClick={() => onUpdate({ theme })}
                    className={`h-24 border relative overflow-hidden group transition-all p-4 text-left flex flex-col justify-end
                      ${settings.theme === theme 
                         ? 'border-cyber-blue bg-cyber-blue/5' 
                         : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                      }`}
                  >
                     <span className={`font-display text-xl ${settings.theme === theme ? 'text-white' : 'text-gray-500'}`}>{theme}</span>
                     {theme === 'CYBER' && <div className="absolute top-2 right-2 text-[10px] text-cyber-blue font-mono border border-cyber-blue px-1">DEFAULT</div>}
                  </button>
               ))}
            </div>
         </section>

         {/* Color Palette Section */}
         <section>
            <h3 className="text-cyber-green text-sm font-mono tracking-[0.2em] mb-4 border-b border-gray-800 pb-2">COLOR_MATRIX</h3>
            <div className="flex flex-wrap gap-4">
               {(['NEON', 'PASTEL', 'MIDNIGHT', 'GOLD'] as ColorPalette[]).map(palette => (
                  <button
                    key={palette}
                    onClick={() => onUpdate({ palette })}
                    className={`px-6 py-3 border font-bold text-xs tracking-widest transition-all
                      ${settings.palette === palette 
                         ? 'border-white text-black bg-white shadow-[0_0_15px_white]' 
                         : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                  >
                     {palette}
                  </button>
               ))}
            </div>
         </section>

         {/* DJ Voice Section */}
         <section>
            <h3 className="text-cyber-blue text-sm font-mono tracking-[0.2em] mb-4 border-b border-gray-800 pb-2">NEURAL_VOICE_SYNTHESIS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {VOICE_PROFILES.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => onUpdate({ djVoice: profile.id })}
                    className={`p-4 border text-left transition-all relative
                      ${settings.djVoice === profile.id 
                         ? 'border-cyber-blue bg-cyber-blue/10' 
                         : 'border-gray-800 bg-black hover:border-gray-600'
                      }`}
                  >
                     <div className="flex justify-between items-start mb-2">
                        <span className="font-display text-lg text-white">{profile.name}</span>
                        {settings.djVoice === profile.id && <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse"></div>}
                     </div>
                     <div className="text-xs text-gray-400 font-mono space-y-1">
                        <div>GENDER: <span className="text-gray-300">{profile.gender}</span></div>
                        <div>TONE: <span className="text-gray-300">{profile.tone}</span></div>
                        <div>MODE: <span className="text-gray-300">{profile.emotion}</span></div>
                     </div>
                  </button>
               ))}
            </div>
         </section>

         {/* DJ Frequency Section (New) */}
         <section>
            <h3 className="text-white text-sm font-mono tracking-[0.2em] mb-4 border-b border-gray-800 pb-2">DJ_INTERVENTION_FREQUENCY</h3>
            <div className="bg-gray-900 border border-gray-700 p-6">
               <div className="flex justify-between text-xs font-mono text-gray-400 mb-2">
                  <span>MUSIC ONLY (CROSSFADE)</span>
                  <span>ALWAYS DJ</span>
               </div>
               <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={settings.djFrequency} 
                  onChange={(e) => onUpdate({ djFrequency: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyber-blue"
               />
               <div className="mt-4 text-center">
                  <span className="text-cyber-blue font-display text-xl">{Math.round(settings.djFrequency * 100)}%</span>
                  <p className="text-xs text-gray-500 mt-1">
                     {settings.djFrequency === 0 ? "Transitions will always crossfade (10s) with no voice." : 
                      settings.djFrequency === 1 ? "DJ will speak between every track." :
                      "Probability of DJ voiceover vs seamless crossfade."}
                  </p>
               </div>
            </div>
         </section>

         {/* DJ Style Section */}
         <section>
            <h3 className="text-cyber-pink text-sm font-mono tracking-[0.2em] mb-4 border-b border-gray-800 pb-2">PERSONALITY_ALGORITHM</h3>
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {Object.entries(DJStyle).map(([key, value]) => (
                        <button
                            key={key}
                            onClick={() => onUpdate({ djStyle: value as DJStyle })}
                            className={`px-4 py-2 border text-xs font-bold transition-all
                            ${settings.djStyle === value 
                                ? 'border-cyber-pink text-cyber-pink bg-cyber-pink/10' 
                                : 'border-gray-700 text-gray-500 hover:text-white'
                            }`}
                        >
                            {key}
                        </button>
                    ))}
                </div>
                
                {/* Custom Prompt Input */}
                {settings.djStyle === DJStyle.CUSTOM && (
                    <div className="mt-4 animate-scan">
                        <label className="text-xs text-cyber-pink block mb-2">CUSTOM_INSTRUCTION_SET:</label>
                        <textarea 
                            value={settings.customStylePrompt}
                            onChange={(e) => onUpdate({ customStylePrompt: e.target.value })}
                            className="w-full h-32 bg-black border border-cyber-pink/50 p-4 text-white font-mono text-sm focus:border-cyber-pink outline-none shadow-[0_0_10px_rgba(255,42,109,0.2)]"
                            placeholder="e.g. Speak like a 1920s transatlantic news anchor..."
                        />
                    </div>
                )}
            </div>
         </section>

      </div>
    </div>
  );
};