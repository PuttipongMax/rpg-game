// src/game/items.ts

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'consumable';
  stats: {
    damage?: number;
    hp?: number;
  };
}

export const ITEMS: Record<string, Item> = {
  'sword': {
    id: 'sword',
    name: 'Simple Sword',
    type: 'weapon',
    stats: {
      damage: 5,
    }
  }
};