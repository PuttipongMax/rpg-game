import * as THREE from 'three';
import { Character } from './Character';
import { Player } from './Player';

export class Enemy extends Character {
    private moveSpeed = 2.5;
    private canAttack = true;

    constructor() {
        super(0xff0000, false);
    }

    public update(delta: number, player: Player): void {
        if (this.hp <= 0) {
            if (this.group.visible) {
                this.group.visible = false; // Hide on death
            }
            return;
        }

        const distance = this.group.position.distanceTo(player.group.position);
        this.group.lookAt(player.group.position);
        
        if (distance > 2.0) {
            const moveDirection = new THREE.Vector3().subVectors(player.group.position, this.group.position).normalize();
            this.group.position.addScaledVector(moveDirection, delta * this.moveSpeed);
        } else if (this.canAttack) {
            this.attack(player);
        }
    }
    
    public onDeath(playerPosition: THREE.Vector3): void {
        // Respawn logic
        const angle = Math.random() * Math.PI * 2;
        const spawnDistance = 20;
        const newX = playerPosition.x + Math.sin(angle) * spawnDistance;
        const newZ = playerPosition.z + Math.cos(angle) * spawnDistance;
        this.reset(new THREE.Vector3(newX, 0, newZ));
        this.group.visible = true;
    }
    
    private attack(player: Player): void {
        this.canAttack = false;
        
        let finalDamage = 8;
        if (player.isDefending) finalDamage /= 2;
        
        // --- THIS IS THE CORRECTED LINE ---
        if (!player.isDodging) {
             player.takeDamage(finalDamage);
        }
        
        setTimeout(() => { this.canAttack = true; }, 1500);
    }
}