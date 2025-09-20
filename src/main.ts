import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- [TypeScript] Type Definitions ---
interface HumanPivots {
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
}

interface HpBar {
  group: THREE.Group;
  foreground: THREE.Mesh;
}

interface Human {
  group: THREE.Group;
  pivots: HumanPivots;
  hp: number;
  isDefending: boolean;
  isDodging: boolean;
  hpBar?: HpBar; // [ปรับปรุง] เพิ่ม hpBar (optional)
}

// --- 1. Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 5, 15);
controls.update();

// --- 2. Lighting ---
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
scene.add(light);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// --- 3. Human Creation ---
function createHuman(color: THREE.ColorRepresentation, isPlayer: boolean = false): Human {
    const human: Partial<Human> = {};
    human.group = new THREE.Group();
    const material = new THREE.MeshPhongMaterial({ color });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.4), material);
    torso.position.y = 1.3;
    human.group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 16), material);
    head.position.y = torso.position.y + 0.7;
    human.group.add(head);
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.2, 0.8, 0);
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16), material);
    leftLeg.position.y = -0.4;
    leftLegPivot.add(leftLeg);
    human.group.add(leftLegPivot);
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.2, 0.8, 0);
    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16), material);
    rightLeg.position.y = -0.4;
    rightLegPivot.add(rightLeg);
    human.group.add(rightLegPivot);
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.5, 1.8, 0);
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), material);
    leftArm.position.y = -0.45;
    leftArmPivot.add(leftArm);
    human.group.add(leftArmPivot);
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.5, 1.8, 0);
    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), material);
    rightArm.position.y = -0.45;
    rightArmPivot.add(rightArm);
    human.group.add(rightArmPivot);
    human.pivots = {
        leftLeg: leftLegPivot,
        rightLeg: rightLegPivot,
        leftArm: leftArmPivot,
        rightArm: rightArmPivot,
    };
    human.hp = 100;
    human.isDefending = false;
    human.isDodging = false;

    // [เพิ่มใหม่] สร้าง HP Bar เฉพาะเมื่อไม่ใช่ Player
    if (!isPlayer) {
      const hpBarGroup = new THREE.Group();
      
      const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.8 });
      const barBackground = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.2), backgroundMaterial);
      
      const foregroundMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const barForeground = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.2), foregroundMaterial);
      barForeground.position.z = 0.01; // ขยับมาข้างหน้าเล็กน้อยเพื่อกันภาพซ้อน

      hpBarGroup.add(barBackground);
      hpBarGroup.add(barForeground);
      hpBarGroup.position.y = 2.5; // ตำแหน่งเหนือหัว
      hpBarGroup.visible = false; // ซ่อนไว้ก่อน
      human.group.add(hpBarGroup);

      human.hpBar = {
        group: hpBarGroup,
        foreground: barForeground
      };
    }

    return human as Human;
}

let player: Human = createHuman(0x2288ff, true); // ระบุว่าเป็น Player
scene.add(player.group);
let enemy: Human = createHuman(0xff0000);
enemy.group.position.set(5, 0, -10);
scene.add(enemy.group);

// --- 4. Infinite Scenery Setup (No Changes) ---
const CHUNK_SIZE = 20;
const VISIBLE_CHUNKS = 5;
let activeChunks: Map<string, THREE.Group> = new Map();
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x88dd88 });
const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x228b22 });
const tokenGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
const bronzeTokenMaterial = new THREE.MeshPhongMaterial({ color: 0xcd7f32 });
const silverTokenMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
const goldTokenMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });

