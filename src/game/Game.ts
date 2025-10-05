import * as THREE from 'three';
import { World } from './World';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { GameUI } from '../ui/GameUI';
import { InputHandler } from './InputHandler';
import { SocketManager } from './SocketManager';
import { setContent } from '../router';
import { type Item } from './items';

export class Game {
    private world: World;
    private player: Player;
    private enemy: Enemy;
    private gameUI: GameUI;
    private inputHandler: InputHandler;
    private socketManager: SocketManager;
    private clock: THREE.Clock;

    private isPaused = false;
    private isGameOver = false;

    constructor() {
        this.setupInitialHTML();

        this.clock = new THREE.Clock();
        this.world = new World();
        this.gameUI = new GameUI(this.world.getCamera());
        this.inputHandler = new InputHandler();

        this.player = new Player();
        this.enemy = new Enemy();
        this.enemy.group.position.set(5, 0, -10);

        this.world.add(this.player.group);
        this.world.add(this.enemy.group);

        this.socketManager = new SocketManager(this.world.getScene());
        
        this.setupEventListeners();
    }

    private setupInitialHTML(): void {
        const gameHTML = `
          <div id="game-ui">
            <div id="player-hp-ui">
              <span>PLAYER HP</span>
              <div id="player-hp-bar-background"><div id="player-hp-bar"></div></div>
            </div>
            <div id="inventory-ui">
              <span>🪙 Gold: <span id="gold-token">0</span></span>
              <span>⚪ Silver: <span id="silver-token">0</span></span>
              <span>🟤 Bronze: <span id="bronze-token">0</span></span>
            </div>
            <button id="pause-btn">||</button>
            <div id="pauseMessage" class="hidden"></div>
          </div>
          <canvas id="game-canvas"></canvas>
        `;
        setContent(gameHTML);
        document.getElementById('game-ui-container')!.classList.remove('hidden');
    }

    public start(): void {
        this.socketManager.connect();
        this.animate();
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', () => this.world.handleResize());

        this.gameUI.on('restartGame', () => this.restart());
        this.gameUI.on('equipItem', (item: Item) => {
            this.player.equipItem(item);
            this.gameUI.refreshInventory(this.player.inventory, this.player.equipped.weapon);
        });

        this.inputHandler.on('togglePause', () => this.togglePause());
        this.gameUI.on('togglePause', () => this.togglePause());

        const inventoryToggleHandler = () => {
            this.gameUI.toggleInventory(this.player.inventory, this.player.equipped.weapon);
        };
        this.inputHandler.on('toggleInventory', inventoryToggleHandler);
        this.gameUI.on('toggleInventory', inventoryToggleHandler);
    }
    
    private togglePause(): void {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;
        this.gameUI.togglePauseMessage(this.isPaused);
        if (!this.isPaused) {
            this.animate();
        }
    }

    private animate(): void {
        if (this.isPaused) return;

        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        this.player.update(delta, elapsedTime, this.inputHandler.keyboardState, this.enemy);
        this.enemy.update(delta, this.player);
        this.world.update(this.player.group.position);

        this.gameUI.updatePlayerHP(this.player.hp);
        this.gameUI.updateEnemyHP(this.enemy);

        if (this.player.isMoving) {
            this.socketManager.emitPlayerMovement(this.player.group.position);
        }

        if (this.player.hp <= 0 && !this.isGameOver) {
            this.gameOver();
        }

        this.world.render();
    }

    private gameOver(): void {
        this.isGameOver = true;
        this.isPaused = true;
        this.gameUI.showGameOver();
    }
    
    private restart(): void {
        if (!this.isGameOver) return;
        this.player.reset();
        this.enemy.reset(new THREE.Vector3(5, 0, -10));
        this.gameUI.hideMessages();
        this.gameUI.updatePlayerHP(this.player.hp);
        this.isGameOver = false;
        this.isPaused = false;
        this.animate();
    }
}