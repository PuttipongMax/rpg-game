import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type TokenTypes = 'bronze' | 'silver' | 'gold';

export class World {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    private activeChunks: Map<string, THREE.Group> = new Map();
    private readonly CHUNK_SIZE = 20;
    private readonly VISIBLE_CHUNKS = 5;

    // Materials & Geometries
    private groundMaterial = new THREE.MeshPhongMaterial({ color: 0x88dd88 });
    private trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    private leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    private tokenGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    private tokenMaterials = {
        bronze: new THREE.MeshPhongMaterial({ color: 0xCD7F32 }),
        silver: new THREE.MeshPhongMaterial({ color: 0xAAAAAA }),
        gold: new THREE.MeshPhongMaterial({ color: 0xFFD700 }),
    };

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        this.camera.position.set(0, 5, 15);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.addLights();
        this.updateChunks(new THREE.Vector3(0, 0, 0)); // Initial chunk generation
    }

    private addLights(): void {
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
        this.scene.add(hemisphereLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);
    }
    
    public add(object: THREE.Object3D) { this.scene.add(object); }
    public remove(object: THREE.Object3D) { this.scene.remove(object); }
    public getScene(): THREE.Scene { return this.scene; }
    public getCamera(): THREE.PerspectiveCamera { return this.camera; }

    public update(playerPosition: THREE.Vector3) {
        this.updateChunks(playerPosition);
        this.controls.update();
    }
    
    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private updateChunks(position: THREE.Vector3) {
        const currentChunkX = Math.round(position.x / this.CHUNK_SIZE);
        const currentChunkZ = Math.round(position.z / this.CHUNK_SIZE);
        const halfVisible = Math.floor(this.VISIBLE_CHUNKS / 2);

        for (let i = -halfVisible; i <= halfVisible; i++) {
            for (let j = -halfVisible; j <= halfVisible; j++) {
                const xIndex = currentChunkX + j;
                const zIndex = currentChunkZ + i;
                const chunkId = `${xIndex},${zIndex}`;
                if (!this.activeChunks.has(chunkId)) {
                    const newChunk = this.createChunk(zIndex, xIndex);
                    this.activeChunks.set(chunkId, newChunk);
                    this.scene.add(newChunk);
                }
            }
        }
        
        for (const [chunkId, chunk] of this.activeChunks.entries()) {
            const [xIndex, zIndex] = chunkId.split(',').map(Number);
            if (Math.abs(xIndex - currentChunkX) > halfVisible + 1 || Math.abs(zIndex - currentChunkZ) > halfVisible + 1) {
                this.scene.remove(chunk);
                this.activeChunks.delete(chunkId);
            }
        }
    }
    
    private createChunk(zIndex: number, xIndex: number): THREE.Group {
        const chunk = new THREE.Group();
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(this.CHUNK_SIZE, this.CHUNK_SIZE), this.groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        chunk.add(ground);

        const treeCount = THREE.MathUtils.randInt(3, 5);
        for (let i = 0; i < treeCount; i++) {
            const x = THREE.MathUtils.randFloat(-this.CHUNK_SIZE / 2, this.CHUNK_SIZE / 2);
            const z = THREE.MathUtils.randFloat(-this.CHUNK_SIZE / 2, this.CHUNK_SIZE / 2);
            chunk.add(this.createTree(x, z));
        }
        
        const tokenCount = THREE.MathUtils.randInt(2, 4);
        for (let i = 0; i < tokenCount; i++) {
            const x = THREE.MathUtils.randFloat(-this.CHUNK_SIZE / 2, this.CHUNK_SIZE / 2);
            const z = THREE.MathUtils.randFloat(-this.CHUNK_SIZE / 2, this.CHUNK_SIZE / 2);
            const rand = Math.random();
            if (rand < 0.6) chunk.add(this.createToken(x, z, this.tokenMaterials.silver, 'silver'));
            else if (rand < 0.9) chunk.add(this.createToken(x, z, this.tokenMaterials.bronze, 'bronze'));
            else chunk.add(this.createToken(x, z, this.tokenMaterials.gold, 'gold'));
        }
        
        chunk.position.set(xIndex * this.CHUNK_SIZE, 0, zIndex * this.CHUNK_SIZE);
        return chunk;
    }
    
    private createTree(x: number, z: number): THREE.Group {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.5), this.trunkMaterial);
        trunk.position.y = 1;
        const leaves = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 1.5), this.leavesMaterial);
        leaves.position.y = 2.5;
        tree.add(trunk, leaves);
        tree.position.set(x, 0, z);
        return tree;
    }

    private createToken(x: number, z: number, material: THREE.Material, type: TokenTypes): THREE.Mesh {
        const token = new THREE.Mesh(this.tokenGeometry, material);
        token.position.set(x, 0.05, z);
        token.userData = { type };
        return token;
    }
}