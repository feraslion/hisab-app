'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/db/local';

export default function Home() {
  const [stats, setStats] = useState({ products: 0, customers: 0, invoices: 0 });

  useEffect(() => {
    (async () => {
      setStats({
        products: await db.products.count(),
        customers: await db.customers.count(),
        invoices: await db.invoices.count()
      });
    })();
  }, []);

  return (
    <main className="p-6">
      <h1 className="mb-6 text-3xl font-bold">لوحة التحكم</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="المنتجات" value={stats.products} />
        <Card title="العملاء" value={stats.customers} />
        <Card title="الفواتير" value={stats.invoices} />
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
