'use client';
import { useEffect, useState } from 'react';
import { listCustomers, createCustomer } from '@/lib/services/customers';
import type { Customer } from '@/lib/db/local';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const refresh = async () => setCustomers(await listCustomers());

  useEffect(() => { refresh(); }, []);

  async function add(fd: FormData) {
    await createCustomer({
      name: String(fd.get('name')),
      phone: String(fd.get('phone') || ''),
      email: null,
      address: null
    });
    refresh();
  }

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">العملاء</h1>
      <form action={add} className="mb-6 grid gap-2 rounded border bg-white p-4 md:grid-cols-3">
        <input name="name" placeholder="الاسم" required className="rounded border px-2 py-1" />
        <input name="phone" placeholder="الهاتف" className="rounded border px-2 py-1" />
        <button className="rounded bg-blue-600 px-4 py-1 text-white">إضافة</button>
      </form>
      <ul className="rounded border bg-white">
        {customers.map(c => (
          <li key={c.id} className="border-b p-3 last:border-0">
            <strong>{c.name}</strong> — {c.phone}
          </li>
        ))}
      </ul>
    </main>
  );
}
