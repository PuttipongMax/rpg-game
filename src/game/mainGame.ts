import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { io, Socket } from 'socket.io-client';
import { setContent } from '../router';
import { type Item, ITEMS } from './items';

// --- 1. TYPE DEFINITIONS ---
interface Player {
    group: THREE.Group;
    pivots: {
        leftLeg: THREE.Group; rightLeg: THREE.Group;
        leftArm: THREE.Group; rightArm: THREE.Group;
    };
    hp: number;
    isDefending: boolean;
    isDodging: boolean;
    inventory: Item[];
    equipped: { weapon: Item | null; };
    hpBar?: { group: THREE.Group; foreground: THREE.Mesh; };
}
interface GameInventory { bronze: number; silver: number; gold: number; }
type TokenTypes = keyof GameInventory;

// --- 2. startGame FUNCTION ---
export function startGame() {

    // --- A. INITIAL HTML & UI SETUP ---
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

    // --- B. THREE.JS & SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 5, 15);
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
    scene.add(light);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // --- C. GAME STATE & VARIABLES ---
    let player: Player;
    let enemy: Player;
    let socket: Socket;
    const otherPlayers = new Map<string, Player>();
    const clock = new THREE.Clock();
    const moveSpeed = 5.0;
    const keyboardState: Record<string, boolean> = { w: false, a: false, s: false, d: false, ' ': false, j: false, k: false, l: false, ';': false, i: false };
    let gameInventory: GameInventory = { bronze: 0, silver: 0, gold: 0 };
    let isPaused = false, isGameOver = false, canAct = true, isCharging = false;
    let chargeStartTime = 0, playerVelocityY = 0;
    const GRAVITY = 20.0, JUMP_FORCE = 10.0;
    let enemyCanAttack = true, isInventoryOpen = false;
    let activeChunks: Map<string, THREE.Group> = new Map();
    const CHUNK_SIZE = 20;
    const VISIBLE_CHUNKS = 5;
    // const direction = new THREE.Vector3();

    // --- D. UI ELEMENT REFERENCES ---
    const pauseMessage = document.getElementById('pauseMessage') as HTMLDivElement;
    const playerHpBar = document.getElementById('player-hp-bar') as HTMLDivElement;
    const goldTokenSpan = document.getElementById('gold-token') as HTMLSpanElement;
    const silverTokenSpan = document.getElementById('silver-token') as HTMLSpanElement;
    const bronzeTokenSpan = document.getElementById('bronze-token') as HTMLSpanElement;
    const inventoryPanel = document.getElementById('inventory-panel')!;
    const inventoryGrid = document.getElementById('inventory-grid')!;
    const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;

    // [เพิ่มใหม่] Materials for chunks
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x88dd88 });
    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    const tokenGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const bronzeTokenMaterial = new THREE.MeshPhongMaterial({ color: 0xCD7F32 });
    const silverTokenMaterial = new THREE.MeshPhongMaterial({ color: 0xAAAAAA });
    const goldTokenMaterial = new THREE.MeshPhongMaterial({ color: 0xFFD700 });

    // [เพิ่มใหม่] ฟังก์ชันสร้างฉาก
    function createTree(x: number, z: number): THREE.Group {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.5), trunkMaterial);
        trunk.position.y = 1;
        const leaves = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 1.5), leavesMaterial);
        leaves.position.y = 2.5;
        tree.add(trunk, leaves);
        tree.position.set(x, 0, z);
        return tree;
    }

    function createToken(x: number, z: number, material: THREE.Material, type: TokenTypes): THREE.Mesh {
        const token = new THREE.Mesh(tokenGeometry, material);
        token.position.set(x, 0.05, z);
        token.userData = { type };
        return token;
    }
    function createChunk(zIndex: number, xIndex: number): THREE.Group {
        const chunk = new THREE.Group();
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE), groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        chunk.add(ground);
        const treeCount = THREE.MathUtils.randInt(3, 5);
        for (let i = 0; i < treeCount; i++) {
            const x = THREE.MathUtils.randFloat(-CHUNK_SIZE / 2, CHUNK_SIZE / 2);
            const z = THREE.MathUtils.randFloat(-CHUNK_SIZE / 2, CHUNK_SIZE / 2);
            chunk.add(createTree(x, z));
        }
        const tokenCount = THREE.MathUtils.randInt(2, 4);
        for (let i = 0; i < tokenCount; i++) {
            const x = THREE.MathUtils.randFloat(-CHUNK_SIZE / 2, CHUNK_SIZE / 2);
            const z = THREE.MathUtils.randFloat(-CHUNK_SIZE / 2, CHUNK_SIZE / 2);
            const rand = Math.random();
            if (rand < 0.6) { chunk.add(createToken(x, z, silverTokenMaterial, 'silver')); }
            else if (rand < 0.9) { chunk.add(createToken(x, z, bronzeTokenMaterial, 'bronze')); }
            else { chunk.add(createToken(x, z, goldTokenMaterial, 'gold')); }
        }
        chunk.position.set(xIndex * CHUNK_SIZE, 0, zIndex * CHUNK_SIZE);
        scene.add(chunk);
        return chunk;
    }

    function updateChunks() {
        if (!player) return;
        const currentChunkX = Math.round(player.group.position.x / CHUNK_SIZE);
        const currentChunkZ = Math.round(player.group.position.z / CHUNK_SIZE);
        const halfVisible = Math.floor(VISIBLE_CHUNKS / 2);

        // Create new chunks
        for (let i = -halfVisible; i <= halfVisible; i++) {
            for (let j = -halfVisible; j <= halfVisible; j++) {
                const xIndex = currentChunkX + j;
                const zIndex = currentChunkZ + i;
                const chunkId = `${xIndex},${zIndex}`;
                if (!activeChunks.has(chunkId)) {
                    activeChunks.set(chunkId, createChunk(zIndex, xIndex));
                }
            }
        }
        
        // Remove old chunks
        for (const [chunkId, chunk] of activeChunks.entries()) {
            const [xIndex, zIndex] = chunkId.split(',').map(Number);
            if (Math.abs(xIndex - currentChunkX) > halfVisible + 1 || Math.abs(zIndex - currentChunkZ) > halfVisible + 1) {
                scene.remove(chunk);
                // You should properly dispose of geometries and materials here
                activeChunks.delete(chunkId);
            }
        }
    }

    // --- E. CORE GAME FUNCTIONS ---
    function createHuman(color: THREE.ColorRepresentation, isPlayer: boolean = false): Player {
        const group = new THREE.Group();
        const material = new THREE.MeshPhongMaterial({ color });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.4), material); torso.position.y = 1.3; group.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 16), material); head.position.y = torso.position.y + 0.7; group.add(head);
        const leftLegPivot = new THREE.Group(); leftLegPivot.position.set(-0.2, 0.8, 0); const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16), material); leftLeg.position.y = -0.4; leftLegPivot.add(leftLeg); group.add(leftLegPivot);
        const rightLegPivot = new THREE.Group(); rightLegPivot.position.set(0.2, 0.8, 0); const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16), material); rightLeg.position.y = -0.4; rightLegPivot.add(rightLeg); group.add(rightLegPivot);
        const leftArmPivot = new THREE.Group(); leftArmPivot.position.set(-0.5, 1.8, 0); const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), material); leftArm.position.y = -0.45; leftArmPivot.add(leftArm); group.add(leftArmPivot);
        const rightArmPivot = new THREE.Group(); rightArmPivot.position.set(0.5, 1.8, 0); const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), material); rightArm.position.y = -0.45; rightArmPivot.add(rightArm); group.add(rightArmPivot);
        const human: Player = { group, pivots: { leftLeg: leftLegPivot, rightLeg: rightLegPivot, leftArm: leftArmPivot, rightArm: rightArmPivot }, hp: 100, isDefending: false, isDodging: false, inventory: [], equipped: { weapon: null } };
        if (!isPlayer) {
            const hpBarGroup = new THREE.Group();
            const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.8 });
            const barBackground = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.2), backgroundMaterial);
            const foregroundMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const barForeground = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.2), foregroundMaterial); barForeground.position.z = 0.01;
            hpBarGroup.add(barBackground, barForeground); hpBarGroup.position.y = 2.5; hpBarGroup.visible = false;
            human.group.add(hpBarGroup); human.hpBar = { group: hpBarGroup, foreground: barForeground };
        }
        return human;
    }
    function attack(damage: number, isHeavy: boolean = false) {
        if (!canAct || isPaused) return;
        canAct = false;
        const weaponDamage = player.equipped.weapon?.stats.damage || 0;
        const totalDamage = damage + weaponDamage;
        player.pivots.rightArm.rotation.x = -Math.PI / (isHeavy ? 1.5 : 2);
        const distance = player.group.position.distanceTo(enemy.group.position);
        if (distance < 2.5) {
            enemy.hp -= totalDamage;
            if (enemy.hp < 0) enemy.hp = 0;
            if (enemy.hp <= 0) {
                scene.remove(enemy.group);
                enemy = createHuman(0xff0000);
                const angle = Math.random() * Math.PI * 2, spawnDistance = 20;
                const newX = player.group.position.x + Math.sin(angle) * spawnDistance;
                const newZ = player.group.position.z + Math.cos(angle) * spawnDistance;
                enemy.group.position.set(newX, 0, newZ);
                scene.add(enemy.group);
            }
        }
        setTimeout(() => { player.pivots.rightArm.rotation.x = 0; }, 200);
        setTimeout(() => { canAct = true; }, 500);
    }
    function defend(isKeyDown: boolean) { player.isDefending = isKeyDown; player.pivots.leftArm.rotation.z = isKeyDown ? Math.PI / 2 : 0; }
    function dodge() { if (!canAct || isPaused) return; canAct = false; player.isDodging = true; player.group.rotation.x = Math.PI; setTimeout(() => { player.group.rotation.x = 0; }, 200); setTimeout(() => { player.isDodging = false; canAct = true; }, 600); }
    function updateTokenUI() { if (gameInventory.bronze >= 100) { gameInventory.silver += Math.floor(gameInventory.bronze / 100); gameInventory.bronze %= 100; } if (gameInventory.silver >= 100) { gameInventory.gold += Math.floor(gameInventory.silver / 100); gameInventory.silver %= 100; } goldTokenSpan.textContent = gameInventory.gold.toString(); silverTokenSpan.textContent = gameInventory.silver.toString(); bronzeTokenSpan.textContent = gameInventory.bronze.toString(); }
    function updateHpBars() { playerHpBar.style.width = `${player.hp}%`; }
    function togglePause() { if (isGameOver) return; isPaused ? resumeGame() : pauseGame(); }
    function pauseGame() { if (isGameOver) return; isPaused = true; pauseMessage.textContent = "PAUSED"; pauseMessage.classList.remove('hidden'); }
    function resumeGame() { isPaused = false; pauseMessage.classList.add('hidden'); animate(); }
    function gameOver() { isPaused = true; isGameOver = true; pauseMessage.innerHTML = 'GAME OVER<div style="font-size: 0.3em; margin-top: 20px;">Click to Respawn</div>'; pauseMessage.classList.remove('hidden'); }
    function restartGame() { if (!isGameOver) return; player.hp = 100; player.group.position.set(0, 0, 0); player.inventory = []; player.equipped.weapon = null; scene.remove(enemy.group); enemy = createHuman(0xff0000); enemy.group.position.set(5, 0, -10); scene.add(enemy.group); gameInventory = { bronze: 0, silver: 0, gold: 0 }; updateTokenUI(); updateHpBars(); updateInventoryUI(); pauseMessage.classList.add('hidden'); isGameOver = false; isPaused = false; animate(); }
    function toggleInventory() { isInventoryOpen = !isInventoryOpen; inventoryPanel.classList.toggle('hidden', !isInventoryOpen); if (isInventoryOpen) { updateInventoryUI(); } }
    function updateInventoryUI() { inventoryGrid.innerHTML = ''; player.inventory.forEach(item => { const slot = document.createElement('div'); slot.className = 'inventory-slot'; slot.textContent = item.name; if (player.equipped.weapon?.id === item.id) slot.classList.add('equipped'); slot.onclick = () => equipItem(item); inventoryGrid.appendChild(slot); }); }
    function equipItem(item: Item) { if (item.type === 'weapon') { player.equipped.weapon = player.equipped.weapon?.id === item.id ? null : item; updateInventoryUI(); } }
    function updateEnemy(delta: number) { if (isPaused || !enemy) return; const distance = player.group.position.distanceTo(enemy.group.position); if (enemy.hpBar) { const HP_BAR_VISIBLE_DISTANCE = 15; if (distance < HP_BAR_VISIBLE_DISTANCE) { enemy.hpBar.group.visible = true; enemy.hpBar.group.quaternion.copy(camera.quaternion); enemy.hpBar.foreground.scale.x = Math.max(0, enemy.hp / 100); } else { enemy.hpBar.group.visible = false; } } enemy.group.lookAt(player.group.position); if (distance > 2.0) { const moveDirection = new THREE.Vector3().subVectors(player.group.position, enemy.group.position).normalize(); enemy.group.position.addScaledVector(moveDirection, delta * (moveSpeed / 2)); } else if (enemyCanAttack) { enemyCanAttack = false; let finalDamage = 8; if (player.isDefending) finalDamage /= 2; if (!player.isDodging) player.hp -= finalDamage; if (player.hp < 0) player.hp = 0; setTimeout(() => { enemyCanAttack = true; }, 1500); } }
    
    function updateAllPlayers(serverPlayers: Record<string, { x: number, y: number, z: number }>) {
        const serverPlayerIds = Object.keys(serverPlayers);
        const clientPlayerIds = Array.from(otherPlayers.keys());
        clientPlayerIds.forEach(id => {
            if (!serverPlayerIds.includes(id)) {
                const playerToRemove = otherPlayers.get(id);
                if (playerToRemove) {
                    scene.remove(playerToRemove.group);
                    otherPlayers.delete(id);
                }
            }
        });
        serverPlayerIds.forEach(id => {
            if (id !== socket.id) {
                const serverPos = serverPlayers[id];
                let clientPlayer = otherPlayers.get(id);
                if (!clientPlayer) {
                    const newPlayer = createHuman(0x00ff00);
                    newPlayer.group.position.set(serverPos.x, serverPos.y, serverPos.z);
                    otherPlayers.set(id, newPlayer);
                    scene.add(newPlayer.group);
                }
            }
        });
    }

    function setupSocketIO() {
        socket = io('http://localhost:3000');
        socket.on('connect', () => console.log('Connected to server!', socket.id) );
        socket.on('updatePlayers', (serverPlayers) => {
            updateAllPlayers(serverPlayers);
        });
        socket.on('playerMoved', (data: { id: string, position: { x: number, y: number, z: number } }) => {
            const playerToMove = otherPlayers.get(data.id);
            if (playerToMove) {
                playerToMove.group.position.lerp(new THREE.Vector3(data.position.x, data.position.y, data.position.z), 0.1);
            }
        });
    }

    // --- F. INITIALIZATION & GAME LOOP ---
    
    player = createHuman(0x2288ff, true);
    scene.add(player.group);
    enemy = createHuman(0xff0000);
    enemy.group.position.set(5, 0, -10);
    scene.add(enemy.group);
    const swordMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), new THREE.MeshPhongMaterial({ color: 0xaaaaaa }));
    swordMesh.name = 'sword-pickup';
    swordMesh.position.set(3, 0.5, -5);
    scene.add(swordMesh);
    
    updateHpBars();
    updateTokenUI();
    updateInventoryUI();
    setupSocketIO();

    // Event Listeners
    pauseBtn.onclick = (e) => { e.stopPropagation(); pauseGame(); };
    renderer.domElement.onclick = () => { if (isPaused && !isGameOver) resumeGame(); };
    pauseMessage.onclick = restartGame;
    document.getElementById('inventory-btn')!.onclick = toggleInventory;
    function handleKeyDown(event: KeyboardEvent) { const key = event.key.toLowerCase(); if (key === 'escape') togglePause(); if (key === 'i') toggleInventory(); if (keyboardState[key] !== undefined) { keyboardState[key] = true; } }
    function handleKeyUp(event: KeyboardEvent) { const key = event.key.toLowerCase(); if (keyboardState[key] !== undefined) { keyboardState[key] = false; } }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

    function animate() {
        if (isPaused) return;
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();
        let isMoving = false;
        
        if (canAct) {
            if (keyboardState.j) attack(8);
            if (keyboardState[';']) dodge();
            defend(keyboardState.k);
            if (keyboardState.l && !isCharging) { isCharging = true; chargeStartTime = elapsedTime; }
            if (!keyboardState.l && isCharging) { if (elapsedTime - chargeStartTime >= 1.0) { attack(25, true); } isCharging = false; }
        }
        
        const direction = new THREE.Vector3();
        direction.set(0, 0, 0);
        if (keyboardState.w) direction.z -= 1;
        if (keyboardState.s) direction.z += 1;
        if (keyboardState.a) direction.x -= 1;
        if (keyboardState.d) direction.x += 1;
        isMoving = direction.length() > 0;

        if (keyboardState[' '] && player.group.position.y === 0) { playerVelocityY = JUMP_FORCE; }
        playerVelocityY -= GRAVITY * delta;
        player.group.position.y += playerVelocityY * delta;
        if (player.group.position.y < 0) { player.group.position.y = 0; playerVelocityY = 0; }
        
        if (isMoving) {
            direction.normalize();
            const angle = Math.atan2(direction.x, direction.z);
            player.group.rotation.y = angle;
            player.group.position.x += direction.x * moveSpeed * delta;
            player.group.position.z += direction.z * moveSpeed * delta;
            const swingAngle = Math.sin(elapsedTime * 10) * 0.6;
            player.pivots.leftLeg.rotation.x = swingAngle;
            player.pivots.rightLeg.rotation.x = -swingAngle;
            if (!player.isDefending && canAct) { player.pivots.leftArm.rotation.x = -swingAngle; player.pivots.rightArm.rotation.x = swingAngle; }
        } else {
             player.pivots.leftLeg.rotation.x = 0; player.pivots.rightLeg.rotation.x = 0;
             if(!player.isDefending && canAct) { player.pivots.leftArm.rotation.x = 0; player.pivots.rightArm.rotation.x = 0; }
        }
        
        if (socket && isMoving) {
            socket.emit('playerMovement', { x: player.group.position.x, y: player.group.position.y, z: player.group.position.z });
        }

        const playerBox = new THREE.Box3().setFromObject(player.group);
        if (swordMesh.parent) {
            const swordBoundingBox = new THREE.Box3().setFromObject(swordMesh);
            if (playerBox.intersectsBox(swordBoundingBox)) {
                const swordItem = ITEMS['sword'];
                if (!player.inventory.find(item => item.id === swordItem.id)) {
                    player.inventory.push(swordItem);
                    scene.remove(swordMesh);
                    updateInventoryUI();
                }
            }
        }

        // [เพิ่มใหม่] - Token collection logic
        const currentChunkX = Math.round(player.group.position.x / CHUNK_SIZE);
        const currentChunkZ = Math.round(player.group.position.z / CHUNK_SIZE);
        for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
                const chunk = activeChunks.get(`${currentChunkX + dx},${currentChunkZ + dz}`);
                if (chunk) {
                    for (let i = chunk.children.length - 1; i >= 0; i--) {
                        const object = chunk.children[i] as THREE.Mesh;
                        if (object.userData.type && ['bronze', 'silver', 'gold'].includes(object.userData.type)) {
                            const tokenBox = new THREE.Box3().setFromObject(object);
                            if (playerBox.intersectsBox(tokenBox)) {
                                gameInventory[object.userData.type as TokenTypes]++;
                                updateTokenUI();
                                chunk.remove(object);
                            }
                        }
                    }
                }
            }
        }
        
        
        if (player.hp <= 0) {
            gameOver();
        }
        
        updateEnemy(delta);
        updateChunks();
        updateHpBars();
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}