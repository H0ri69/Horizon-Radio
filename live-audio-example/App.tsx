import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { Song, DJStyle, DJVoice, VisualizerMode, AppSettings, LayoutProps, AppLanguage } from './types';
import { analyzeTrack } from './services/audioUtils';
import { generateDJIntro, generateCallBridging } from './services/geminiService';
import { decodeAudio, decodeAudioData, createPcmBlob, downsampleTo16k } from './services/liveAudioUtils';
import { saveSongToDB, loadSongsFromDB, deleteSongFromDB } from './services/storageService';
import { RequestModal } from './components/RequestModal';
import { CallModal } from './components/CallModal';
import { StartScreen } from './components/StartScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { CyberLayout } from './components/layouts/CyberLayout';
import { AnimeLayout } from './components/layouts/AnimeLayout';
import { RetroLayout } from './components/layouts/RetroLayout';

// Generate unique IDs for new library items
const generateQueue = (songs: Song[]): Song[] => {
  return [...songs]
    .sort(() => Math.random() - 0.5)
    .map(s => ({
      ...s,
      id: Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36),
      // Clean state
      introBuffer: undefined,
      introSourceId: undefined,
      introVoice: undefined,
      introStyle: undefined,
      introCustomPrompt: undefined,
      requestedBy: undefined,
      requestMessage: undefined
    }));
};

// Visual Transition Component
const VisualTransition: React.FC<{ active: boolean; theme: string }> = ({ active, theme }) => {
  if (!active) return null;
  
  // Theme-specific animations
  if (theme === 'ANIME') {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-pink-100/50 animate-anime-bloom mix-blend-screen backdrop-blur-sm"></div>
        <div className="absolute inset-0 flex items-center justify-center">
             <div className="text-6xl md:text-8xl text-white animate-pop-in drop-shadow-[0_0_20px_rgba(255,192,203,1)]">✨</div>
        </div>
      </div>
    );
  }

  if (theme === 'RETRO') {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
         <div className="absolute inset-0 bg-white/10 animate-retro-flash mix-blend-difference"></div>
      </div>
    );
  }

  // Default Cyber Theme
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
      {/* Wipe Effect */}
      <div className={`absolute inset-0 bg-white/20 animate-cyber-wipe mix-blend-overlay`}></div>
      <div className={`absolute inset-y-0 w-2 bg-cyber-secondary animate-cyber-wipe shadow-[0_0_20px_currentColor]`}></div>
      <div className="absolute inset-0 bg-black/10 animate-pulse"></div>
    </div>
  );
};

