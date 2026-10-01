import Dexie, { type Table } from 'dexie';

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

export interface ConteoBorrador {
  id: string;
  conteo_id: string;
  items: Array<{ producto_id: string; stock_sistema: number; stock_fisico: number }>;
  updated_at: string;
}

export class AltixOfflineDB extends Dexie {
  borradores!: Table<BorradorVenta>;
  catalogo!: Table<CatalogoCache>;
  conteos!: Table<ConteoBorrador>;

  constructor() {
    super('AltixOfflineDB');
    this.version(1).stores({
      borradores: '++id, cliente_id, created_at',
      catalogo: 'id, sku, nombre'
    });
    this.version(2).stores({
      borradores: '++id, cliente_id, created_at',
      catalogo: 'id, sku, nombre',
      conteos: 'id, conteo_id, updated_at'
    });
  }
}

export const offlineDB = new AltixOfflineDB();
