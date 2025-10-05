import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';
import { Player } from '../entities/Player'; // Using Player as the type for other players

export class SocketManager {
    private socket: Socket;
    private scene: THREE.Scene;
    private otherPlayers = new Map<string, Player>();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.socket = io('http://localhost:3000');
    }

    public connect(): void {
        this.socket.on('connect', () => {
            console.log('Connected to server!', this.socket.id);
            this.setupEventListeners();
        });
    }

    private setupEventListeners(): void {
        this.socket.on('updatePlayers', (serverPlayers) => {
            this.updateAllPlayers(serverPlayers);
        });
        
        this.socket.on('playerMoved', (data: { id: string, position: { x: number, y: number, z: number } }) => {
            const playerToMove = this.otherPlayers.get(data.id);
            if (playerToMove) {
                const targetPosition = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
                playerToMove.group.position.lerp(targetPosition, 0.1);
            }
        });
    }
    
    public emitPlayerMovement(position: THREE.Vector3): void {
        this.socket.emit('playerMovement', { x: position.x, y: position.y, z: position.z });
    }

    private updateAllPlayers(serverPlayers: Record<string, { x: number, y: number, z: number }>): void {
        const serverPlayerIds = Object.keys(serverPlayers);
        
        // Remove disconnected players
        this.otherPlayers.forEach((player, id) => {
            if (!serverPlayerIds.includes(id)) {
                this.scene.remove(player.group);
                this.otherPlayers.delete(id);
            }
        });

        // Add or update players
        serverPlayerIds.forEach(id => {
            if (id !== this.socket.id) {
                const serverPos = serverPlayers[id];
                let clientPlayer = this.otherPlayers.get(id);

                if (!clientPlayer) {
                    const newPlayer = new Player(); // Assuming other players look the same
                    newPlayer.group.position.set(serverPos.x, serverPos.y, serverPos.z);
                    this.otherPlayers.set(id, newPlayer);
                    this.scene.add(newPlayer.group);
                }
            }
        });
    }
}