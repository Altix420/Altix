import Dexie, { Table } from 'dexie';

export interface BorradorVenta {
  id?: number;
  cliente_id: string;
  items: Array<{ producto_id: string; cantidad: number; precio: number }>;
  created_at: string;
}

export interface CatalogoCache {
  id: string;
  nombre: string;
  sku: string;
  precio_base: number;
  precio_mayorista: number;
  stock: number;
}

class AltixOfflineDB extends Dexie {
  borradores!: Table<BorradorVenta>;
  catalogo!: Table<CatalogoCache>;

  constructor() {
    super('AltixOfflineDB');
    this.version(1).stores({
      borradores: '++id, cliente_id, created_at',
      catalogo: 'id, sku, nombre'
    });
  }
}

export const offlineDB = new AltixOfflineDB();
