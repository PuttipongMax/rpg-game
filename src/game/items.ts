export interface ItemStats {
  damage?: number;
  defense?: number;
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable';
  stats: ItemStats;
}

export const ITEMS: { [id: string]: Item } = {
  'sword': {
    id: 'sword',
    name: 'Basic Sword',
    type: 'weapon',
    stats: {
        damage: 10
    }
  }
};