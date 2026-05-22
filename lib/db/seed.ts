import { db } from './local';
import { v4 as uuid } from 'uuid';

export async function seedIfEmpty() {
  if ((await db.customers.count()) > 0) return;
  const now = new Date().toISOString();
  await db.customers.add({
    id: uuid(),
    name: 'عميل نقدي',
    phone: '0000000000',
    email: null,
    address: null,
    createdat: now,
    updatedat: now,
    syncstatus: 'pending',
    deleted: 0
  });
}
