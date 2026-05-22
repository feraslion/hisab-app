import { db, Customer } from '@/lib/db/local';
import { v4 as uuid } from 'uuid';

export async function listCustomers(): Promise<Customer[]> {
  return (await db.customers.toArray()).filter(c => !c.deleted);
}

export async function createCustomer(data: Omit<Customer, 'id'|'createdat'|'updatedat'|'syncstatus'|'deleted'>) {
  const now = new Date().toISOString();
  const c: Customer = {
    id: uuid(),
    ...data,
    createdat: now,
    updatedat: now,
    syncstatus: 'pending',
    deleted: 0
  };
  await db.customers.add(c);
  return c;
}

export async function deleteCustomer(id: string) {
  await db.customers.update(id, {
    deleted: 1,
    updatedat: new Date().toISOString(),
    syncstatus: 'pending'
  });
}
