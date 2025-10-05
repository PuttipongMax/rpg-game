import { EventEmitter } from 'eventemitter3';

export class InputHandler extends EventEmitter {
    public keyboardState: Record<string, boolean> = {
        w: false, a: false, s: false, d: false, ' ': false,
        j: false, k: false, l: false, ';': false, i: false
    };

    constructor() {
        super();
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    private handleKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        if (event.repeat) return;
        
        if (key === 'escape') this.emit('togglePause');
        if (key === 'i') this.emit('toggleInventory');
        
        if (key in this.keyboardState) {
            this.keyboardState[key] = true;
        }
    }
    
    private handleKeyUp(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        if (key in this.keyboardState) {
            this.keyboardState[key] = false;
        }
    }
}