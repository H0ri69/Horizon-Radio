import { AppLanguage, DJVoice, VoiceProfile } from '../../types';

export const VOICE_PROFILES: VoiceProfile[] = [
  { id: 'Charon', name: 'Charon', gender: 'Male', tone: 'Deep/Pro', emotion: 'Confidential' },
  { id: 'Kore', name: 'Kore', gender: 'Female', tone: 'Natural', emotion: 'Balanced' },
  { id: 'Puck', name: 'Puck', gender: 'Male', tone: 'Playful', emotion: 'Mischievous' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', tone: 'Intense', emotion: 'Aggressive' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female', tone: 'Gentle', emotion: 'Breezy' },
];

export const THEME_PALETTES = {
  NEON: {
    primary: '#ff2a6d',
    secondary: '#05d9e8',
    tertiary: '#00ff9f'
  },
  PASTEL: {
    primary: '#ffb7b2',
    secondary: '#a2e1db',
    tertiary: '#e2f0cb'
  },
  MIDNIGHT: {
    primary: '#7c4dff',
    secondary: '#448aff',
    tertiary: '#69f0ae'
  },
  GOLD: {
    primary: '#ffd700',
    secondary: '#c0c0c0',
    tertiary: '#ffffff'
  }
} as const;

export const TEXT_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    listen: 'LISTEN',
    resume: 'RESUME SESSION',
    settings: 'SETTINGS',
    language: 'LANGUAGE: ENGLISH',
    menu: 'MENU',
    call: 'CALL',
    req: 'REQ',
    live: 'LIVE BROADCAST',
    onAir: 'ON AIR',
    dialing: 'DIALING...',
    callIn: 'CALL IN',
    requestSong: 'REQUEST SONG',
    end: 'END',
    nextOp: 'NEXT_OP',
    voice: 'VOICE_OVER',
    autoMix: 'AUTO_MIX',
    sysStatus: 'SYS.STATUS'
  },
  cs: {
    listen: 'POSLOUCHAT',
    resume: 'OBNOVIT RELACI',
    settings: 'NASTAVENÍ',
    language: 'JAZYK: ČEŠTINA',
    menu: 'MENU',
    call: 'VOLAT',
    req: 'ŽÁDOST',
    live: 'ŽIVÉ VYSÍLÁNÍ',
    onAir: 'NA PŘÍJMU',
    dialing: 'VYTÁČÍM...',
    callIn: 'ZAVOLAT',
    requestSong: 'PŘIDAT',
    end: 'KONEC',
    nextOp: 'DALŠÍ_AKCE',
    voice: 'HLAS_DJ',
    autoMix: 'AUTO_MIX',
    sysStatus: 'SYS.STAV'
  },
  ja: {
    listen: 'スタート',
    resume: 'セッション再開',
    settings: '設定',
    language: '言語: 日本語',
    menu: 'メニュー',
    call: '通話',
    req: 'リクエスト',
    live: 'ライブ放送',
    onAir: '放送中',
    dialing: '発信中...',
    callIn: '電話する',
    requestSong: '選曲',
    end: '終了',
    nextOp: '次の操作',
    voice: 'DJ音声',
    autoMix: '自動ミックス',
    sysStatus: 'システム'
  }
};