function createTree(x: number, z: number): THREE.Group { /* ... unchanged ... */ 
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.5), trunkMaterial);
  trunk.position.y = 1;
  const leaves = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 1.5), leavesMaterial);
  leaves.position.y = 2.5;
  tree.add(trunk, leaves);
  tree.position.set(x, 0, z);
  return tree;
}
function createToken(x: number, z: number, material: THREE.Material, userData: object): THREE.Mesh { /* ... unchanged ... */ 
  const token = new THREE.Mesh(tokenGeometry, material);
  token.position.set(x, 0.05, z);
  token.userData = userData;
  return token;
}
function createChunk(zIndex: number, xIndex: number): THREE.Group { /* ... unchanged ... */ 
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
    if (rand < 0.6) {
      chunk.add(createToken(x, z, silverTokenMaterial, { type: 'silver', value: 1 }));
    } else if (rand < 0.9) {
      chunk.add(createToken(x, z, bronzeTokenMaterial, { type: 'bronze', value: 0.5 }));
    } else {
      chunk.add(createToken(x, z, goldTokenMaterial, { type: 'gold', value: 10 }));
    }
  }
  chunk.position.set(xIndex * CHUNK_SIZE, 0, zIndex * CHUNK_SIZE);
  scene.add(chunk);
  return chunk;
}
function updateChunks() { /* ... unchanged ... */ 
  const currentChunkX = Math.round(player.group.position.x / CHUNK_SIZE);
  const currentChunkZ = Math.round(player.group.position.z / CHUNK_SIZE);
  const halfVisible = Math.floor(VISIBLE_CHUNKS / 2);
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
  for (const [chunkId, chunk] of activeChunks.entries()) {
    const [xIndex, zIndex] = chunkId.split(',').map(Number);
    if (Math.abs(xIndex - currentChunkX) > halfVisible + 1 || Math.abs(zIndex - currentChunkZ) > halfVisible + 1) {
      scene.remove(chunk);
      chunk.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      activeChunks.delete(chunkId);
    }
  }
}

// --- 5. Keyboard Controls Setup [ปรับปรุงใหม่] ---
const keyboardState: { [key: string]: boolean } = { 
  w: false, a: false, s: false, d: false, ' ': false, 
  j: false, k: false, l: false, ';': false 
};
// สร้างฟังก์ชันสำหรับจัดการการกดปุ่ม
function handleKeyDown(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  if (key === 'escape') { // [เพิ่มใหม่] จัดการปุ่ม Escape
    togglePause();
  }
  if (keyboardState[key] !== undefined) {
    keyboardState[key] = true;
    // บรรทัดนี้สำหรับ Debug: แสดงผลใน Console เมื่อมีการกดปุ่ม
    console.log(`Key down: '${key}'`); 
  }
}
// สร้างฟังก์ชันสำหรับจัดการการปล่อยปุ่ม
function handleKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (keyboardState[key] !== undefined) {
        keyboardState[key] = false;
    }
}
// ผูก Event Listeners เข้ากับฟังก์ชันที่สร้างขึ้น
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// [เพิ่มใหม่] Event listener สำหรับปุ่ม Pause และ Resume
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
pauseBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // หยุดไม่ให้ event click ทะลุไปถึง canvas
  pauseGame();
});
renderer.domElement.addEventListener('click', () => {
  if (isPaused && player.hp > 0) { // Resume ได้ต่อเมื่อ Pause อยู่ และยังไม่ Game Over
    resumeGame();
  }
});

// --- 6. Animation Loop & Game Logic ---
const clock = new THREE.Clock();
const moveSpeed = 5.0;
const direction = new THREE.Vector3();
let isMoving = false;
// let animationId: number;
let isPaused = false;
let isGameOver = false;
const playerBox = new THREE.Box3();
const enemyBox = new THREE.Box3();
let score = 0;
const scoreBoard = document.getElementById('scoreBoard') as HTMLDivElement;
const pauseMessage = document.getElementById('pauseMessage') as HTMLDivElement;
const playerHpBar = document.getElementById('player-hp-bar') as HTMLDivElement;
// const enemyHpUi = document.getElementById('enemy-hp-ui') as HTMLDivElement;
// const enemyHpBar = document.getElementById('enemy-hp-bar') as HTMLDivElement;
let canAct = true;
let isCharging = false;
let chargeStartTime = 0;
let playerVelocityY = 0;
const GRAVITY = 20.0;
const JUMP_FORCE = 10.0;
let enemyCanAttack = true; // [เพิ่มใหม่] Cooldown สำหรับศัตรู

// --- [เพิ่มใหม่] Pause, Resume, and Game Over Logic ---
function togglePause() {
  if(isGameOver) return; // ถ้าเกมจบแล้ว กด esc ไม่ได้
  isPaused ? resumeGame() : pauseGame();
}
function pauseGame() {
  if(isGameOver) return;
  isPaused = true;
  pauseMessage.textContent = "PAUSED";
  pauseMessage.style.display = 'block';
}
function resumeGame() {
  isPaused = false;
  pauseMessage.style.display = 'none';
  animate(); // กลับมาทำงานต่อ
}

function gameOver() {
  isPaused = true;
  isGameOver = true;
  pauseMessage.innerHTML = 'GAME OVER<div style="font-size: 0.3em; margin-top: 20px;">Click to Respawn</div>';
  pauseMessage.style.display = 'block';
}

