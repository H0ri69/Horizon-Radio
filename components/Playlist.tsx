import React, { useState } from 'react';
import { AppTheme, Song } from '../types';

interface PlaylistProps {
  songs: Song[];
  currentSongId: string | null;
  onPlay?: (song: Song) => void;
  onRemove: (id: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  variant?: AppTheme;
}

export const Playlist: React.FC<PlaylistProps> = ({ songs, currentSongId, onPlay, onRemove, onReorder, variant = 'CYBER' }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!onReorder) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!onReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!onReorder) return;
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(fromIndex) && fromIndex !== targetIndex) {
        onReorder(fromIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  // Styles based on variant
  const isAnime = variant === 'ANIME';
  const isRetro = variant === 'RETRO';

  // Base Containers
  const containerClass = isAnime 
     ? "bg-white/50 backdrop-blur-md rounded-xl border-2 border-white shadow-lg text-gray-800 font-rounded"
     : isRetro 
        ? "bg-[#0000AA] border-4 border-gray-400 font-pixel text-white shadow-xl"
        : "bg-cyber-panel border-b border-gray-700 font-mono text-sm"; // Cyber default

  const headerClass = isAnime
     ? "bg-pink-100/80 text-pink-600 px-4 py-3 font-bold rounded-t-lg"
     : isRetro
        ? "bg-gray-300 text-black px-2 py-1 uppercase tracking-widest text-xs border-b-2 border-gray-500"
        : "bg-cyber-panel border-b border-gray-700 px-3 py-2 flex justify-between items-center text-[10px] text-cyber-blue uppercase tracking-widest sticky top-0 z-10";

  return (
    <div className={`flex flex-col h-full ${containerClass}`}>
      {/* Header */}
      <div className={headerClass}>
         {isAnime ? "♪ Up Next" : isRetro ? "A:\\PLAYLIST.EXE" : <div className="flex justify-between w-full"><span>Queue_Index</span><span>Actions</span></div>}
      </div>
      
      <div className={`flex-1 overflow-y-auto ${isAnime ? 'p-2 space-y-2' : ''}`}>
        {songs.length === 0 ? (
           <div className={`flex flex-col items-center justify-center h-full opacity-50 space-y-2 ${isRetro ? 'text-white font-pixel' : 'text-gray-600'}`}>
             <div className="text-2xl">{isAnime ? '(>_<)' : '[-]'}</div>
             <div className="text-xs">EMPTY</div>
           </div>
        ) : (
          songs.map((song, i) => {
            const isPlaying = song.id === currentSongId;
            const isDragging = draggedIndex === i;

            // Row Styling
            let rowClass = "flex items-center justify-between group transition-all relative overflow-hidden ";
            // Cursor Logic
            if (onReorder) {
                rowClass += "cursor-move ";
            } else {
                rowClass += "cursor-default ";
            }

            if (isAnime) {
                rowClass += `px-4 py-3 rounded-lg shadow-sm border ${isPlaying ? 'bg-pink-50 border-pink-300 text-pink-600' : 'bg-white/80 border-transparent hover:scale-[1.02]'}`;
            } else if (isRetro) {
                rowClass += `px-2 py-1 font-pixel text-[10px] ${isPlaying ? 'bg-white text-[#0000AA]' : 'text-white hover:bg-[#0000AA] hover:text-yellow-300'}`;
            } else {
                // Cyber
                rowClass += `px-3 py-3 border-b border-gray-800 ${isPlaying ? 'bg-cyber-blue/10 text-cyber-blue' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`;
            }

            return (
              <div 
                key={song.id}
                draggable={!!onReorder}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={() => setDraggedIndex(null)}
                onClick={() => { if (onPlay) onPlay(song); }}
                className={`${rowClass} ${isDragging ? 'opacity-50' : ''}`}
              >
                 {/* Cyber Active Indicator */}
                 {!isAnime && !isRetro && isPlaying && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyber-blue shadow-[0_0_10px_#05d9e8]"></div>}
                 
                 <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-5 flex-shrink-0 ${isRetro ? '' : 'text-[10px] font-bold'} ${isPlaying ? 'animate-pulse' : 'opacity-50'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex flex-col min-w-0">
                       <span className={`truncate ${isAnime ? 'font-bold text-sm' : isRetro ? 'uppercase' : 'font-bold text-xs tracking-wider'} ${!isAnime && isPlaying ? 'text-shadow-blue' : ''}`}>
                         {song.title}
                       </span>
                       <span className={`truncate ${isAnime ? 'text-xs opacity-70' : 'text-[10px] opacity-60 font-tech uppercase'}`}>{song.artist}</span>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-3">
                    {song.requestedBy && (
                        <span className={`text-[8px] px-1 font-bold ${isAnime ? 'bg-yellow-300 text-black rounded-full' : 'bg-cyber-green text-black'}`}>REQ</span>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemove(song.id); }}
                      className={`opacity-0 group-hover:opacity-100 font-bold px-2 ${isAnime ? 'text-red-400' : 'text-gray-600 hover:text-red-500'}`}
                      style={{ cursor: 'pointer' }}
                    >
                      ×
                    </button>
                 </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};