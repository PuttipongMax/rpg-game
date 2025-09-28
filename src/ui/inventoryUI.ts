// // src/ui/inventoryUI.ts
// import type { Item } from '../game/items';
// // import { equipItem } from '../game/mainGame';

// const inventoryPanel = document.getElementById('inventory-panel')!;
// const inventoryGrid = document.getElementById('inventory-grid')!;

// let isOpen = false;

// interface PlayerState { // สร้าง Type ชั่วคราวให้ตรงกับ game.ts
//     inventory: Item[];
//     equipped: { weapon: Item | null };
// }

// export function toggleInventory(player: PlayerState) {
//     isOpen = !isOpen;
//     inventoryPanel.classList.toggle('hidden', !isOpen);
//     if (isOpen) {
//         updateInventoryUI(player);
//     }
// }

// export function updateInventoryUI(player: PlayerState) {
//     inventoryGrid.innerHTML = ''; // ล้างของเก่า

//     player.inventory.forEach(item => {
//         const slot = document.createElement('div');
//         slot.className = 'inventory-slot';
//         slot.textContent = item.name;

//         // ถ้า item นี้ถูกสวมใส่อยู่ ให้เพิ่ม class 'equipped'
//         if (player.equipped.weapon?.id === item.id) {
//             slot.classList.add('equipped');
//         }

//         // เพิ่ม event listener ให้กับ slot
//         slot.addEventListener('click', () => {
//             equipItem(item);
//         });
        
//         inventoryGrid.appendChild(slot);
//     });
// }