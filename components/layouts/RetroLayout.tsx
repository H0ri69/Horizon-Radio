import React from 'react';
import { LayoutProps, VisualizerMode, TEXT_LABELS } from '../../types';
import { Visualizer } from '../Visualizer';
import { Playlist } from '../Playlist';

export const RetroLayout: React.FC<LayoutProps> = (props) => {
  const { 
      currentSong, isPlaying, isLiveActive, isRadioPending, callerInfo, currentTime, duration, volume,
      playlist, analyser, settings, visMode, nextTransitionMode,
      onTogglePlay, onSetVolume, onMenuClick, onSetVisMode, onShuffle,
      onRequestClick, onCallClick, onManualEndCall, onFileUpload, onPlay, onRemove, onReorder, onSeek
  } = props;

  const t = TEXT_LABELS[settings.language];

  // Determine colors based on Palette
  const getRetroColor = () => {
      switch(settings.palette) {
          case 'PASTEL': return 'text-cyan-400';
          case 'MIDNIGHT': return 'text-blue-500';
          case 'GOLD': return 'text-yellow-500'; // Amber
          default: return 'text-green-500'; // Classic
      }
  };
  const themeColor = getRetroColor();

  return (
    <div className={`flex items-center justify-center h-full w-full bg-[#1a1a1a] p-4 font-pixel ${themeColor} overflow-hidden relative`}>
      
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:20px_20px]"></div>

      {/* Main Stack Container (The Rack) */}
      <div className="w-full max-w-2xl flex flex-col gap-4 relative z-10">
         
         {/* Unit 1: Visualizer Screen */}
         <div className="bg-black border-4 border-gray-600 rounded-sm shadow-2xl relative overflow-hidden">
             <div className="bg-gray-800 px-2 py-1 flex justify-between items-center text-[10px] text-gray-300 border-b border-gray-700">
                <div className="flex gap-4">
                    <span>VISUAL_OUTPUT_TERM_1</span>
                    {/* Visualizer Mode Switch (ASCII Style) */}
                    <div className="flex gap-1 ml-4 text-[8px]">
                        {(['BARS', 'WAVE', 'ORB', 'PIXEL'] as VisualizerMode[]).map(m => (
                            <button 
                                key={m} 
                                onClick={() => onSetVisMode(m)}
                                className={`px-1 ${visMode === m ? 'bg-gray-300 text-black' : 'hover:text-white'}`}
                            >
                                [{m.substring(0,3)}]
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={onMenuClick} className="text-red-500 hover:bg-gray-700 px-2">[{t.menu}]</button>
             </div>
             <div className="h-48 relative">
                {isLiveActive ? (
                    <div className="absolute inset-0 bg-green-900/20 flex flex-col items-center justify-center animate-pulse">
                        <div className="text-4xl">☎</div>
                        <div className={`mt-2 ${themeColor}`}>INCOMING TRANSMISSION</div>
                        <div className={`text-xs mt-1 opacity-70`}>SOURCE: {callerInfo?.name.toUpperCase()}</div>
                    </div>
                ) : (
                    <Visualizer analyser={analyser} isPlaying={isPlaying} mode={visMode} palette={settings.palette} />
                )}
                
                {/* Album Cover Overlay (Retro Style) */}
                {!isLiveActive && currentSong?.cover && (
                    <div className="absolute bottom-2 left-2 w-16 h-16 border border-gray-500 opacity-60 mix-blend-screen pointer-events-none grayscale contrast-125">
                        <img src={currentSong.cover} alt="Cover" className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
                    </div>
                )}

                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-50"></div>
                
                <div className="flex flex-col absolute top-2 right-2 items-end">
                    <div className={`text-xs ${isLiveActive ? 'text-red-500 animate-flash' : `${themeColor} animate-pulse`}`}>
                        {isLiveActive ? 'LIVE FEED ●' : 'REC ●'}
                    </div>
                    {/* Retro Next Mode Indicator */}
                    {!isLiveActive && (
                        <div className="text-[8px] bg-gray-800 text-gray-400 px-1 mt-1 border border-gray-600">
                             NEXT: {nextTransitionMode === 'DJ' ? t.voice : 'FADE'}
                        </div>
                    )}
                </div>
             </div>
         </div>

         {/* Unit 2: Control Deck */}
         <div className="bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-gray-600 p-1 shadow-xl">
             <div className="border-2 border-gray-400 p-4 flex flex-col gap-4 bg-[#dcdcdc]">
                {/* LCD Screen */}
                <div className="bg-[#485346] border-inset border-4 border-[#333] p-2 font-mono text-black shadow-inner h-16 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 opacity-10 bg-repeat bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')]"></div>
                   <span className="relative z-10 text-sm tracking-widest animate-scan">
                      {isLiveActive 
                        ? `>> ${t.onAir}: ${callerInfo?.name.toUpperCase()}` 
                        : (currentSong ? `>> ${currentSong.title.toUpperCase()}` : "NO_DISC_LOADED")}
                   </span>
                </div>

                <div className="flex items-center gap-4 justify-between">
                   {/* Physical Buttons */}
                   <div className="flex gap-2">
                      {isLiveActive ? (
                         <button onClick={onManualEndCall} className="w-12 h-12 bg-red-600 border-b-4 border-r-4 border-red-800 active:border-0 active:translate-y-1 transition-all flex items-center justify-center text-white font-bold text-[10px] shadow-lg">
                            {t.end}
                         </button>
                      ) : (
                        <button onClick={onTogglePlay} className="w-12 h-12 bg-gradient-to-b from-gray-200 to-gray-400 border-b-4 border-r-4 border-gray-600 active:border-0 active:translate-y-1 transition-all flex items-center justify-center text-black">
                             {isPlaying ? '||' : '►'}
                        </button>
                      )}
                      
                      {/* Shuffle Button */}
                      {!isLiveActive && (
                        <button onClick={onShuffle} className={`w-12 h-12 border-b-4 border-r-4 active:border-0 active:translate-y-1 transition-all flex items-center justify-center text-black text-[10px] bg-gradient-to-b from-gray-200 to-gray-400 border-gray-600`}>
                           RND
                        </button>
                      )}

                      <button onClick={onCallClick} disabled={isLiveActive} className={`w-12 h-12 border-b-4 border-r-4 active:border-0 active:translate-y-1 transition-all flex items-center justify-center text-black text-[10px] ${isRadioPending ? 'bg-yellow-400 border-yellow-600 animate-pulse' : 'bg-gradient-to-b from-gray-200 to-gray-400 border-gray-600'}`}>
                         {isRadioPending ? '...' : t.call}
                      </button>

                      <button onClick={onRequestClick} className="w-12 h-12 bg-gradient-to-b from-gray-200 to-gray-400 border-b-4 border-r-4 border-gray-600 active:border-0 active:translate-y-1 transition-all flex items-center justify-center text-black text-[10px]">
                         {t.req}
                      </button>
                   </div>
                   
                   {/* Volume Slider */}
                   <div className="flex flex-col flex-1 mx-4 gap-1">
                      <div className="flex justify-between text-[8px] text-gray-600 font-bold">
                         <span>MIN</span><span>VOL</span><span>MAX</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.05" value={volume} 
                        onChange={(e) => onSetVolume(parseFloat(e.target.value))} 
                        className="w-full h-2 bg-black appearance-none border-b border-white"
                      />
                   </div>
                </div>
                
                {/* Time Scrubber */}
                <input type="range" min="0" max={duration || 100} value={currentTime} onChange={(e) => onSeek(Number(e.target.value))} disabled={isLiveActive} className="w-full accent-black h-4 bg-gray-400" />
             </div>
         </div>

         {/* Unit 3: Playlist (The Cartridge Slot) */}
         <div className="bg-[#0000AA] border-4 border-gray-500 shadow-2xl p-1 h-64 flex flex-col">
             <div className="bg-white text-[#0000AA] px-2 py-1 text-xs text-center mb-1">
                A:\MUSIC_DIR\
             </div>
             <div className="flex-1 overflow-y-auto relative border border-white">
                 <Playlist songs={playlist} currentSongId={currentSong?.id || null} onPlay={onPlay} onRemove={onRemove} onReorder={onReorder} variant="RETRO" />
             </div>
             <div className="bg-gray-300 text-black text-[8px] px-2 py-1 mt-1 flex justify-between">
                <span>F1: HELP</span>
                <button onClick={() => document.getElementById('retro-upload')?.click()} className="hover:bg-blue-500 hover:text-white px-1">
                   F5: LOAD
                   <input id="retro-upload" type="file" multiple accept="audio/*" className="hidden" onChange={(e) => onFileUpload(e.target.files!)} />
                </button>
             </div>
         </div>

      </div>

    </div>
  );
};