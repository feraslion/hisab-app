'use client';
import { useEffect, useState } from 'react';
import { listProducts, createProduct } from '@/lib/services/products';
import type { Product } from '@/lib/db/local';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const refresh = async () => setProducts(await listProducts());

  useEffect(() => { refresh(); }, []);

  async function add(fd: FormData) {
    try {
      await createProduct({
        name: String(fd.get('name')),
        barcode: String(fd.get('barcode')),
        price: Number(fd.get('price') || 0),
        stock: Number(fd.get('stock') || 0),
        minstock: Number(fd.get('minstock') || 0)
      });
      refresh();
    } catch (e: any) { alert(e.message); }
  }

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">المنتجات</h1>
      <form action={add} className="mb-6 grid gap-2 rounded border bg-white p-4 md:grid-cols-6">
        <input name="name" placeholder="الاسم" required className="rounded border px-2 py-1" />
        <input name="barcode" placeholder="الباركود" required className="rounded border px-2 py-1" />
        <input name="price" type="number" step="0.01" placeholder="السعر" className="rounded border px-2 py-1" />
        <input name="stock" type="number" placeholder="المخزون" className="rounded border px-2 py-1" />
        <input name="minstock" type="number" placeholder="حد أدنى" className="rounded border px-2 py-1" />
        <button className="rounded bg-blue-600 px-4 py-1 text-white">إضافة</button>
      </form>
      <table className="w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">الاسم</th>
            <th className="border p-2">الباركود</th>
            <th className="border p-2">السعر</th>
            <th className="border p-2">المخزون</th>
            <th className="border p-2">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className={p.stock <= p.minstock ? 'bg-red-50' : ''}>
              <td className="border p-2">{p.name}</td>
              <td className="border p-2">{p.barcode}</td>
              <td className="border p-2">{p.price}</td>
              <td className="border p-2">{p.stock}</td>
              <td className="border p-2">{p.stock <= p.minstock ? 'منخفض' : 'جيد'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
