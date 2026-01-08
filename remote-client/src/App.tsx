import { useState, useEffect, useRef, FormEvent } from 'react';
import { Mic, Phone, Wifi, WifiOff, Loader2, Radio } from 'lucide-react';
import { useAudioRecorder } from './useAudioRecorder';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// Use local relay for dev, change for prod
const RELAY_URL = import.meta.env.VITE_RELAY_URL || 'ws://localhost:8080';

type ConnectionStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

function App() {
  const [hostId, setHostId] = useState('');
  const [callerName, setCallerName] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('IDLE');
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  // Audio Handling
  const { isRecording, startRecording, stopRecording } = useAudioRecorder((pcmBlob) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(pcmBlob);
    }
  });

  const connect = (e: FormEvent) => {
    e.preventDefault();
    if (!hostId || !callerName) return;

    setStatus('CONNECTING');
    const socket = new WebSocket(RELAY_URL);

    socket.onopen = () => {
      console.log('Connected to Relay');
      socket.send(JSON.stringify({ 
        type: 'CONNECT_GUEST', 
        targetHostId: hostId,
        callerName
      }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'STATUS' && msg.status === 'CONNECTED') {
          setStatus('CONNECTED');
        } else if (msg.type === 'ERROR') {
          alert(`Error: ${msg.message}`);
          setStatus('IDLE');
          socket.close();
        } else if (msg.type === 'GUEST_DISCONNECTED') {
          // Host disconnect?
          socket.close();
        }
      } catch (e) {
        console.error(e);
      }
    };

    socket.onclose = () => {
      setStatus('IDLE');
      setWs(null);
      stopRecording();
    };

    setWs(socket);
  };

  const handleDisconnect = () => {
    ws?.close();
  };

  const handleToggleTalk = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-surfaceHighlight border border-white/5 mb-6 shadow-2xl relative">
              <Radio className="w-8 h-8 text-primary" />
              {status === 'CONNECTED' && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
                </span>
              )}
           </div>
           <h1 className="text-3xl font-black tracking-tighter mb-2">Hori-s Remote</h1>
           <p className="text-white/40 font-medium">Connect to your Studio Extension</p>
        </div>

        <AnimatePresence mode="wait">
          
          {/* LOGIN FORM */}
          {status !== 'CONNECTED' && (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key="login"
              onSubmit={connect}
              className="glass p-8 rounded-[2rem] space-y-6"
            >
              <div className="space-y-4">
                <div>
                   <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2 ml-2">Display Name</label>
                   <input 
                      type="text" 
                      placeholder="e.g. Matej"
                      className="w-full bg-surfaceHighlight border border-white/5 rounded-2xl p-4 text-lg font-bold placeholder-white/10 focus:outline-none focus:border-primary/50 transition-colors"
                      value={callerName}
                      onChange={e => setCallerName(e.target.value)}
                      disabled={status === 'CONNECTING'}
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2 ml-2">Studio Code</label>
                   <input 
                      type="text" 
                      placeholder="e.g. 8x2-A9d"
                      className="w-full bg-surfaceHighlight border border-white/5 rounded-2xl p-4 text-lg font-mono text-primary placeholder-white/10 focus:outline-none focus:border-primary/50 transition-colors tracking-widest uppercase"
                      value={hostId}
                      onChange={e => setHostId(e.target.value)}
                      disabled={status === 'CONNECTING'}
                   />
                </div>
              </div>

              <button 
                type="submit"
                disabled={status === 'CONNECTING' || !hostId || !callerName}
                className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
              >
                {status === 'CONNECTING' ? <Loader2 className="animate-spin" /> : <Wifi className="w-5 h-5"/>}
                {status === 'CONNECTING' ? 'Connecting...' : 'Connect to Studio'}
              </button>
            </motion.form>
          )}

          {/* ACTIVE CALL UI */}
          {status === 'CONNECTED' && (
            <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               key="active"
               className="glass p-8 rounded-[2rem] flex flex-col items-center text-center py-12"
            >
               <div className="mb-8">
                  <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Connected to</div>
                  <div className="text-2xl font-black tracking-tight">{hostId}</div>
               </div>

               <button
                  onClick={handleToggleTalk}
                  className={clsx(
                    "w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-300 relative mb-12",
                    isRecording 
                      ? "bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.4)] scale-110" 
                      : "bg-surfaceHighlight border-2 border-white/10 hover:border-primary/50 active:scale-95"
                  )}
               >
                  <Mic className={clsx("w-12 h-12 mb-3 transition-colors", isRecording ? "text-white" : "text-white/50")} />
                  <span className={clsx("text-xs font-black uppercase tracking-widest", isRecording ? "text-white" : "text-white/30")}>
                    {isRecording ? 'ON AIR' : 'TAP TO TALK'}
                  </span>

                  {isRecording && (
                     <span className="absolute inset-0 rounded-full border border-white/20 animate-ping" />
                  )}
               </button>

               <button 
                  onClick={handleDisconnect}
                  className="px-8 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-500 border border-transparent hover:border-red-500/30 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
               >
                  <WifiOff className="w-4 h-4" />
                  Disconnect
               </button>
            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  )
}

export default App
