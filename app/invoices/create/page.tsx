'use client';
import { useEffect, useState } from 'react';
import { listProducts, findByBarcode } from '@/lib/services/products';
import { listCustomers } from '@/lib/services/customers';
import { createInvoice } from '@/lib/services/invoices';
import type { Product, Customer } from '@/lib/db/local';

interface Line {
  productid: string;
  quantity: number;
  unitprice: number;
  name: string;
}

export default function CreateInvoice() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [type, setType] = useState<'sale' | 'purchase'>('sale');
  const [cart, setCart] = useState<Line[]>([]);
  const [barcode, setBarcode] = useState('');

  useEffect(() => {
    listProducts().then(setProducts);
    listCustomers().then(c => {
      setCustomers(c);
      if (c.length) setCustomerId(c[0].id);
    });
  }, []);

  async function addBarcode() {
    if (!barcode.trim()) return;
    const p = await findByBarcode(barcode.trim());
    if (!p) return alert('غير موجود');
    addProduct(p);
    setBarcode('');
  }

  function addProduct(p: Product) {
    setCart(prev => {
      const ex = prev.find(l => l.productid === p.id);
      if (ex) return prev.map(l => l.productid === p.id ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { productid: p.id, quantity: 1, unitprice: p.price, name: p.name }];
    });
  }

  const total = cart.reduce((s, l) => s + l.quantity * l.unitprice, 0);

  async function save() {
    try {
      await createInvoice({
        customerid: customerId || null,
        type,
        items: cart.map(({ productid, quantity, unitprice }) => ({ productid, quantity, unitprice }))
      });
      alert('تم الحفظ');
      setCart([]);
      listProducts().then(setProducts);
    } catch (e: any) { alert(e.message); }
  }

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">فاتورة جديدة</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="rounded border px-2 py-1">
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value as any)} className="rounded border px-2 py-1">
          <option value="sale">بيع</option>
          <option value="purchase">شراء</option>
        </select>
        <input value={barcode} onChange={e => setBarcode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addBarcode()}
          placeholder="باركود..." className="rounded border px-2 py-1" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {products.slice(0, 12).map(p => (
          <button key={p.id} onClick={() => addProduct(p)} className="rounded border bg-white px-2 py-1 text-sm">
            {p.name}
          </button>
        ))}
      </div>
      <table className="mb-4 w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">المنتج</th>
            <th className="border p-2">الكمية</th>
            <th className="border p-2">السعر</th>
            <th className="border p-2">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {cart.map(l => (
            <tr key={l.productid}>
              <td className="border p-2">{l.name}</td>
              <td className="border p-2">{l.quantity}</td>
              <td className="border p-2">{l.unitprice}</td>
              <td className="border p-2">{(l.quantity * l.unitprice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold">الإجمالي: {total.toFixed(2)}</span>
        <button onClick={save} disabled={!cart.length} className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50">
          حفظ
        </button>
      </div>
    </main>
  );
}
