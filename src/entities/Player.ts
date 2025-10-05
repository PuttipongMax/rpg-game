import * as THREE from 'three';
import { Character } from './Character';
import { Enemy } from './Enemy';
import { type Item } from '../game/items';

export class Player extends Character {
    public isMoving = false;
    public isDefending = false;
    public isDodging = false;
    
    private moveSpeed = 5.0;
    private direction = new THREE.Vector3();
    
    // Action related state
    private canAct = true;
    private isCharging = false;
    private chargeStartTime = 0;
    
    // Physics
    private playerVelocityY = 0;
    private readonly GRAVITY = 20.0;
    private readonly JUMP_FORCE = 10.0;
    
    constructor() {
        super(0x2288ff, true);
    }

    update(delta: number, elapsedTime: number, keyboardState: Record<string, boolean>, enemy: Enemy): void {
        this.handleMovement(delta, elapsedTime, keyboardState);
        this.handleActions(elapsedTime, keyboardState, enemy);
    }
    
    public equipItem(item: Item): void {
        if (item.type === 'weapon') {
            // Unequip if it's the same weapon, otherwise equip the new one
            this.equipped.weapon = this.equipped.weapon?.id === item.id ? null : item;
        }
    }

    private handleMovement(delta: number, elapsedTime: number, state: Record<string, boolean>): void {
        this.direction.set(0, 0, 0);
        if (state.w) this.direction.z -= 1;
        if (state.s) this.direction.z += 1;
        if (state.a) this.direction.x -= 1;
        if (state.d) this.direction.x += 1;

        this.isMoving = this.direction.lengthSq() > 0;

        // --- Handle Jump & Gravity ---
        if (state[' '] && this.group.position.y === 0) {
            this.playerVelocityY = this.JUMP_FORCE;
        }
        this.playerVelocityY -= this.GRAVITY * delta;
        this.group.position.y += this.playerVelocityY * delta;
        if (this.group.position.y < 0) {
            this.group.position.y = 0;
            this.playerVelocityY = 0;
        }

        if (this.isMoving) {
            this.direction.normalize();
            const angle = Math.atan2(this.direction.x, this.direction.z);
            this.group.rotation.y = angle;
            
            this.group.position.x += this.direction.x * this.moveSpeed * delta;
            this.group.position.z += this.direction.z * this.moveSpeed * delta;
            
            const swingAngle = Math.sin(elapsedTime * 10) * 0.6;
            this.pivots.leftLeg.rotation.x = swingAngle;
            this.pivots.rightLeg.rotation.x = -swingAngle;
            if (!this.isDefending && this.canAct) {
                this.pivots.leftArm.rotation.x = -swingAngle;
                this.pivots.rightArm.rotation.x = swingAngle;
            }
        } else {
            this.pivots.leftLeg.rotation.x = 0;
            this.pivots.rightLeg.rotation.x = 0;
            if (!this.isDefending && this.canAct) {
                this.pivots.leftArm.rotation.x = 0;
                this.pivots.rightArm.rotation.x = 0;
            }
        }
    }
    
    private handleActions(elapsedTime: number, state: Record<string, boolean>, enemy: Enemy): void {
        if (!this.canAct) return;

        if (state.j) this.attack(enemy, 8);
        if (state[';']) this.dodge();

        this.defend(state.k);

        if (state.l && !this.isCharging) {
            this.isCharging = true;
            this.chargeStartTime = elapsedTime;
        }
        if (!state.l && this.isCharging) {
            if (elapsedTime - this.chargeStartTime >= 1.0) {
                this.attack(enemy, 25, true);
            }
            this.isCharging = false;
        }
    }

    private attack(target: Enemy, damage: number, isHeavy = false): void {
        if (!this.canAct) return;
        this.canAct = false;
        
        const weaponDamage = this.equipped.weapon?.stats.damage || 0;
        const totalDamage = damage + weaponDamage;
        
        this.pivots.rightArm.rotation.x = -Math.PI / (isHeavy ? 1.5 : 2);
        
        const distance = this.group.position.distanceTo(target.group.position);
        if (distance < 2.5) {
            target.takeDamage(totalDamage);
            if (target.hp <= 0) {
                target.onDeath(this.group.position);
            }
        }

        setTimeout(() => { this.pivots.rightArm.rotation.x = 0; }, 200);
        setTimeout(() => { this.canAct = true; }, 500);
    }
    
    private defend(isKeyDown: boolean): void {
        this.isDefending = isKeyDown;
        this.pivots.leftArm.rotation.z = isKeyDown ? Math.PI / 2 : 0;
    }
    
    private dodge(): void {
        if (!this.canAct) return;
        this.canAct = false;
        this.isDodging = true;
        
        // A simple visual indicator for dodging
        const originalY = this.group.position.y;
        this.group.position.y = originalY - 0.2; 
        
        setTimeout(() => { this.group.position.y = originalY; }, 200);
        setTimeout(() => {
            this.isDodging = false;
            this.canAct = true;
        }, 600);
    }
}