const App: React.FC = () => {
  // --- APP NAVIGATION & SETTINGS ---
  const [currentScreen, setCurrentScreen] = useState<'START' | 'PLAYER' | 'SETTINGS'>('START');
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'CYBER',
    palette: 'NEON',
    djVoice: 'Charon', // Default to the Deep/Pro male voice
    djStyle: DJStyle.STANDARD,
    customStylePrompt: '',
    djFrequency: 0.8, // 80% chance of DJ
    language: 'en'
  });

  // --- AUDIO STATE ---
  const [library, setLibrary] = useState<Song[]>([]);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [nextSong, setNextSong] = useState<Song | null>(null);
  
  // Playback
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [djVolume, setDjVolume] = useState(1.0); 
  const [statusText, setStatusText] = useState('SYSTEM READY');
  
  // Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [djMode, setDjMode] = useState(true);
  const [visMode, setVisMode] = useState<VisualizerMode>('BARS');
  
  // Live Radio State
  const [isRadioPending, setIsRadioPending] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [callerInfo, setCallerInfo] = useState<{name: string, reason: string} | null>(null);
  const [callBuffers, setCallBuffers] = useState<{intro: ArrayBuffer | null, outro: ArrayBuffer | null}>({ intro: null, outro: null });
  
  // Mobile UI State
  const [mobileTab, setMobileTab] = useState<'PLAYER' | 'LIBRARY'>('PLAYER');

  // Logic
  const [hasStarted, setHasStarted] = useState(false);
  const generatingRef = useRef<Set<string>>(new Set());
  const pendingNextSongRef = useRef<Song | null>(null); 
  const [isCrossfading, setIsCrossfading] = useState(false);
  const transitionDecisionMadeRef = useRef<boolean>(false);
  const isDjSequenceActiveRef = useRef<boolean>(false); // Flag to block handleSongEnd during DJ mixing
  
  // PREDICTION LOGIC
  const [nextTransitionMode, setNextTransitionMode] = useState<'DJ' | 'XFADE'>('DJ');
  const transitionRollRef = useRef(Math.random());
  
  // UI & Animations
  const [dragActive, setDragActive] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [isDjTalking, setIsDjTalking] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [transitionEffect, setTransitionEffect] = useState(false);

  // Audio Engine
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeAudioRef = useRef<HTMLAudioElement | null>(null); // For overlapping playback
  const djAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const crossfadeSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const djSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const liveInputContextRef = useRef<AudioContext | null>(null);
  const liveOutputContextRef = useRef<AudioContext | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveSessionRef = useRef<any>(null); 
  const liveNextStartTimeRef = useRef<number>(0);
  const liveSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const liveSilenceIntervalRef = useRef<any>(null);

  const hasApiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY;

  // --- INITIALIZATION ---
  
  // Load Songs from DB on mount
  useEffect(() => {
    const initStorage = async () => {
        try {
            const savedSongs = await loadSongsFromDB();
            if (savedSongs.length > 0) {
                setLibrary(savedSongs);
                setPlaylist(savedSongs);
                setStatusText(`DB: LOADED ${savedSongs.length} TRACKS`);
            }
        } catch (e) {
            console.error("Failed to load songs from DB", e);
            setStatusText("DB: ERROR LOADING DATA");
        }
    };
    initStorage();
  }, []);

  // --- THEME & COLOR LOGIC ---
  useEffect(() => {
    const root = document.documentElement;
    switch (settings.palette) {
      case 'NEON':
        root.style.setProperty('--accent-primary', '#ff2a6d');
        root.style.setProperty('--accent-secondary', '#05d9e8');
        root.style.setProperty('--accent-tertiary', '#00ff9f');
        break;
      case 'PASTEL':
        root.style.setProperty('--accent-primary', '#ffb7b2');
        root.style.setProperty('--accent-secondary', '#a2e1db');
        root.style.setProperty('--accent-tertiary', '#e2f0cb');
        break;
      case 'MIDNIGHT':
        root.style.setProperty('--accent-primary', '#7c4dff');
        root.style.setProperty('--accent-secondary', '#448aff');
        root.style.setProperty('--accent-tertiary', '#69f0ae');
        break;
      case 'GOLD':
        root.style.setProperty('--accent-primary', '#ffd700');
        root.style.setProperty('--accent-secondary', '#c0c0c0');
        root.style.setProperty('--accent-tertiary', '#ffffff');
        break;
      default:
        // Fallback to NEON
        root.style.setProperty('--accent-primary', '#ff2a6d');
        root.style.setProperty('--accent-secondary', '#05d9e8');
        root.style.setProperty('--accent-tertiary', '#00ff9f');
    }
  }, [settings.palette]);


  // --- AUDIO & LOGIC ---
  
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new Ctx();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048; 
      analyserRef.current.smoothingTimeConstant = 0.85;
      
      // Main Music Player
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
        audioElementRef.current.crossOrigin = "anonymous";
        audioElementRef.current.volume = volume;
        // Event listeners are attached in handleTimeUpdate logic now
        audioElementRef.current.onerror = () => {
            setStatusText('ERR: MEDIA CORRUPTED');
            setIsPlaying(false);
        };
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioElementRef.current);
        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }

      // Crossfade (Secondary) Music Player
      if (!crossfadeAudioRef.current) {
        crossfadeAudioRef.current = new Audio();
        crossfadeAudioRef.current.crossOrigin = "anonymous";
        crossfadeSourceNodeRef.current = audioContextRef.current.createMediaElementSource(crossfadeAudioRef.current);
        crossfadeSourceNodeRef.current.connect(analyserRef.current);
      }

      // DJ Voice Player
      if (!djAudioElementRef.current) {
        djAudioElementRef.current = new Audio();
        djAudioElementRef.current.volume = djVolume;
        // Handler set dynamically
        djSourceNodeRef.current = audioContextRef.current.createMediaElementSource(djAudioElementRef.current);
        djSourceNodeRef.current.connect(analyserRef.current);
      }
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [volume, djVolume]);

  // Volume helper
  const fadeAudio = (audio: HTMLAudioElement, startVol: number, endVol: number, duration: number, onComplete?: () => void) => {
      const steps = 50;
      const stepTime = duration / steps;
      const volStep = (endVol - startVol) / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
          currentStep++;
          let newVol = startVol + (volStep * currentStep);
          newVol = Math.max(0, Math.min(1, newVol)); // Clamp
          // Scale by master volume if needed, but for now we assume start/end are relative to 0-1
          // Actually, we should respect the master `volume` prop.
          // Let's assume startVol/endVol are passed pre-calculated against master volume.
          audio.volume = newVol;

          if (currentStep >= steps) {
              clearInterval(timer);
              if (onComplete) onComplete();
          }
      }, stepTime);
      return timer;
  };

  useEffect(() => { 
      // Only update volume if NOT currently crossfading or mixing
      if (!isCrossfading && !isDjTalking && !isDjSequenceActiveRef.current) {
        if (audioElementRef.current) audioElementRef.current.volume = volume; 
        if (crossfadeAudioRef.current) crossfadeAudioRef.current.volume = volume;
      }
  }, [volume, isCrossfading, isDjTalking]);
  
  useEffect(() => { if (djAudioElementRef.current) djAudioElementRef.current.volume = djVolume; }, [djVolume]);

  const getNextSong = useCallback((current: Song | null, list: Song[]) => {
    if (list.length === 0) return null;
    if (!current) return list[0];
    const idx = list.findIndex(s => s.id === current.id);
    if (idx === -1 || idx === list.length - 1) return list[0]; 
    return list[idx + 1];
  }, []);

  useEffect(() => setNextSong(getNextSong(currentSong, playlist)), [playlist, currentSong, getNextSong]);

  // Handle Shuffle Action
  const handleShuffleQueue = () => {
      setPlaylist(prev => {
          // Keep current playing song at top, shuffle the rest
          let newOrder: Song[] = [];
          if (currentSong) {
              const others = prev.filter(s => s.id !== currentSong.id);
              // Fisher-Yates shuffle
              for (let i = others.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [others[i], others[j]] = [others[j], others[i]];
              }
              // Clear intro buffers to force regeneration for new order
              const cleaned = others.map(s => ({...s, introBuffer: undefined, introSourceId: undefined}));
              newOrder = [currentSong, ...cleaned];
          } else {
              newOrder = [...prev];
              for (let i = newOrder.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
              }
              newOrder = newOrder.map(s => ({...s, introBuffer: undefined, introSourceId: undefined}));
          }
          return newOrder;
      });
      setStatusText('QUEUE SHUFFLED');
  };

  // Auto-Queue Refill Logic
  useEffect(() => {
    if (!currentSong || library.length === 0) return;
    const isLastSong = playlist.length === 1 && playlist[0].id === currentSong.id;
    if (isLastSong) {
      setPlaylist(prev => {
        if (prev.length > 1) return prev; 
        const newBatch = generateQueue(library);
        return [...prev, ...newBatch];
      });
    }
  }, [currentSong, playlist, library]);

  // Next Transition Calculation Logic
  useEffect(() => {
      transitionRollRef.current = Math.random();
  }, [currentSong?.id]);

  useEffect(() => {
      if (isRadioPending || settings.djFrequency === 1) {
          setNextTransitionMode('DJ'); return;
      }
      if (settings.djFrequency === 0) {
          setNextTransitionMode('XFADE'); return;
      }
      const isDj = transitionRollRef.current <= settings.djFrequency;
      setNextTransitionMode(isDj ? 'DJ' : 'XFADE');
  }, [isRadioPending, settings.djFrequency, currentSong?.id]);


  // VISUAL TRIGGER
  const triggerTransition = () => { 
      setTransitionEffect(true); 
      setTimeout(() => setTransitionEffect(false), 1200); 
  };


  // --- COMPLEX TRANSITION LOGIC ---

  const performCrossfade = useCallback((next: Song) => {
      if (!audioElementRef.current || !crossfadeAudioRef.current) return;
      
      console.log("Starting Crossfade to:", next.title);
      setIsCrossfading(true);
      setStatusText('X-FADE: MIXING');
      triggerTransition();

      const outgoing = crossfadeAudioRef.current;
      const incoming = audioElementRef.current;
      
      outgoing.src = incoming.src;
      outgoing.currentTime = incoming.currentTime;
      outgoing.volume = incoming.volume;
      outgoing.play();

      setCurrentSong(next);
      incoming.src = URL.createObjectURL(next.file);
      incoming.currentTime = 0;
      incoming.volume = 0;
      incoming.play();
      
      transitionDecisionMadeRef.current = false;

      // Crossfade Volumes (10s)
      fadeAudio(outgoing, volume, 0, 10000, () => {
          outgoing.pause();
          outgoing.src = "";
          setIsCrossfading(false);
          setStatusText('PLAYING');
      });
      fadeAudio(incoming, 0, volume, 10000);

      setPlaylist(prev => prev.filter(s => s.id !== currentSong?.id));
  }, [currentSong, volume]);


  const performDJMix = useCallback((next: Song, djBuffer: ArrayBuffer) => {
      if (!audioElementRef.current || !djAudioElementRef.current) return;
      
      console.log("Starting DJ Mix to:", next.title);
      isDjSequenceActiveRef.current = true; // LOCK song end handler
      transitionDecisionMadeRef.current = false; // Reset for next time
      // NOTE: We do not set isDjTalking(true) immediately, we wait for the delay.
      triggerTransition();
      setStatusText('DJ: MIXING...');

      // 1. Fade OUT Current Song (10s fade)
      const outgoing = audioElementRef.current;
      fadeAudio(outgoing, volume, 0, 10000); 

      // 2. Play DJ Voice (Delayed by 5s)
      setTimeout(() => {
          if (!isDjSequenceActiveRef.current || !djAudioElementRef.current) return; // Safety check

          setIsDjTalking(true);
          setStatusText('DJ: ON AIR');

          const djBlob = new Blob([djBuffer], { type: 'audio/wav' });
          const djPlayer = djAudioElementRef.current;
          djPlayer.src = URL.createObjectURL(djBlob);
          djPlayer.currentTime = 0;
          djPlayer.volume = djVolume;
          djPlayer.play();

          // 3. Monitor DJ Progress to trigger Next Song Fade IN
          let nextSongTriggered = false;
          
          const checkDjTime = () => {
              if (!nextSongTriggered && (djPlayer.duration - djPlayer.currentTime <= 2)) {
                  // DJ has 2 seconds left. Start Next Song.
                  nextSongTriggered = true;
                  console.log("DJ wrapping up, cueing next track...");
                  
                  // Switch main player to next song
                  setCurrentSong(next);
                  const nextUrl = URL.createObjectURL(next.file);
                  
                  // Note: We use the MAIN player for the next song. 
                  outgoing.src = nextUrl;
                  outgoing.currentTime = 0;
                  outgoing.volume = 0;
                  outgoing.play().then(() => {
                      setStatusText('TRACK STARTED');
                      // Fade IN next song (10s)
                      fadeAudio(outgoing, 0, volume, 10000); 
                  });

                  setPlaylist(prev => prev.filter(s => s.id !== currentSong?.id));
              }

              if (djPlayer.ended) {
                  setIsDjTalking(false);
                  isDjSequenceActiveRef.current = false; // Unlock
                  djPlayer.removeEventListener('timeupdate', checkDjTime);
                  // Fallback if audio didn't start (short DJ clip)
                  if (!nextSongTriggered) {
                      setCurrentSong(next);
                      outgoing.src = URL.createObjectURL(next.file);
                      outgoing.volume = volume;
                      outgoing.play();
                      setPlaylist(prev => prev.filter(s => s.id !== currentSong?.id));
                  }
              }
          };

          djPlayer.addEventListener('timeupdate', checkDjTime);
      }, 5000); // 5-second delay to overlap with music fade

  }, [currentSong, volume, djVolume]);


  // Time Update Loop (The Brain)
  const handleTimeUpdate = useCallback(() => {
    if (!audioElementRef.current) return;
    const current = audioElementRef.current.currentTime;
    const dur = audioElementRef.current.duration;
    
    setCurrentTime(current);
    setDuration(dur || 0);

    const timeLeft = dur - current;

    // Trigger Logic: 10 seconds before end
    if (timeLeft <= 10 && !transitionDecisionMadeRef.current && isPlaying && nextSong && !isCrossfading && !isDjSequenceActiveRef.current) {
        
        transitionDecisionMadeRef.current = true;
        
        // Priority: Call Pending?
        if (isRadioPending) {
             // Let handleSongEnd handle calls, it's safer for interruptions
             return; 
        }

        // Check if we should DJ
        if (nextTransitionMode === 'DJ') {
             // Check if we have a buffered intro
             const matchesSettings = nextSong.introVoice === settings.djVoice && nextSong.introStyle === settings.djStyle;
             const isBuffered = nextSong.introBuffer && nextSong.introSourceId === currentSong?.id && matchesSettings;
             
             if (isBuffered && nextSong.introBuffer) {
                 performDJMix(nextSong, nextSong.introBuffer);
             } else {
                 if (settings.djFrequency > 0) {
                     console.log("DJ Buffer missing at trigger time, skipping DJ transition.");
                     // FALLBACK: Crossfade if DJ buffer isn't ready
                     performCrossfade(nextSong);
                 }
             }
        } else {
             performCrossfade(nextSong);
        }
    }
  }, [duration, isCrossfading, isPlaying, nextSong, nextTransitionMode, performCrossfade, performDJMix, currentSong, settings, isRadioPending]);

  // Bind Time Update
  useEffect(() => {
      const el = audioElementRef.current;
      if (el) {
          el.ontimeupdate = handleTimeUpdate;
      }
  }, [handleTimeUpdate]);


  // Intro Generation (Buffer Lookahead)
  useEffect(() => {
    if (!djMode || settings.djFrequency === 0 || playlist.length < 2 || !currentSong || isRadioPending || nextTransitionMode === 'XFADE') return;

    const generateLookAhead = async () => {
      const target1 = getNextSong(currentSong, playlist);
      if (!target1) return;

      const ensureIntro = async (prev: Song, target: Song) => {
        const matchesContext = target.introSourceId === prev.id;
        const matchesSettings = target.introVoice === settings.djVoice && target.introStyle === settings.djStyle;
        if (target.introBuffer && matchesContext && matchesSettings) return;
        
        const key = `${prev.id}-${target.id}`;
        if (generatingRef.current.has(key)) return;
        generatingRef.current.add(key);
        
        // VISUAL FEEDBACK: Let user know we are working
        setStatusText('DJ: PREPARING...');

        try {
          const targetIndex = playlist.findIndex(s => s.id === target.id);
          const upcomingTitles = targetIndex !== -1 
              ? playlist.slice(targetIndex + 1, targetIndex + 4).map(s => s.title)
              : [];

          const buffer = await generateDJIntro(
              prev, 
              target, 
              settings.djStyle, 
              settings.djVoice, 
              settings.language, 
              settings.customStylePrompt,
              upcomingTitles
          );
          if (buffer) {
            setPlaylist(prevPl => prevPl.map(s => 
              s.id === target.id ? { 
                  ...s, 
                  introBuffer: buffer, 
                  introSourceId: prev.id, 
                  introVoice: settings.djVoice, 
                  introStyle: settings.djStyle 
              } : s
            ));
            setStatusText('DJ: READY');
          } else {
             setStatusText('PLAYING'); 
          }
        } catch (e) {
             setStatusText('DJ: ERROR');
        } finally {
          generatingRef.current.delete(key);
        }
      };
      try { await ensureIntro(currentSong, target1); } catch (e) { console.warn("BG Gen Pause:", e); }
    };
    
    // REDUCED DELAY: Start generating almost immediately (100ms) instead of waiting 3s
    const timer = setTimeout(generateLookAhead, 100); 
    return () => clearTimeout(timer);
  }, [currentSong, playlist, djMode, settings, getNextSong, isRadioPending, nextTransitionMode]);

  // LIVE SESSION LOGIC 
  const cleanupLiveSession = useCallback(() => {
    if (liveSessionRef.current) liveSessionRef.current = null;
    if (liveStreamRef.current) { liveStreamRef.current.getTracks().forEach(track => track.stop()); liveStreamRef.current = null; }
    if (liveInputContextRef.current) { liveInputContextRef.current.close(); liveInputContextRef.current = null; }
    if (liveOutputContextRef.current) { liveOutputContextRef.current.close(); liveOutputContextRef.current = null; }
    if (liveSilenceIntervalRef.current) { clearInterval(liveSilenceIntervalRef.current); liveSilenceIntervalRef.current = null; }
    liveSourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    liveSourcesRef.current.clear();
    liveNextStartTimeRef.current = 0;
    setIsLiveActive(false);
  }, []);

  const handleCallSubmit = async (name: string, reason: string, file: File | null) => {
    setCallerInfo({ name, reason });
    setStatusText('GENERATING BRIDGE...');
    let requestedSong: Song | null = null;
    let next: Song | null = null;

    if (file) {
      try {
        const meta = await analyzeTrack(file);
        requestedSong = {
          id: Math.random().toString(36).substr(2, 9),
          title: meta.title || file.name,
          artist: meta.artist || 'Unknown Artist',
          file: file,
          duration: meta.duration || 180,
          requestedBy: name,
          requestMessage: reason,
          cover: meta.cover
        };
        next = requestedSong;
      } catch (e) { console.error(e); }
    } else {
        next = getNextSong(currentSong, playlist);
    }
    
    try {
      const buffers = await generateCallBridging(name, reason, next, settings.djVoice, settings.language);
      setCallBuffers(buffers);
      setIsRadioPending(true);
      setShowCallModal(false);
      setStatusText('CALL QUEUED');
      
      if (requestedSong) {
          pendingNextSongRef.current = requestedSong;
          setPlaylist(prev => {
              const currentIndex = currentSong ? prev.findIndex(s => s.id === currentSong.id) : -1;
              if (currentIndex !== -1) {
                  const newPl = [...prev];
                  newPl.splice(currentIndex + 1, 0, requestedSong!);
                  return newPl;
              } else {
                  return [requestedSong!, ...prev];
              }
          });
      }
    } catch (e) {
      setStatusText('ERR: BRIDGE GEN FAILED');
      setShowCallModal(false);
    }
  };

  const transitionTool: FunctionDeclaration = {
    name: 'endCall',
    description: 'Terminates the live broadcast call. MUST be called to hang up the phone and return to music.',
    parameters: { type: Type.OBJECT, properties: {} },
  };

  const startLiveSession = async () => {
    if (!hasApiKey) { setStatusText('ERR: API KEY MISSING'); return; }
    setStatusText('CONNECTING CALL...');
    setIsLiveActive(true); 
    setIsPlaying(false);
    triggerTransition();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      liveInputContextRef.current = new AudioCtx();
      liveOutputContextRef.current = new AudioCtx();
      setIsDjTalking(true);
      const outputNode = liveOutputContextRef.current.createGain();
      outputNode.connect(liveOutputContextRef.current.destination);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;

      let lastUserAudioTime = Date.now();
      let silenceWarningSent = false;
      
      if (liveSilenceIntervalRef.current) clearInterval(liveSilenceIntervalRef.current);
      liveSilenceIntervalRef.current = setInterval(() => {
         if (!liveSessionRef.current) return;
         const timeSinceLastAudio = Date.now() - lastUserAudioTime;
         if (timeSinceLastAudio > 10000 && !silenceWarningSent) {
             console.log("Silence detected. Nudging model.");
             silenceWarningSent = true;
             liveSessionRef.current.then((session: any) => {
                session.send({ 
                    clientContent: { 
                        turns: [{ 
                            role: 'user', 
                            parts: [{ text: "SYSTEM_NOTE: The caller has been silent for 10 seconds. Politely ask if they are there or wrap up the call." }] 
                        }] 
                    } 
                });
             });
         }
      }, 1000);

      const langInstruction = settings.language === 'cs' ? "Speak in Czech." : settings.language === 'ja' ? "Speak in Japanese." : "Speak in English.";
      const voiceInstruction = settings.djVoice === 'Charon' 
         ? "Speak deeply, calmly, and professionally like a podcast host." 
         : settings.djVoice === 'Kore' ? "Speak naturally and clearly. Do not hype." : "";

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.djVoice } } },
          systemInstruction: `
            You are DJ "Horis". You are live on air taking a call from listener "${callerInfo?.name}".
            ${callerInfo?.reason ? `They want to talk about: "${callerInfo.reason}".` : ''}
            
            Guidelines:
            1. Keep the conversation engaging.
            2. Be cool, witty, and high energy.
            3. CRITICAL: You MUST call the function 'endCall' to hang up when the conversation reaches a natural stopping point.
            4. If the user stops responding or there is 10+ seconds of silence: Politely say goodbye and call 'endCall'.
            
            IMPORTANT: ${langInstruction}
            ${voiceInstruction}
          `,
          tools: [{ functionDeclarations: [transitionTool] }],
        },
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            setStatusText('LIVE: ON AIR');
            if (!liveInputContextRef.current) return;
            const source = liveInputContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = liveInputContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!liveInputContextRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              if (rms > 0.02) {
                  lastUserAudioTime = Date.now();
                  silenceWarningSent = false;
              }

              const pcmBlob = createPcmBlob(downsampleTo16k(inputData, liveInputContextRef.current.sampleRate));
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(liveInputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
               for (const fc of msg.toolCall.functionCalls) {
                 if (fc.name === 'endCall') {
                    sessionPromise.then(session => session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } } }));
                    const ctx = liveOutputContextRef.current;
                    if (ctx) {
                        const remaining = Math.max(0, liveNextStartTimeRef.current - ctx.currentTime);
                        setTimeout(() => handleCallSequenceEnd(), remaining * 1000 + 1000);
                    } else {
                        setTimeout(() => handleCallSequenceEnd(), 1000);
                    }
                 }
               }
            }
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && liveOutputContextRef.current) {
               const ctx = liveOutputContextRef.current;
               liveNextStartTimeRef.current = Math.max(liveNextStartTimeRef.current, ctx.currentTime);
               const audioBuffer = await decodeAudioData(decodeAudio(base64Audio), ctx, 24000, 1);
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNode);
               source.addEventListener('ended', () => liveSourcesRef.current.delete(source));
               source.start(liveNextStartTimeRef.current);
               liveNextStartTimeRef.current += audioBuffer.duration;
               liveSourcesRef.current.add(source);
            }
          },
          onclose: () => { if (isLiveActive) handleCallSequenceEnd(); },
          onerror: (e) => { cleanupLiveSession(); setIsRadioPending(false); }
        }
      });
      liveSessionRef.current = sessionPromise;
    } catch (e) { cleanupLiveSession(); setIsRadioPending(false); if (nextSong) playSong(nextSong, true); }
  };

  const handleCallSequenceEnd = () => {
    cleanupLiveSession();
    setIsLiveActive(false);
    let trackToPlay = pendingNextSongRef.current || nextSong;
    if (!trackToPlay && playlist.length > 0) trackToPlay = playlist[0];
    pendingNextSongRef.current = null;

    if (callBuffers.outro && djAudioElementRef.current) {
        setStatusText('DJ: WRAPPING UP');
        setIsDjTalking(true);
        triggerTransition();
        const blob = new Blob([callBuffers.outro], { type: 'audio/wav' });
        djAudioElementRef.current.src = URL.createObjectURL(blob);
        
        const finishOutro = () => {
             setIsDjTalking(false);
             if (audioElementRef.current && trackToPlay) {
                 if (!currentSong || currentSong.id !== trackToPlay.id) {
                     playSong(trackToPlay, true);
                 } else {
                     audioElementRef.current.play();
                     setIsPlaying(true);
                 }
             } else if (trackToPlay) {
                 playSong(trackToPlay, true);
             }
        };

        djAudioElementRef.current.onended = finishOutro;
        djAudioElementRef.current.play();
        setIsRadioPending(false);
        setCallerInfo(null);
    } else {
        setIsRadioPending(false);
        setCallerInfo(null);
        if (trackToPlay) playSong(trackToPlay, true);
    }
  };

  const handleManualEndCall = () => handleCallSequenceEnd();

  const playSong = useCallback(async (song: Song, forceStart = false) => {
    initAudio();
    if (!audioElementRef.current) return;
    
    // Only trigger full transition if NOT in the middle of a smooth sequence
    if (!isDjSequenceActiveRef.current) triggerTransition();
    
    setCurrentSong(song);
    setIsDjTalking(false);
    setStatusText('PLAYING');
    setIsLiveActive(false); 
    setIsCrossfading(false);
    transitionDecisionMadeRef.current = false;
    
    if (!hasStarted) setHasStarted(true);
    const url = URL.createObjectURL(song.file);
    audioElementRef.current.src = url;
    audioElementRef.current.volume = volume; // Ensure volume is up
    audioElementRef.current.play().catch(e => console.error(e));
    setIsPlaying(true);
  }, [initAudio, hasStarted, volume]);

  const handleSongEnd = useCallback(async () => {
    // BLOCKED if we are in the middle of a controlled transition
    if (isCrossfading || isDjSequenceActiveRef.current) return;
    
    if (!currentSong) return;
    let newQueue = playlist.filter(s => s.id !== currentSong.id);
    if (newQueue.length === 0 && library.length > 0) {
        setStatusText('QUEUE EMPTY: REFILLING...');
        newQueue = generateQueue(library);
    }
    setPlaylist(newQueue);
    const next = newQueue.length > 0 ? newQueue[0] : null;

    if (!next) { setIsPlaying(false); setStatusText('LIBRARY EMPTY'); return; }

    if (isRadioPending) {
        setStatusText('INCOMING CALL...');
        pendingNextSongRef.current = next;
        if (callBuffers.intro && djAudioElementRef.current) {
            setIsDjTalking(true);
            triggerTransition();
            const blob = new Blob([callBuffers.intro], { type: 'audio/wav' });
            djAudioElementRef.current.src = URL.createObjectURL(blob);
            djAudioElementRef.current.onended = () => startLiveSession();
            djAudioElementRef.current.play();
            return;
        } else { startLiveSession(); return; }
    }

    // Fallback: If we missed the -5s transition window (e.g. song was too short), start next song
    playSong(next, true);

  }, [currentSong, playlist, library, isRadioPending, callBuffers, playSong, isCrossfading]);

  useEffect(() => { if (audioElementRef.current) audioElementRef.current.onended = handleSongEnd; }, [handleSongEnd]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    setLoadingFile(true);
    setStatusText('SYS: READING DATA');
    const newSongs: Song[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/')) {
        const meta = await analyzeTrack(file);
        const song: Song = {
          id: Math.random().toString(36).substr(2, 9),
          title: meta.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: meta.artist || 'Unknown Artist', 
          file: file,
          duration: meta.duration || 180, cover: meta.cover
        };
        newSongs.push(song);
        // Persist to DB
        saveSongToDB(song).catch(console.error);
      }
    }
    setLibrary(prev => [...prev, ...newSongs]);
    setPlaylist(prev => [...prev, ...newSongs]);
    setLoadingFile(false);
    setStatusText(isPlaying ? 'PLAYING' : 'DB: SAVED');
    setMobileTab('LIBRARY');
  };

  const reorderPlaylist = (fromIndex: number, toIndex: number) => {
    setPlaylist(prev => {
        const newPlaylist = [...prev];
        const [moved] = newPlaylist.splice(fromIndex, 1);
        newPlaylist.splice(toIndex, 0, moved);
        return newPlaylist;
    });
  };
  
  const handleRemoveSong = (id: string) => {
      deleteSongFromDB(id).catch(console.error);
      setPlaylist(prev => prev.filter(s => s.id !== id));
      setLibrary(prev => prev.filter(s => s.id !== id));
  };

  const togglePlay = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) { audioElementRef.current.pause(); setStatusText('PAUSED'); setIsPlaying(false); } 
    else { if (!currentSong && playlist.length > 0) playSong(playlist[0]); else { audioElementRef.current.play().catch(console.error); setIsPlaying(true); setStatusText('RESUMING'); } }
  };

  const handleStartCallClick = () => {
    if (isRadioPending) { setIsRadioPending(false); setCallerInfo(null); setStatusText('CALL CANCELLED'); } 
    else setShowCallModal(true);
  };

  const toggleLanguage = () => {
    setSettings(prev => ({
        ...prev,
        language: prev.language === 'en' ? 'cs' : prev.language === 'cs' ? 'ja' : 'en'
    }));
  };

  // --- RENDER ---

  const layoutProps: LayoutProps = {
     playlist, library, currentSong, nextSong, isPlaying, currentTime, duration, volume, statusText,
     settings, visMode, isLiveActive, isRadioPending, isDjTalking, callerInfo, mobileTab,
     dragActive, loadingFile, transitionEffect, nextTransitionMode, analyser: analyserRef.current, audioElement: audioElementRef.current,
     onPlay: (s) => playSong(s, false),
     onRemove: handleRemoveSong,
     onReorder: reorderPlaylist,
     onTogglePlay: togglePlay,
     onSetVolume: setVolume,
     onSetVisMode: setVisMode,
     onShuffle: handleShuffleQueue, 
     onSetMobileTab: setMobileTab,
     onMenuClick: () => setCurrentScreen('START'),
     onRequestClick: () => setShowRequestModal(true),
     onCallClick: handleStartCallClick,
     onManualEndCall: handleManualEndCall,
     onFileUpload: (files) => handleFileUpload(files),
     onSeek: (time) => { if(audioElementRef.current) audioElementRef.current.currentTime = time; setCurrentTime(time); }
  };

  return (
    <div 
      className="h-[100dvh] w-screen overflow-hidden relative flex flex-col transition-colors duration-500"
      onDragEnter={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setDragActive(true); }}
      onDragOver={(e) => { e.preventDefault(); if(e.dataTransfer.types.includes('Files')) setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files); }}
    >
      <VisualTransition active={transitionEffect} theme={settings.theme} />

      {settings.theme === 'CYBER' && <CyberLayout {...layoutProps} />}
      {settings.theme === 'ANIME' && <AnimeLayout {...layoutProps} />}
      {settings.theme === 'RETRO' && <RetroLayout {...layoutProps} />}

      {currentScreen === 'START' && (
             <StartScreen 
                isPlaying={isPlaying}
                language={settings.language}
                onToggleLanguage={toggleLanguage}
                onStart={() => setCurrentScreen('PLAYER')} 
                onSettings={() => setCurrentScreen('SETTINGS')} 
             />
      )}

      {currentScreen === 'SETTINGS' && (
             <SettingsScreen 
                settings={settings} 
                onUpdate={(s) => setSettings(prev => ({...prev, ...s}))} 
                onClose={() => setCurrentScreen('START')} 
             />
      )}

      {dragActive && (<div className="absolute inset-0 z-50 bg-cyber-blue/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"><div className="border-4 border-cyber-blue p-12 bg-black/90 text-cyber-blue font-display text-2xl md:text-4xl animate-bounce">INIT_DATA_TRANSFER</div></div>)}
      {showRequestModal && (<RequestModal onClose={() => setShowRequestModal(false)} onSubmit={(s) => { setPlaylist(prev => [...prev, s]); setStatusText('REQ: RECEIVED'); setMobileTab('LIBRARY'); }} />)}
      {showCallModal && (<CallModal onClose={() => setShowCallModal(false)} onSubmit={handleCallSubmit} />)}
    </div>
  );
};

export default App;