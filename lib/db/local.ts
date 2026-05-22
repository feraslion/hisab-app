import Dexie, { Table } from 'dexie';

export type SyncStatus = 'pending' | 'synced' | 'error';

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdat: string;
  updatedat: string;
  syncstatus: SyncStatus;
  deleted?: number;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  minstock: number;
  createdat: string;
  updatedat: string;
  syncstatus: SyncStatus;
  deleted?: number;
}

export interface Invoice {
  id: string;
  customerid: string | null;
  type: 'sale' | 'purchase';
  total: number;
  createdat: string;
  updatedat: string;
  syncstatus: SyncStatus;
  deleted?: number;
}

export interface InvoiceItem {
  id: string;
  invoiceid: string;
  productid: string;
  quantity: number;
  unitprice: number;
  total: number;
  createdat: string;
  syncstatus: SyncStatus;
}

export interface InventoryMovement {
  id: string;
  productid: string;
  quantitychange: number;
  reason: string;
  invoiceid: string | null;
  createdat: string;
  syncstatus: SyncStatus;
}

export interface SyncMeta {
  key: string;
  value: string;
}

class HisabDB extends Dexie {
  customers!: Table<Customer, string>;
  products!: Table<Product, string>;
  invoices!: Table<Invoice, string>;
  invoiceitems!: Table<InvoiceItem, string>;
  inventorymovements!: Table<InventoryMovement, string>;
  syncmeta!: Table<SyncMeta, string>;

  constructor() {
    super('hisabappdb');
    this.version(1).stores({
      customers: 'id, name, phone, syncstatus, updatedat, deleted',
      products: 'id, &barcode, name, stock, syncstatus, updatedat, deleted',
      invoices: 'id, customerid, type, createdat, syncstatus, deleted',
      invoiceitems: 'id, invoiceid, productid, syncstatus',
      inventorymovements: 'id, productid, invoiceid, createdat, syncstatus',
      syncmeta: '&key'
    });
  }
}

export const db = new HisabDB();
