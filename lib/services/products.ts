import { db, Product } from '@/lib/db/local';
import { v4 as uuid } from 'uuid';

export async function listProducts(): Promise<Product[]> {
  return (await db.products.toArray()).filter(p => !p.deleted);
}

export async function findByBarcode(barcode: string) {
  return db.products.where('barcode').equals(barcode).first();
}

export async function createProduct(data: Omit<Product, 'id'|'createdat'|'updatedat'|'syncstatus'|'deleted'>) {
  if (await findByBarcode(data.barcode)) throw new Error('الباركود موجود مسبقًا');
  const now = new Date().toISOString();
  const p: Product = {
    id: uuid(),
    ...data,
    createdat: now,
    updatedat: now,
    syncstatus: 'pending',
    deleted: 0
  };
  await db.products.add(p);
  return p;
}
