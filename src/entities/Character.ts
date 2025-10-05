import * as THREE from 'three';
import { type Item } from '../game/items';

export interface CharacterPivots {
    leftLeg: THREE.Group; rightLeg: THREE.Group;
    leftArm: THREE.Group; rightArm: THREE.Group;
}
export interface CharacterHpBar {
    group: THREE.Group;
    foreground: THREE.Mesh;
}

export abstract class Character {
    public group: THREE.Group;
    public hp: number;
    public maxHp = 100;
    public inventory: Item[] = [];
    public equipped: { weapon: Item | null } = { weapon: null };
    public pivots: CharacterPivots;
    public hpBar?: CharacterHpBar;

    constructor(color: THREE.ColorRepresentation, isPlayer: boolean) {
        this.hp = this.maxHp;
        const { group, pivots } = this.createModel(color);
        this.group = group;
        this.pivots = pivots;
        
        if (!isPlayer) {
            this.hpBar = this.createHpBar();
            this.group.add(this.hpBar.group);
        }
    }

    private createModel(color: THREE.ColorRepresentation): { group: THREE.Group, pivots: CharacterPivots } {
        const group = new THREE.Group();
        const material = new THREE.MeshPhongMaterial({ color });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.4), material);
        torso.position.y = 1.3;
        group.add(torso);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 16), material);
        head.position.y = torso.position.y + 0.7;
        group.add(head);

        const leftLegPivot = new THREE.Group();
        leftLegPivot.position.set(-0.2, 0.8, 0);
        const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16), material);
        leftLeg.position.y = -0.4;
        leftLegPivot.add(leftLeg);
        group.add(leftLegPivot);

        const rightLegPivot = new THREE.Group();
        rightLegPivot.position.set(0.2, 0.8, 0);
        const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16), material);
        rightLeg.position.y = -0.4;
        rightLegPivot.add(rightLeg);
        group.add(rightLegPivot);

        const leftArmPivot = new THREE.Group();
        leftArmPivot.position.set(-0.5, 1.8, 0);
        const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), material);
        leftArm.position.y = -0.45;
        leftArmPivot.add(leftArm);
        group.add(leftArmPivot);

        const rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(0.5, 1.8, 0);
        const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), material);
        rightArm.position.y = -0.45;
        rightArmPivot.add(rightArm);
        group.add(rightArmPivot);

        const pivots = { leftLeg: leftLegPivot, rightLeg: rightLegPivot, leftArm: leftArmPivot, rightArm: rightArmPivot };
        return { group, pivots };
    }
    
    private createHpBar(): CharacterHpBar {
        const hpBarGroup = new THREE.Group();
        const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.8 });
        const barBackground = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.2), backgroundMaterial);
        
        const foregroundMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const barForeground = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.2), foregroundMaterial);
        barForeground.position.z = 0.01;
        
        hpBarGroup.add(barBackground, barForeground);
        hpBarGroup.position.y = 2.5;
        hpBarGroup.visible = false;
        
        return { group: hpBarGroup, foreground: barForeground };
    }

    public takeDamage(damage: number): void {
        this.hp -= damage;
        if (this.hp < 0) this.hp = 0;
    }
    
    public reset(position = new THREE.Vector3(0, 0, 0)): void {
        this.hp = this.maxHp;
        this.group.position.copy(position);
        this.inventory = [];
        this.equipped.weapon = null;
    }

    abstract update(delta: number, ...args: any[]): void;
}