import React, { useState } from 'react';
import { analyzeTrack } from '../services/audioUtils';
import { Song } from '../types';

interface RequestModalProps {
  onClose: () => void;
  onSubmit: (song: Song) => void;
}

export const RequestModal: React.FC<RequestModalProps> = ({ onClose, onSubmit }) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('CRITICAL: NO SOURCE AUDIO');
      return;
    }
    if (!name) {
       setError('ERR: USER ID REQUIRED');
       return;
    }

    setIsAnalyzing(true);
    try {
      const meta = await analyzeTrack(file);
      
      const newSong: Song = {
        id: Math.random().toString(36).substr(2, 9),
        title: meta.title || file.name.replace(/\.[^/.]+$/, ""),
        artist: meta.artist || 'Unknown Artist', 
        file: file,
        duration: meta.duration || 180,
        requestedBy: name,
        requestMessage: message || "Can you play this?",
        cover: meta.cover
      };

      onSubmit(newSong);
      onClose();
    } catch (err) {
      console.error(err);
      setError('ANALYSIS FAILED. CHECK INTEGRITY.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-lg border-2 border-cyber-green bg-black shadow-[0_0_50px_rgba(0,255,159,0.2)] relative">
         {/* Title Bar */}
         <div className="bg-cyber-green text-black px-4 py-2 font-display flex justify-between items-center text-sm md:text-base">
            <span>>> SYSTEM OVERRIDE: REQUEST</span>
            <button onClick={onClose} className="font-bold hover:text-white px-2">X</button>
         </div>

         <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-6 font-mono text-cyber-green text-sm">
            <div className="flex flex-col gap-2">
               <label className="text-xs uppercase tracking-widest opacity-70">Requester ID</label>
               <input 
                 type="text" 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="bg-black border border-cyber-green/50 p-2 text-white outline-none focus:border-cyber-green focus:shadow-[0_0_10px_#00ff9f] transition-all"
                 autoFocus
                 />
            </div>

            <div className="flex flex-col gap-2">
               <label className="text-xs uppercase tracking-widest opacity-70">Message Packet</label>
               <textarea 
                 value={message}
                 onChange={(e) => setMessage(e.target.value)}
                 className="bg-black border border-cyber-green/50 p-2 text-white outline-none focus:border-cyber-green focus:shadow-[0_0_10px_#00ff9f] transition-all h-20 resize-none"
               />
            </div>

            <div className="flex flex-col gap-2">
               <label className="text-xs uppercase tracking-widest opacity-70">Audio Payload</label>
               <div className="relative group cursor-pointer">
                  <input type="file" accept="audio/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                  <div className={`border-2 border-dashed p-4 text-center transition-all ${file ? 'border-cyber-green bg-cyber-green/10' : 'border-gray-600 hover:border-cyber-green text-gray-500'}`}>
                     {file ? (
                        <span className="break-all">{file.name}</span>
                     ) : 'UPLOAD FILE'}
                  </div>
               </div>
            </div>

            {error && (
               <div className="bg-red-900/50 border border-red-500 text-red-500 p-2 text-xs text-center font-bold animate-pulse">
                  {error}
               </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-2">
               <button type="button" onClick={onClose} className="border border-gray-700 text-gray-500 py-3 hover:bg-gray-900 uppercase text-xs tracking-widest">
                  Cancel
               </button>
               <button 
                  type="submit" 
                  disabled={isAnalyzing}
                  className="bg-cyber-green text-black py-3 font-bold uppercase text-xs tracking-widest hover:bg-white transition-colors disabled:opacity-50"
               >
                  {isAnalyzing ? 'UPLOADING...' : 'EXECUTE'}
               </button>
            </div>
         </form>
      </div>
    </div>
  );
};
