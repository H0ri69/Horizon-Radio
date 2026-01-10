import { logger } from "../utils/Logger";

const log = logger.withContext('EventBus');

type HoriSEvents = {
  'HORIS_CALL_SUBMITTED': { name: string; song: any; message: string; useRemote?: boolean; remoteSource?: any };
  'HORIS_STATUS_UPDATE': string;
  'HORIS_MANUAL_TRIGGER': void;
};

type EventCallback<T> = (detail: T) => void;

class EventBus {
  private listeners: Record<string, EventCallback<any>[]> = {};

  on<K extends keyof HoriSEvents>(event: K, callback: EventCallback<HoriSEvents[K]>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off<K extends keyof HoriSEvents>(event: K, callback: EventCallback<HoriSEvents[K]>) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit<K extends keyof HoriSEvents>(event: K, detail: HoriSEvents[K]) {
    log.debug(`Emitting event: ${event}`, detail);
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(detail));
  }
}

export const eventBus = new EventBus();
