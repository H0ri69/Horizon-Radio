import React from 'react';
import { LayoutProps, VisualizerMode, TEXT_LABELS } from '../../types';
import { Visualizer } from '../Visualizer';
import { Playlist } from '../Playlist';

// CONFIGURATION: IMAGE SOURCES
// Using hosted images provided by the user
const SQUAT_IMG_URL = "https://myimgs.org/storage/images/14744/anime_girl_squat.jpg";
const STAND_IMG_URL = "https://myimgs.org/storage/images/14745/anime_girl_stand.jpg";

export const AnimeLayout: React.FC<LayoutProps> = (props) => {
  const { 
      currentSong, isPlaying, isDjTalking, isLiveActive, isRadioPending, callerInfo, currentTime, duration, volume,
      playlist, analyser, settings, visMode, nextTransitionMode,
      onTogglePlay, onSetVolume, onMenuClick, onSetVisMode, onShuffle,
      onRequestClick, onCallClick, onManualEndCall, onFileUpload, onPlay, onRemove, onReorder, onSeek
  } = props;

  const t = TEXT_LABELS[settings.language];

  // Theme logic for dynamic colors
  const getThemeColors = () => {
    switch(settings.palette) {
        case 'PASTEL': return { 
            bgGrad: 'from-purple-100 via-white to-teal-100', 
            textMain: 'text-purple-600', 
            textAccent: 'text-teal-500', 
            button: 'bg-purple-500 hover:bg-purple-400', 
            progress: 'bg-teal-400', 
            border: 'border-purple-200' 
        };
        case 'MIDNIGHT': return { 
            bgGrad: 'from-indigo-900 via-gray-900 to-blue-900', 
            textMain: 'text-indigo-300', 
            textAccent: 'text-blue-400', 
            button: 'bg-indigo-600 hover:bg-indigo-500', 
            progress: 'bg-blue-500', 
            border: 'border-indigo-800' 
        };
        case 'GOLD': return { 
            bgGrad: 'from-yellow-50 via-white to-orange-50', 
            textMain: 'text-yellow-800', 
            textAccent: 'text-orange-600', 
            button: 'bg-orange-500 hover:bg-orange-400', 
            progress: 'bg-yellow-500', 
            border: 'border-yellow-200' 
        };
        default: return { 
            bgGrad: 'from-pink-100 via-white to-blue-100', 
            textMain: 'text-gray-800', 
            textAccent: 'text-pink-500', 
            button: 'bg-pink-500 hover:bg-pink-400', 
            progress: 'bg-pink-400', 
            border: 'border-pink-100' 
        }; // NEON/Default
    }
  };

  const theme = getThemeColors();

  return (
    <div className={`flex flex-col h-full w-full relative overflow-hidden font-rounded ${settings.palette === 'MIDNIGHT' ? 'text-white' : 'text-gray-800'}`}>
      
      {/* Dynamic Anime Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGrad} z-0`}></div>
      
      {/* Floating Elements (Decorations) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className={`absolute top-10 left-[10%] text-6xl ${theme.textAccent} animate-bounce-slight opacity-50`}>♥</div>
         <div className="absolute top-40 right-[20%] text-4xl text-blue-300 animate-pulse opacity-50">★</div>
         <div className="absolute bottom-20 left-[15%] text-5xl text-purple-300 animate-float opacity-50">♪</div>
      </div>
      
      {/* Character 1: Squatting */}
      <div className="absolute bottom-24 left-4 md:left-16 z-10 transition-transform hover:scale-110 duration-500 origin-bottom-left -rotate-3 md:pointer-events-auto">
           <div 
             className="bg-white p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15)] transform rotate-2 rounded-sm group relative"
             title="Mascot"
           >
               <img 
                 src={SQUAT_IMG_URL} 
                 onError={(e) => { 
                    console.warn("Squat image failed to load, falling back to avatar.");
                    e.currentTarget.src = 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&clothing=blazerAndShirt&eyes=happy&mouth=smile&top=longHair&hairColor=ff99cc&skinColor=f8d25c'; 
                 }}
                 alt="Mascot Squat" 
                 className="w-40 md:w-56 h-auto object-cover rounded-sm min-h-[150px] bg-gray-100"
               />
               <div className="text-center font-handwriting text-gray-400 text-xs mt-2">vibing...</div>
           </div>
      </div>
      
      {/* Character 2: Standing */}
      <div className="absolute bottom-24 right-4 md:right-96 z-10 transition-transform hover:scale-110 duration-500 origin-bottom-right rotate-3 md:pointer-events-auto">
           <div 
             className="bg-white p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15)] transform -rotate-1 rounded-sm group relative"
             title="Mascot"
           >
               <img 
                 src={STAND_IMG_URL} 
                 onError={(e) => { 
                    console.warn("Stand image failed to load, falling back to avatar.");
                    e.currentTarget.src = 'https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka&clothing=collarAndSweater&eyes=wink&mouth=twinkle&top=bigHair&hairColor=2c1b18&hatColor=blue01'; 
                 }}
                 alt="Mascot Stand" 
                 className="w-40 md:w-56 h-auto object-cover rounded-sm min-h-[150px] bg-gray-100"
               />
               <div className="text-center font-handwriting text-gray-400 text-xs mt-2">ready!</div>
           </div>
      </div>

      {/* Top Bar (Transparent) */}
      <div className="relative z-50 flex justify-between p-4">
          <button onClick={onMenuClick} className={`bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md ${theme.textAccent} font-bold hover:scale-110 transition-transform text-xs md:text-base`}>
             ← {t.menu}
          </button>
          
          <div className="flex gap-2">
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md text-blue-500 font-bold hidden md:block">
                {props.statusText}
            </div>
            {/* Transition Badge */}
            <div className={`px-4 py-2 rounded-full shadow-md font-bold text-xs md:text-base hidden md:block ${nextTransitionMode === 'DJ' ? 'bg-pink-100 text-pink-500' : 'bg-blue-100 text-blue-500'}`}>
                Next: {nextTransitionMode === 'DJ' ? `${t.voice} 🎤` : `${t.autoMix} 🔀`}
            </div>
          </div>

          <div className="flex gap-2">
            <button 
                onClick={onCallClick}
                disabled={isLiveActive}
                className={`px-4 py-2 rounded-full shadow-md font-bold transition-all animate-bounce-slight text-xs md:text-base ${
                    isRadioPending 
                    ? 'bg-yellow-300 text-yellow-800' 
                    : 'bg-green-400 text-white hover:bg-green-300 hover:scale-110'
                }`}
            >
                {isRadioPending ? t.dialing : `${t.callIn} ☎`}
            </button>
            <button onClick={onRequestClick} className={`${theme.button} text-white px-4 md:px-6 py-2 rounded-full shadow-md font-bold hover:scale-110 transition-all animate-bounce-slight text-xs md:text-base`}>
                {t.req} ♪
            </button>
          </div>
      </div>

      {/* Center Stage (Visualizer) */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-0">
          <div className={`
             w-[280px] h-[280px] md:w-[450px] md:h-[450px] 
             backdrop-blur-sm rounded-full border-4 border-white shadow-[0_0_50px_rgba(255,255,255,0.8)] overflow-hidden mb-8 md:mb-0
             transition-all duration-500 relative
             ${isLiveActive ? 'bg-green-100 animate-pulse' : 'bg-white/30'}
          `}>
             {isLiveActive ? (
                 <div className="w-full h-full flex flex-col items-center justify-center text-green-600">
                     <div className="text-6xl mb-4 animate-bounce">📱</div>
                     <h3 className="text-3xl font-bold font-display">{t.onAir}</h3>
                     <p className="text-xl font-handwriting mt-2">with {callerInfo?.name || 'Guest'}</p>
                 </div>
             ) : (
                 <Visualizer analyser={analyser} isPlaying={isPlaying || isDjTalking} mode={visMode} isDjTalking={isDjTalking} palette={settings.palette} />
             )}
          </div>
          
          {/* Visualizer Controls */}
          <div className="flex gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-full shadow-sm mt-4">
             {(['BARS', 'WAVE', 'ORB', 'PIXEL'] as VisualizerMode[]).map(m => (
                 <button 
                    key={m} 
                    onClick={() => onSetVisMode(m)}
                    className={`px-3 py-1 text-xs rounded-full font-bold transition-all ${visMode === m ? `${theme.button} text-white shadow-md` : 'text-gray-500 hover:bg-white/50'}`}
                 >
                    {m}
                 </button>
             ))}
          </div>
      </div>

      {/* Bottom Control Deck (Dialogue Box Style) */}
      <div className="relative z-50 p-4 md:p-8 flex justify-center">
          <div className={`w-full max-w-4xl bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border-4 border-white flex flex-col gap-4 animate-slide-up ${settings.palette === 'MIDNIGHT' ? 'text-gray-800' : ''}`}>
              
              {/* Song Info & Time */}
              <div className={`flex items-center gap-4 border-b-2 ${theme.border} pb-2`}>
                 {/* Album Cover */}
                 {currentSong?.cover && (
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg shadow-md overflow-hidden shrink-0 hidden md:block">
                        <img src={currentSong.cover} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                 )}
                 <div className="flex-1 flex justify-between items-end">
                     <div>
                        <h2 className={`text-2xl md:text-3xl font-bold ${theme.textMain}`}>{isLiveActive ? t.live : (currentSong?.title || "Waiting for track...")}</h2>
                        <p className={`font-bold ${theme.textAccent}`}>{isLiveActive ? 'Taking calls...' : (currentSong?.artist || "Unknown Idol")}</p>
                     </div>
                     <div className="text-gray-400 font-mono text-sm">
                        {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                     </div>
                 </div>
              </div>

              {/* Progress Bar (Pink) */}
              <div className="h-4 bg-gray-100 rounded-full relative overflow-hidden group">
                 <div className={`absolute top-0 left-0 h-full ${theme.progress} rounded-full transition-all duration-100`} style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                 {!isLiveActive && <input type="range" min="0" max={duration || 100} value={currentTime} onChange={(e) => onSeek(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    {/* Shuffle Button */}
                    {!isLiveActive && (
                        <button 
                            onClick={onShuffle} 
                            className={`w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-gray-200 text-gray-500`}
                            title="Shuffle Queue"
                        >
                           <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
                        </button>
                    )}

                    {isLiveActive ? (
                        <button onClick={onManualEndCall} className="w-14 h-14 bg-red-500 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95 animate-pulse">
                           <span className="font-bold text-xs">{t.end}</span>
                        </button>
                    ) : (
                        <button onClick={onTogglePlay} className={`w-14 h-14 ${theme.button} rounded-full text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95`}>
                        {isPlaying ? (
                            <div className="flex gap-1 h-5"><div className="w-1.5 bg-white rounded-full"></div><div className="w-1.5 bg-white rounded-full"></div></div>
                        ) : (
                            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                        </button>
                    )}
                    
                    <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
                       <span className="text-xs text-gray-500 font-bold">VOL</span>
                       <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => onSetVolume(parseFloat(e.target.value))} className="w-24 accent-pink-400 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"/>
                    </div>
                 </div>

                 {/* Playlist Toggle / File Upload */}
                 <div className="flex gap-2">
                    <button onClick={() => document.getElementById('anime-upload')?.click()} className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl font-bold hover:bg-blue-200 transition-colors">
                       + {t.requestSong}
                       <input id="anime-upload" type="file" multiple accept="audio/*" className="hidden" onChange={(e) => onFileUpload(e.target.files!)} />
                    </button>
                 </div>
              </div>
          </div>
      </div>

      {/* Floating Playlist Sidebar */}
      <div className="absolute top-20 right-4 w-64 md:w-80 bottom-32 z-40 animate-pop-in hidden md:block">
          <Playlist songs={playlist} currentSongId={currentSong?.id || null} onPlay={onPlay} onRemove={onRemove} onReorder={onReorder} variant="ANIME" />
      </div>

    </div>
  );
};