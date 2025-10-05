// src/utils/EventEmitter.ts
type Listener = (...args: any[]) => void;

export class CustomEventEmitter {
    private events: { [key: string]: Listener[] } = {};

    // ใช้สำหรับดักฟัง event
    public on(eventName: string, listener: Listener): void {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(listener);
    }

    // ใช้สำหรับยิง event ออกไป
    public emit(eventName: string, ...args: any[]): void {
        const listeners = this.events[eventName];
        if (listeners) {
            listeners.forEach(listener => listener(...args));
        }
    }
    
    // ใช้สำหรับหยุดฟัง event (เผื่อต้องการ)
    public off(eventName: string, listenerToRemove: Listener): void {
        const listeners = this.events[eventName];
        if (listeners) {
            this.events[eventName] = listeners.filter(listener => listener !== listenerToRemove);
        }
    }
}