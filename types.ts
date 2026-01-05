
export const DJStyle = {
  STANDARD: 'Standard (Radio Host)',
  CHILL: 'Late Night Radio (Chill)',
  TECHNICAL: 'Music Nerd (Facts & Stats)',
  MINIMAL: 'Minimal (Just Song Names)',
  CUSTOM: 'Custom (User Defined)',
  DRUNK: 'Drunk (Chaotic)',
} as const;

export type DJStyle = typeof DJStyle[keyof typeof DJStyle];

// Voice Configuration with Metadata for UI
export interface VoiceProfile {
  id: string;
  name: string; // The API value
  gender: 'Male' | 'Female' | 'Robot';
  tone: string;
  emotion: string;
}



export type DJVoice = string; // Using string to allow flexibility, but typically matches VoiceProfile.id

export type VisualizerMode = 'BARS' | 'WAVE' | 'ORB' | 'PIXEL';

export interface Song {
  id: string;
  title: string;
  artist: string;
  file: File;
  duration: number;
  cover?: string;
  introBuffer?: ArrayBuffer;
  introSourceId?: string;
  introVoice?: DJVoice;
  introStyle?: DJStyle;
  introCustomPrompt?: string;
  requestedBy?: string;
  requestMessage?: string;
}

// App Settings Types
export type AppTheme = 'CYBER' | 'ANIME' | 'RETRO';
export type ColorPalette = 'NEON' | 'PASTEL' | 'MIDNIGHT' | 'GOLD';
export type AppLanguage = 'en' | 'cs' | 'ja';



export interface AppSettings {
  theme: AppTheme;
  palette: ColorPalette;
  djVoice: DJVoice;
  djStyle: DJStyle;
  customStylePrompt: string;
  djFrequency: number; // 0.0 to 1.0 (0 = Always Crossfade, 1 = Always DJ)
  language: AppLanguage;
}

// Props shared by all layout components
export interface LayoutProps {
  // Data
  playlist: Song[];
  library: Song[];
  currentSong: Song | null;
  nextSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  statusText: string;

  // Settings / State
  settings: AppSettings;
  visMode: VisualizerMode;
  isLiveActive: boolean;
  isRadioPending: boolean;
  isDjTalking: boolean;
  callerInfo: { name: string; reason: string } | null;
  mobileTab: 'PLAYER' | 'LIBRARY';
  dragActive: boolean;
  loadingFile: boolean;
  transitionEffect: boolean;
  nextTransitionMode: 'DJ' | 'XFADE';

  // Refs
  analyser: AnalyserNode | null;
  audioElement: HTMLAudioElement | null;

  // Actions
  onPlay: (song: Song) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onTogglePlay: () => void;
  onSetVolume: (vol: number) => void;
  onSetVisMode: (mode: VisualizerMode) => void;
  onShuffle: () => void; // Replaces onSetPlaybackMode
  onSetMobileTab: (tab: 'PLAYER' | 'LIBRARY') => void;
  onMenuClick: () => void;
  onRequestClick: () => void;
  onCallClick: () => void;
  onManualEndCall: () => void;
  onFileUpload: (files: FileList) => void;
  onSeek: (time: number) => void;
}
