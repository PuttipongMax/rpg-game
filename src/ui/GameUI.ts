import { EventEmitter } from 'eventemitter3';
import * as THREE from 'three';
import { type Item } from '../game/items';
import { type Enemy } from '../entities/Enemy';

export class GameUI extends EventEmitter {
    private camera: THREE.PerspectiveCamera;
    private playerHpBar: HTMLDivElement;
    private goldTokenSpan: HTMLSpanElement;
    private silverTokenSpan: HTMLSpanElement;
    private bronzeTokenSpan: HTMLSpanElement;
    private inventoryPanel: HTMLDivElement;
    private inventoryGrid: HTMLDivElement;
    private inventoryBtn: HTMLButtonElement;
    private pauseBtn: HTMLButtonElement;
    private pauseMessage: HTMLDivElement;
    private isInventoryOpen = false;

    constructor(camera: THREE.PerspectiveCamera) {
        super();
        this.camera = camera;
        
        this.playerHpBar = document.getElementById('player-hp-bar') as HTMLDivElement;
        this.goldTokenSpan = document.getElementById('gold-token') as HTMLSpanElement;
        this.silverTokenSpan = document.getElementById('silver-token') as HTMLSpanElement;
        this.bronzeTokenSpan = document.getElementById('bronze-token') as HTMLSpanElement;
        this.inventoryPanel = document.getElementById('inventory-panel') as HTMLDivElement;
        this.inventoryGrid = document.getElementById('inventory-grid') as HTMLDivElement;
        this.inventoryBtn = document.getElementById('inventory-btn') as HTMLButtonElement;
        this.pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
        this.pauseMessage = document.getElementById('pauseMessage') as HTMLDivElement;
        
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.pauseBtn.onclick = () => this.emit('togglePause');
        this.inventoryBtn.onclick = () => this.emit('toggleInventory');
        this.pauseMessage.onclick = () => this.emit('restartGame');
    }

    public updatePlayerHP(hp: number): void {
        const percentage = Math.max(0, hp);
        this.playerHpBar.style.width = `${percentage}%`;
    }
    
    public updateEnemyHP(enemy: Enemy): void {
        if (!enemy.hpBar) return;
        
        const distance = enemy.group.position.distanceTo(this.camera.position);
        const HP_BAR_VISIBLE_DISTANCE = 25;

        const isVisible = distance < HP_BAR_VISIBLE_DISTANCE && enemy.hp > 0;
        enemy.hpBar.group.visible = isVisible;

        if (isVisible) {
            enemy.hpBar.group.quaternion.copy(this.camera.quaternion);
            const hpPercentage = Math.max(0, enemy.hp / enemy.maxHp);
            enemy.hpBar.foreground.scale.x = hpPercentage;
        }
    }

    public updateTokens(inventory: { bronze: number; silver: number; gold: number; }): void {
        this.goldTokenSpan.textContent = inventory.gold.toString();
        this.silverTokenSpan.textContent = inventory.silver.toString();
        this.bronzeTokenSpan.textContent = inventory.bronze.toString();
    }

    public toggleInventory(inventory: Item[], equippedWeapon: Item | null): void {
        this.isInventoryOpen = !this.isInventoryOpen;
        this.inventoryPanel.classList.toggle('hidden', !this.isInventoryOpen);
        if (this.isInventoryOpen) {
            this.refreshInventory(inventory, equippedWeapon);
        }
    }
    
    public refreshInventory(inventory: Item[], equippedWeapon: Item | null): void {
        this.inventoryGrid.innerHTML = '';
        inventory.forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.textContent = item.name;
            if (equippedWeapon?.id === item.id) {
                slot.classList.add('equipped');
            }
            slot.onclick = () => this.emit('equipItem', item);
            this.inventoryGrid.appendChild(slot);
        });
    }

    public togglePauseMessage(isPaused: boolean): void {
        this.pauseMessage.textContent = "PAUSED";
        this.pauseMessage.classList.toggle('hidden', !isPaused);
    }

    public showGameOver(): void {
        this.pauseMessage.innerHTML = 'GAME OVER<div style="font-size: 0.3em; margin-top: 20px;">Click to Respawn</div>';
        this.pauseMessage.classList.remove('hidden');
    }

    public hideMessages(): void {
        this.pauseMessage.classList.add('hidden');
    }
}