function updateScoreBoard() { scoreBoard.textContent = `Score: ${score}`; }
function updateHpBars() {
  playerHpBar.style.width = `${player.hp}%`;
  // enemyHpBar.style.width = `${enemy.hp}%`;
  // enemyHpUi.style.display = 'block';
}
// function showPauseMessage() { pauseMessage.style.display = 'block'; }
function attack(damage: number, isHeavy: boolean = false) {
    if (!canAct || isPaused) return;
    canAct = false;
    player.pivots.rightArm.rotation.x = -Math.PI / (isHeavy ? 1.5 : 2);
    const distance = player.group.position.distanceTo(enemy.group.position);
    if (distance < 2.5) {
      let finalDamage = damage;
      if (enemy.isDefending) { finalDamage /= 2; }
      enemy.hp -= finalDamage;
      if (enemy.hp < 0) enemy.hp = 0;
      // ถ้าศัตรูตาย
      if (enemy.hp <= 0) {
        scene.remove(enemy.group);
        enemy = createHuman(0xff0000); // สร้างศัตรูตัวใหม่
        // สุ่มตำแหน่งเกิดใหม่
        const angle = Math.random() * Math.PI * 2;
        const spawnDistance = 20;
        const newX = player.group.position.x + Math.sin(angle) * spawnDistance;
        const newZ = player.group.position.z + Math.cos(angle) * spawnDistance;
        enemy.group.position.set(newX, 0, newZ);
        scene.add(enemy.group);
      }
    }
    setTimeout(() => { player.pivots.rightArm.rotation.x = 0; }, 200);
    setTimeout(() => { canAct = true; }, 500);
}
function defend(isKeyDown: boolean) {
    player.isDefending = isKeyDown;
    player.pivots.leftArm.rotation.z = isKeyDown ? Math.PI / 2 : 0;
}
function dodge() {
  if (!canAct || isPaused) return;
  canAct = false;
  player.isDodging = true;
  player.group.rotation.x = Math.PI;
  setTimeout(() => {
    player.group.rotation.x = 0;
  }, 200);
  setTimeout(() => {
    player.isDodging = false;
    canAct = true;
  }, 600);
}
// [เพิ่มใหม่] - ฟังก์ชันสำหรับ AI ของศัตรู
function updateEnemy(delta: number) {
    if (isPaused || !enemy) return;
    const distance = player.group.position.distanceTo(enemy.group.position);
    
    // [เพิ่มใหม่] - Logic การแสดงผล HP Bar ของศัตรู
    if (enemy.hpBar) {
      const HP_BAR_VISIBLE_DISTANCE = 15;
      if (distance < HP_BAR_VISIBLE_DISTANCE) {
          enemy.hpBar.group.visible = true;
          // ทำให้ HP bar หันหน้าเข้าหากล้องเสมอ
          enemy.hpBar.group.quaternion.copy(camera.quaternion);
          // อัปเดตความยาวของแถบ HP
          enemy.hpBar.foreground.scale.x = Math.max(0, enemy.hp / 100);
      } else {
          enemy.hpBar.group.visible = false;
      }
    }
    
    // ทำให้ศัตรูหันหน้าหาผู้เล่น
    enemy.group.lookAt(player.group.position);
    // AI การเคลื่อนที่และโจมตี
    if (distance > 2.0) {
        // เดินเข้าหาผู้เล่น
        const moveDirection = new THREE.Vector3().subVectors(player.group.position, enemy.group.position).normalize();
        enemy.group.position.addScaledVector(moveDirection, delta * (moveSpeed / 2)); // เดินช้ากว่าผู้เล่น
    } else if (enemyCanAttack) {
        // โจมตีผู้เล่น
        enemyCanAttack = false;
        let finalDamage = 8; // Damage ของศัตรู
        if (player.isDefending) finalDamage /= 2;
        if (!player.isDodging) player.hp -= finalDamage; // ถ้าหลบอยู่จะไม่โดน Damage
        if (player.hp < 0) player.hp = 0;
        
        setTimeout(() => { enemyCanAttack = true; }, 1500); // Cooldown การโจมตีของศัตรู
    }
}
function animate() {
  try{
    if (isPaused) return;
    // requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    if (canAct) {
      if (keyboardState.j) attack(8);
      if (keyboardState[';']) dodge();
      defend(keyboardState.k);
      if (keyboardState.l && !isCharging) {
        isCharging = true;
        chargeStartTime = elapsedTime;
      }
      if (!keyboardState.l && isCharging) {
        const chargeTime = elapsedTime - chargeStartTime;
        if (chargeTime >= 1.0) {
          attack(25, true);
        }
        isCharging = false;
      }
    }
    direction.set(0, 0, 0);
    if (keyboardState.w) direction.z -= 1;
    if (keyboardState.s) direction.z += 1;
    if (keyboardState.a) direction.x -= 1;
    if (keyboardState.d) direction.x += 1;
    isMoving = direction.length() > 0;
    if (keyboardState[' '] && player.group.position.y === 0) {
      playerVelocityY = JUMP_FORCE;
    }
    playerVelocityY -= GRAVITY * delta;
    player.group.position.y += playerVelocityY * delta;
    if (player.group.position.y < 0) {
      player.group.position.y = 0;
      playerVelocityY = 0;
    }

    if (isMoving && !player.isDodging) {
      const swingAngle = Math.sin(elapsedTime * 10) * 0.6;
      player.pivots.leftLeg.rotation.x = swingAngle;
      player.pivots.rightLeg.rotation.x = -swingAngle;
      if (!player.isDefending && canAct) {
        player.pivots.leftArm.rotation.x = -swingAngle;
        player.pivots.rightArm.rotation.x = swingAngle;
      }
    } else if(!isMoving && !player.isDodging) {
      player.pivots.leftLeg.rotation.x = 0;
      player.pivots.rightLeg.rotation.x = 0;
      if (!player.isDefending && canAct) {
        player.pivots.leftArm.rotation.x = 0;
        player.pivots.rightArm.rotation.x = 0;
      }
    }
    if (isMoving) {
      direction.normalize();
      const angle = Math.atan2(direction.x, direction.z);
      player.group.rotation.y = angle;
      player.group.position.x += direction.x * moveSpeed * delta;
      player.group.position.z += direction.z * moveSpeed * delta;
    }
    const currentChunkX = Math.round(player.group.position.x / CHUNK_SIZE);
    const currentChunkZ = Math.round(player.group.position.z / CHUNK_SIZE);
    for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
            const chunkId = `${currentChunkX + dx},${currentChunkZ + dz}`;
            const chunkToCheck = activeChunks.get(chunkId);
            if (chunkToCheck) {
                for (let i = chunkToCheck.children.length - 1; i >= 0; i--) {
                    const object = chunkToCheck.children[i] as THREE.Mesh;
                    if (object.userData.type) {
                        const distance = player.group.position.distanceTo(object.getWorldPosition(new THREE.Vector3()));
                        if (distance < 1.0) {
                            score += object.userData.value;
                            updateScoreBoard();
                            chunkToCheck.remove(object);
                        }
                    }
                }
            }
        }
    }
    // [ปรับปรุง] - เงื่อนไข Game Over
    if (player.hp <= 0) {
      gameOver();
    }
    // [เพิ่มใหม่] - อัปเดต AI ของศัตรู
    updateEnemy(delta);
    const idealCameraPosition = new THREE.Vector3(player.group.position.x, 5, player.group.position.z + 15);
    camera.position.lerp(idealCameraPosition, delta * 2.0);
    const idealTarget = new THREE.Vector3(player.group.position.x, player.group.position.y + 1.3, player.group.position.z);
    controls.target.lerp(idealTarget, delta * 2.0);
    controls.update();
    updateChunks();
    updateHpBars();
    renderer.render(scene, camera);
  }catch(error){
    // ถ้าเกิด Error ขึ้น ให้แสดงใน Console แต่ไม่หยุดเกม
    console.error("An error occurred in the game loop, but the game continues:", error);
  } finally {
    // บล็อก finally จะทำงานเสมอ ไม่ว่า try จะสำเร็จหรือเกิด error
    if (!isPaused) {
      requestAnimationFrame(animate);
    }
  }
}

// [เพิ่มใหม่] - ฟังก์ชันสำหรับรีสตาร์ทเกม
function restartGame() {
  if(!isGameOver) return;
  // Reset player
  player.hp = 100;
  player.group.position.set(0, 0, 0);

  // Reset enemy
  scene.remove(enemy.group);
  enemy = createHuman(0xff0000);
  enemy.group.position.set(5, 0, -10);
  scene.add(enemy.group);

  // Reset score and UI
  score = 0;
  updateScoreBoard();
  updateHpBars();
  pauseMessage.style.display = 'none';

  // Restart game loop
  isGameOver = false;
  isPaused = false;
  animate();
}
// [เพิ่มใหม่] - Event listener สำหรับปุ่ม Respawn
pauseMessage.addEventListener('click', restartGame);

// Initial Calls
updateScoreBoard();
updateHpBars();
updateChunks();
animate();

// Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});