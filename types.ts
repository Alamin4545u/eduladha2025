// types.ts

export enum Tab {
  HOME = 'HOME',
  EARN = 'EARN',
  AI = 'AI',
}

export interface UserState {
  points: number;
  streak: number;
  lastActive: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: any;
  version: string;
  platform: string;
  themeParams: any;
  isExpanded: boolean;
  viewportHeight: number;
  expand: () => void;
  close: () => void;
  ready: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  HapticFeedback?: {
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    selectionChanged: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
    showGiga?: () => Promise<void>;
  }
}