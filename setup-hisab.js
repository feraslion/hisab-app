const fs = require('fs');
const path = require('path');

// دالة مساعدة لإنشاء المجلدات والملفات
const writeFile = (filePath, content) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content.trim());
  console.log(`✅ تم إنشاء/تحديث: ${filePath}`);
};

console.log("🚀 جاري تحويل hisab-app إلى نظام حقيقي...");

// 1. تحديث schema.ts
writeFile('lib/db/schema.ts', `
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: real('price').notNull().default(0),
  costPrice: real('cost_price').notNull().default(0),
  stock: integer('stock').notNull().default(0),
  barcode: text('barcode').unique(),
  createdAt: text('created_at').default(sql\`(current_timestamp)\`),
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  customerId: text('customer_id'),
  totalAmount: real('total_amount').notNull(),
  taxAmount: real('tax_amount').notNull().default(0),
  finalAmount: real('final_amount').notNull(),
  status: text('status').notNull().default('paid'),
  createdAt: text('created_at').default(sql\`(current_timestamp)\`),
});

export const invoiceItems = sqliteTable('invoice_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
});
`);

// 2. تحديث actions.ts
writeFile('app/actions.ts', `
'use server';
import { db } from '@/lib/db/local';
import { products, invoices, invoiceItems } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

export async function getProducts() {
  return await db.select().from(products);
}

export async function createInvoice(data: any) {
  const invoiceId = randomUUID();
  try {
    await db.insert(invoices).values({
      id: invoiceId,
      totalAmount: data.total,
      finalAmount: data.total,
      createdAt: new Date().toISOString(),
    });

    for (const item of data.items) {
      await db.insert(invoiceItems).values({
        id: randomUUID(),
        invoiceId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
      });
      
      // خصم المخزون
      const product = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (product.length > 0) {
        const newStock = product[0].stock - item.quantity;
        await db.update(products).set({ stock: newStock }).where(eq(products.id, item.productId));
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
`);

// 3. تحديث صفحة الفواتير الجديدة
writeFile('app/invoices/new/page.tsx', `
'use client';
import { useState, useEffect } from 'react';
import { getProducts, createInvoice } from '@/app/actions';

export default function NewInvoicePage() {
  const [productsList, setProductsList] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [barcode, setBarcode] = useState('');

  useEffect(() => { getProducts().then(setProductsList); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const p = productsList.find(x => x.barcode === barcode);
    if (p) {
      setItems([...items, { ...p, qty: 1, cartId: Date.now() }]);
      setBarcode('');
    }
  };

  const total = items.reduce((a, b) => a + (b.price * b.qty), 0);

  const save = async () => {
    const res = await createInvoice({ 
      total, 
      items: items.map(i => ({ productId: i.id, quantity: i.qty, unitPrice: i.price })) 
    });
    if (res.success) alert('تم الحفظ بنجاح!');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">نقطة البيع</h1>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input autoFocus value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="باركود" className="border p-2 flex-1" />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">إضافة</button>
      </form>
      <div className="bg-white p-4 rounded shadow">
        {items.map(i => <div key={i.cartId} className="flex justify-between border-b p-2">{i.name} - {i.price} ر.س</div>)}
      </div>
      <div className="mt-4 text-xl font-bold">الإجمالي: {total} ر.س</div>
      <button onClick={save} className="w-full bg-green-600 text-white p-3 mt-4 rounded">إتمام البيع</button>
    </div>
  );
}
`);

console.log("🎉 اكتملت عملية التحديث بنجاح! يمكنك الآن تشغيل التطبيق.");
