import React from 'react';
import { LayoutProps, VisualizerMode, DJStyle, TEXT_LABELS } from '../../types';
import { Visualizer } from '../Visualizer';
import { Playlist } from '../Playlist';

export const CyberLayout: React.FC<LayoutProps> = (props) => {
  const { 
      currentSong, nextSong, isPlaying, isDjTalking, isLiveActive, isRadioPending, 
      statusText, callerInfo, currentTime, duration, volume, visMode, mobileTab,
      playlist, analyser, audioElement, settings, transitionEffect, loadingFile, dragActive, nextTransitionMode,
      onTogglePlay, onSetVisMode, onSetVolume, onShuffle, onMenuClick, 
      onRequestClick, onCallClick, onManualEndCall, onSetMobileTab, onFileUpload, 
      onPlay, onRemove, onReorder, onSeek
  } = props;

  const t = TEXT_LABELS[settings.language];

  const formatTime = (time: number) => {
    if (!time) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full w-full gap-2 md:gap-4 p-2 md:p-4 text-cyber-blue font-mono relative">
      {/* HEADER RACK */}
      <header className="h-14 md:h-16 cyber-border flex items-center justify-between px-4 md:px-6 shrink-0 cyber-corners bg-cyber-dark z-20">
        <div className="flex items-center gap-3 md:gap-4">
           <div className={`w-6 h-6 md:w-8 md:h-8 border-2 ${isLiveActive ? 'border-cyber-green animate-pulse' : 'border-cyber-pink'} rounded-sm flex items-center justify-center`}>
             <div className={`w-3 h-3 md:w-4 md:h-4 ${isLiveActive ? 'bg-cyber-green' : 'bg-cyber-pink'}`}></div>
           </div>
           <div>
             <h1 className="font-display text-lg md:text-2xl tracking-[0.2em] text-white text-shadow-pink">HORIS.FM</h1>
             <div className="text-[8px] md:text-[10px] text-cyber-pink opacity-80 tracking-widest hidden md:block">
                {isLiveActive ? `>> ${t.live} <<` : 'AI NEURAL BROADCAST'}
             </div>
           </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-xs font-tech tracking-wider text-gray-400">
               <div className="flex flex-col items-end">
                  <span className="text-cyber-blue">{t.sysStatus}</span>
                  <span className="text-white">{statusText}</span>
               </div>
               <div className="h-8 w-px bg-gray-700"></div>
               <div className="flex flex-col items-end">
                   <span className="text-cyber-blue">{t.nextOp}</span>
                   <span className={nextTransitionMode === 'DJ' ? 'text-cyber-pink animate-pulse' : 'text-gray-400'}>
                       {nextTransitionMode === 'DJ' ? t.voice : t.autoMix}
                   </span>
               </div>
               <div className="h-8 w-px bg-gray-700"></div>
            </div>

            <button onClick={onMenuClick} className="bg-gray-800 border border-gray-600 px-3 py-1 text-[10px] hover:text-white transition-colors">{t.menu}</button>
            <button onClick={onRequestClick} className="bg-cyber-blue/10 border border-cyber-blue text-cyber-blue px-3 py-1 md:px-6 md:py-2 hover:bg-cyber-blue hover:text-black transition-all font-bold tracking-widest text-[10px] md:text-xs clip-path-slant">{t.req}</button>
        </div>
      </header>

      {/* MAIN RACK */}
      <div className="flex-1 flex gap-4 min-h-0 relative z-10 overflow-hidden">
        
        {/* LEFT COLUMN: VISUALIZER & TRANSPORT */}
        <div className={`
          absolute inset-0 z-10 bg-cyber-black flex flex-col gap-2 md:gap-4 min-w-0 transition-opacity duration-300
          md:static md:flex-1 md:bg-transparent md:opacity-100
          ${mobileTab === 'PLAYER' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none md:pointer-events-auto'}
        `}>
           
           <div className={`flex-1 cyber-border cyber-corners relative flex flex-col overflow-hidden bg-black/40 transition-all duration-300 ${transitionEffect ? 'animate-glitch border-cyber-pink' : ''}`}>
              <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex gap-4 items-center">
                 <div className="text-[8px] md:text-[10px] text-cyber-blue tracking-widest border border-cyber-blue/30 px-2 py-1 bg-black/50">
                   {isLiveActive ? 'VOICE_LINK_ESTABLISHED' : 'VIS_MODULE_V2'}
                 </div>
                 {!isLiveActive && (
                    <div className="flex gap-1">
                    {(['BARS', 'WAVE', 'ORB', 'PIXEL'] as VisualizerMode[]).map(m => (
                        <button key={m} onClick={() => onSetVisMode(m)} className={`text-[8px] md:text-[9px] px-1.5 md:px-2 py-0.5 border transition-all ${visMode === m ? 'bg-cyber-blue text-black border-cyber-blue' : 'border-gray-700 text-gray-500 hover:text-white'}`}>{m}</button>
                    ))}
                    </div>
                 )}
              </div>
              
              <div className="flex-1 relative flex items-center justify-center">
                <div className="absolute inset-0 z-0">
                   {!isLiveActive && <Visualizer analyser={analyser} isPlaying={isPlaying || isDjTalking} mode={visMode} isDjTalking={isDjTalking} />}
                   {isLiveActive && (<div className="w-full h-full flex items-center justify-center"><div className="w-full h-1 bg-cyber-green animate-pulse"></div></div>)}
                </div>
                
                {isLiveActive ? (
                   <div className="relative z-10 w-40 h-40 md:w-64 md:h-64 rounded-full border-4 border-cyber-green shadow-[0_0_50px_#00ff9f] flex items-center justify-center bg-black animate-pulse">
                      <div className="text-center"><div className="text-2xl md:text-4xl animate-bounce">🎙️</div><div className="text-cyber-green font-display mt-2 text-sm md:text-base">{t.onAir}</div><div className="text-[10px] md:text-xs text-white mt-1">{callerInfo ? `With: ${callerInfo.name}` : 'Unknown Caller'}</div></div>
                   </div>
                ) : (
                    currentSong?.cover && (
                    <div className={`relative z-10 w-40 h-40 md:w-64 md:h-64 rounded-full border-4 ${isDjTalking ? 'border-cyber-green animate-pulse' : 'border-cyber-pink'} shadow-[0_0_30px_rgba(5,217,232,0.3)] animate-[spin_10s_linear_infinite] overflow-hidden bg-black`}>
                        <img src={currentSong.cover} alt="Cover" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20"></div>
                    </div>
                    )
                )}
                
                {!isLiveActive && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-20">
                    {currentSong ? (
                        <div className="flex items-end justify-between">
                            <div className="w-full">
                            <div className="flex gap-2 mb-2">
                                {/* REMOVED BPM/KEY SPANS */}
                            </div>
                            <h2 className="text-2xl md:text-4xl lg:text-5xl font-display text-white text-shadow-blue truncate mb-1 w-full">{currentSong.title}</h2>
                            <p className="text-sm md:text-lg text-gray-400 font-mono tracking-widest uppercase">{currentSong.artist}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center pb-4 md:pb-10 opacity-50"><h2 className="text-xl md:text-3xl font-display text-gray-600 animate-pulse">NO_MEDIA_LOADED</h2></div>
                    )}
                    </div>
                )}
              </div>
           </div>

           <div className="h-auto min-h-[160px] md:h-40 cyber-border cyber-corners bg-cyber-panel p-3 md:p-5 flex flex-col md:flex-row gap-4 md:gap-8 items-center justify-between shrink-0">
              <div className="w-full order-1 md:order-2 md:flex-1 flex flex-col gap-2">
                 <div className="flex justify-between text-[10px] md:text-xs font-mono text-cyber-blue/70"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                 <div className="h-4 md:h-8 bg-black border border-gray-800 relative flex items-center px-1 group">
                    <div className="absolute left-0 top-0 bottom-0 bg-cyber-blue/20 w-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                    <input type="range" min="0" max={duration || 100} value={currentTime} onChange={(e) => onSeek(Number(e.target.value))} className="w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="absolute inset-0 flex gap-0.5 pointer-events-none p-0.5 md:p-1">{Array.from({ length: 40 }).map((_, i) => (<div key={i} className={`flex-1 h-full ${i / 40 < currentTime / (duration || 1) ? 'bg-cyber-blue' : 'bg-gray-800'}`}></div>))}</div>
                 </div>
              </div>

              <div className="flex items-center gap-6 order-2 md:order-1">
                 {isLiveActive ? (
                      <button onClick={onManualEndCall} className="w-16 h-16 md:w-20 md:h-20 relative group flex items-center justify-center">
                       <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-ping opacity-50"></div>
                       <div className="w-12 h-12 md:w-16 md:h-16 bg-red-600 rounded-full flex items-center justify-center text-white font-bold hover:bg-red-500 transition-colors shadow-[0_0_20px_red]">{t.end}</div>
                    </button>
                 ) : (
                    <>
                        <button onClick={onShuffle} className={`transition scale-110 md:scale-125 text-gray-600 hover:text-white`} title="Shuffle Queue"><svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg></button>
                        <button onClick={onTogglePlay} className="w-16 h-16 md:w-20 md:h-20 relative group">
                        <div className="absolute inset-0 border-2 border-cyber-pink rounded-full opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-[0_0_20px_rgba(255,42,109,0.2)]"></div>
                        <div className="absolute inset-2 border border-cyber-pink rounded-full flex items-center justify-center text-cyber-pink bg-cyber-pink/5">{isPlaying ? <div className="flex gap-1"><div className="w-2 h-5 md:w-2 md:h-6 bg-current"></div><div className="w-2 h-5 md:w-2 md:h-6 bg-current"></div></div> : <svg className="w-6 h-6 md:w-8 md:h-8 translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}</div>
                        </button>
                    </>
                 )}
              </div>

              <div className="w-full md:w-auto md:min-w-[200px] flex flex-row md:flex-col gap-2 md:gap-3 order-3 md:order-3 justify-between">
                  <div className="flex items-center gap-2 border-gray-700 md:pb-1 flex-1 md:flex-none">
                     <span className="text-[10px] text-gray-500 uppercase tracking-widest hidden md:inline">Master Vol</span>
                     <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => onSetVolume(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 accent-cyber-blue cursor-pointer"/>
                  </div>
                  <div className="flex gap-2 flex-1 md:flex-none justify-end">
                    <button onClick={onCallClick} disabled={isLiveActive} className={`text-[8px] md:text-xs font-bold border px-2 py-1 md:py-2 uppercase tracking-wider transition-all ${isRadioPending ? 'border-cyber-green text-black bg-cyber-green shadow-[0_0_10px_#00ff9f]' : 'border-cyber-green text-cyber-green hover:bg-cyber-green/10'} disabled:opacity-30 whitespace-nowrap`}>{isRadioPending ? 'QUEUED' : t.call}</button>
                  </div>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN: LIBRARY */}
        <div className={`absolute inset-0 z-10 bg-cyber-black flex flex-col gap-4 transition-opacity duration-300 md:static md:w-96 md:bg-transparent md:opacity-100 ${mobileTab === 'LIBRARY' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none md:pointer-events-auto'}`}>
           <div className="h-24 md:h-32 cyber-border border-dashed border-gray-600 hover:border-cyber-green hover:bg-cyber-green/5 cursor-pointer flex flex-col items-center justify-center group transition-all shrink-0" onClick={() => document.getElementById('file-upload')?.click()}>
              <input id="file-upload" type="file" multiple accept="audio/mp3,audio/wav" className="hidden" onChange={(e) => onFileUpload(e.target.files!)} />
              {loadingFile ? <span className="text-cyber-green text-xs font-tech animate-pulse">>> DECODING STREAM...</span> : <><svg className="w-6 h-6 md:w-8 md:h-8 text-gray-600 group-hover:text-cyber-green mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg><span className="text-xs text-gray-500 font-display tracking-widest group-hover:text-white">UPLOAD_MEDIA</span></>}
           </div>
           
           <div className="bg-black/40 border-l-2 border-cyber-purple p-3 shrink-0">
              <div className="text-[10px] text-cyber-purple uppercase tracking-widest mb-1">Queue_Preview</div>
              {nextSong ? (
                <div className="flex justify-between items-start">
                   <div className="truncate text-sm text-gray-300 w-48">{nextSong.title}</div>
                   <div className="flex items-center gap-2">
                      {settings.djStyle !== DJStyle.MINIMAL && (<div className={`w-1.5 h-1.5 rounded-full ${nextSong.introBuffer ? 'bg-cyber-green' : 'bg-red-500 animate-pulse'}`} title="AI Ready"></div>)}
                   </div>
                </div>
              ) : (<span className="text-gray-600 text-xs italic">End of Line</span>)}
           </div>

           <div className="flex-1 cyber-border relative flex flex-col bg-black/60 min-h-0">
              <Playlist songs={playlist} currentSongId={currentSong?.id || null} onRemove={onRemove} variant="CYBER" />
           </div>
        </div>
      </div>
    </div>
  );
};