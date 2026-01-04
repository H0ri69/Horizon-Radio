import React, { useState } from 'react';

interface CallModalProps {
  onClose: () => void;
  onSubmit: (name: string, reason: string, file: File | null) => void;
}

export const CallModal: React.FC<CallModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsGenerating(true);
    // Slight delay to show UI state before parent handles async generation
    setTimeout(() => {
        onSubmit(name, reason, file);
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-md border-2 border-cyber-green bg-black shadow-[0_0_50px_rgba(0,255,159,0.2)] relative">
         {/* Title Bar */}
         <div className="bg-cyber-green text-black px-4 py-2 font-display flex justify-between items-center text-sm md:text-base">
            <span>>> INITIATE LINK: STUDIO LINE</span>
            <button onClick={onClose} className="font-bold hover:text-white px-2">X</button>
         </div>

         <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-6 font-mono text-cyber-green text-sm">
            <div className="flex flex-col gap-2">
               <label className="text-xs uppercase tracking-widest opacity-70">Caller Identity (Name)</label>
               <input 
                 type="text" 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="bg-black border border-cyber-green/50 p-2 text-white outline-none focus:border-cyber-green focus:shadow-[0_0_10px_#00ff9f] transition-all"
                 autoFocus
                 required
                 placeholder="e.g. Neo"
              />
            </div>

            <div className="flex flex-col gap-2">
               <label className="text-xs uppercase tracking-widest opacity-70">Topic / Vibe (Optional)</label>
               <input 
                 type="text"
                 value={reason}
                 onChange={(e) => setReason(e.target.value)}
                 className="bg-black border border-cyber-green/50 p-2 text-white outline-none focus:border-cyber-green focus:shadow-[0_0_10px_#00ff9f] transition-all"
                 placeholder="e.g. Loving the retro beats..."
               />
            </div>

            <div className="flex flex-col gap-2">
               <label className="text-xs uppercase tracking-widest opacity-70">Request A Song (Optional)</label>
               <div className="relative group cursor-pointer">
                  <input 
                     type="file" 
                     accept="audio/*" 
                     onChange={(e) => setFile(e.target.files?.[0] || null)} 
                     className="absolute inset-0 opacity-0 z-10 cursor-pointer" 
                  />
                  <div className={`border border-dashed p-3 text-center transition-all ${file ? 'border-cyber-green bg-cyber-green/10' : 'border-gray-600 hover:border-cyber-green text-gray-500'}`}>
                     {file ? (
                        <span className="break-all text-white">{file.name}</span>
                     ) : 'UPLOAD AUDIO FILE'}
                  </div>
               </div>
            </div>

            <div className="bg-cyber-green/10 p-3 text-[10px] border border-cyber-green/30">
               <span className="font-bold">STATUS:</span> Generating Neural Bridge...
               <br/>
               The call will connect automatically when the current track ends. If a song is requested, it will play immediately after the call.
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
               <button type="button" onClick={onClose} className="border border-gray-700 text-gray-500 py-3 hover:bg-gray-900 uppercase text-xs tracking-widest">
                  Cancel
               </button>
               <button 
                  type="submit" 
                  disabled={isGenerating}
                  className="bg-cyber-green text-black py-3 font-bold uppercase text-xs tracking-widest hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center"
               >
                  {isGenerating ? <span className="animate-pulse">CONNECTING...</span> : 'DIAL IN'}
               </button>
            </div>
         </form>
      </div>
    </div>
  );
};