'use client';
import { useEffect, useState } from 'react';
import { listInvoices } from '@/lib/services/invoices';
import type { Invoice } from '@/lib/db/local';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => { listInvoices().then(setInvoices); }, []);

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">الفواتير</h1>
      <table className="w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">التاريخ</th>
            <th className="border p-2">النوع</th>
            <th className="border p-2">الإجمالي</th>
            <th className="border p-2">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(i => (
            <tr key={i.id}>
              <td className="border p-2">{new Date(i.createdat).toLocaleString('ar')}</td>
              <td className="border p-2">{i.type === 'sale' ? 'بيع' : 'شراء'}</td>
              <td className="border p-2">{i.total.toFixed(2)}</td>
              <td className="border p-2">{i.syncstatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
