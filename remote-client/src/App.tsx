import { useState, type FormEvent } from 'react';
import { Mic, Wifi, WifiOff, Loader2, Radio, MessageSquare, Clock } from 'lucide-react';
import { useAudioRecorder } from './useAudioRecorder';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// Use local relay for dev, change for prod
const RELAY_URL = import.meta.env.VITE_RELAY_URL || 'ws://127.0.0.1:8765';
console.log('Using Relay URL:', RELAY_URL);

type ConnectionStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
type AppMode = 'LOGIN' | 'QUEUE' | 'WAITING' | 'ON_AIR';

function App() {
  const [hostId, setHostId] = useState('');
  const [callerName, setCallerName] = useState('');
  const [message, setMessage] = useState(''); // Reason for call
  const [status, setStatus] = useState<ConnectionStatus>('IDLE');
  const [mode, setMode] = useState<AppMode>('LOGIN');
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
          console.log('[Remote] Connected to Host. Joining Queue mode.');
          setStatus('CONNECTED');
          setMode('QUEUE'); // Move to Step 2
        } else if (msg.type === 'ERROR') {
          console.error('[Remote] Connection Error:', msg.message);
          alert(`Error: ${msg.message}`);
          setStatus('IDLE');
          setMode('LOGIN');
          socket.close();
        } else if (msg.type === 'GUEST_DISCONNECTED') {
          console.warn('[Remote] Guest Disconnected message received');
          socket.close();
        } else if (msg.type === 'GO_LIVE') {
          console.log('[Remote] 🟢 RECEIVED GO_LIVE SIGNAL! Going On Air.');
          // Received signal from Host
          setMode('ON_AIR');
          // Optionally auto-start recording? keeping it manual strictly for now to avoid surprises
        }
      } catch (e) {
        console.error(e);
      }
    };

    socket.onclose = (event) => {
      console.log('[Remote] Socket Closed:', event.code, event.reason);
      setStatus('IDLE');
      setMode('LOGIN');
      setWs(null);
      stopRecording();
    };

    setWs(socket);
  };

  const submitQueue = (e: FormEvent) => {
    e.preventDefault();
    if (!ws) return;
    
    console.log('[Remote] Sending CALL_REQUEST:', { name: callerName, message });
    ws.send(JSON.stringify({
      type: 'CALL_REQUEST',
      name: callerName,
      message: message
    }));
    
    setMode('WAITING');
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
           <p className="text-white/40 font-medium">
             {mode === 'LOGIN' && "Connect to your Studio Extension"}
             {mode === 'QUEUE' && "Describe your request"}
             {mode === 'WAITING' && "You are in the queue"}
             {mode === 'ON_AIR' && "Live Broadcast"}
           </p>
        </div>

        <AnimatePresence mode="wait">
          
          {/* STEP 1: LOGIN FORM */}
          {mode === 'LOGIN' && (
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

          {/* STEP 2: QUEUE FORM */}
          {mode === 'QUEUE' && (
             <motion.form
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                key="queue"
                onSubmit={submitQueue}
                className="glass p-8 rounded-[2rem] space-y-6"
             >
                <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2 ml-2">Topic / Message</label>
                      <textarea 
                        placeholder="What do you want to talk about?"
                        className="w-full h-32 bg-surfaceHighlight border border-white/5 rounded-2xl p-4 text-lg placeholder-white/10 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                      />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={!message.trim()}
                  className="w-full py-5 bg-[var(--color-primary)] text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 bg-white"
                >
                   <MessageSquare className="w-5 h-5"/>
                   Join Queue
                </button>
             </motion.form>
          )}

          {/* STEP 3: WAITING */}
          {mode === 'WAITING' && (
            <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               key="waiting"
               className="glass p-8 rounded-[2rem] flex flex-col items-center text-center py-16"
            >
               <div className="w-24 h-24 mb-8 relative">
                   <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                   <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                   <Clock className="absolute inset-0 m-auto w-8 h-8 text-primary" />
               </div>
               
               <h2 className="text-2xl font-bold mb-2">You are in Queue</h2>
               <p className="text-white/50 max-w-xs mx-auto mb-8">
                 The host has received your request. Wait for the notification to go live.
               </p>

               <button 
                  onClick={handleDisconnect}
                  className="px-6 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-500 border border-transparent hover:border-red-500/30 transition-all text-xs font-bold uppercase tracking-widest"
               >
                  Cancel & Disconnect
               </button>
            </motion.div>
          )}

          {/* STEP 4: ON AIR */}
          {mode === 'ON_AIR' && (
            <motion.div
               initial={{ opacity: 0, scale: 1.1 }}
               animate={{ opacity: 1, scale: 1 }}
               key="on_air"
               className="glass p-8 rounded-[2rem] flex flex-col items-center text-center py-12 border-2 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
            >
               <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest mb-4">
                     <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                     Live On Air
                  </div>
                  <div className="text-2xl font-black tracking-tight">{callerName}</div>
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
