import { db, Invoice } from '@/lib/db/local';
import { v4 as uuid } from 'uuid';

export interface NewInvoiceItem {
  productid: string;
  quantity: number;
  unitprice: number;
}

export interface NewInvoice {
  customerid: string | null;
  type: 'sale' | 'purchase';
  items: NewInvoiceItem[];
}

export async function createInvoice(input: NewInvoice): Promise<Invoice> {
  if (!input.items.length) throw new Error('الفاتورة فارغة');
  return db.transaction('rw',
    [db.invoices, db.invoiceitems, db.products, db.inventorymovements],
    async () => {
      const now = new Date().toISOString();
      const invoiceId = uuid();
      let total = 0;
      for (const item of input.items) {
        const product = await db.products.get(item.productid);
        if (!product) throw new Error('منتج غير موجود');
        if (input.type === 'sale' && product.stock < item.quantity)
          throw new Error(`المخزون غير كافٍ: ${product.name}`);
        const lineTotal = item.quantity * item.unitprice;
        total += lineTotal;
        await db.invoiceitems.add({
          id: uuid(),
          invoiceid: invoiceId,
          productid: item.productid,
          quantity: item.quantity,
          unitprice: item.unitprice,
          total: lineTotal,
          createdat: now,
          syncstatus: 'pending'
        });
        const change = input.type === 'sale' ? -item.quantity : item.quantity;
        await db.products.update(item.productid, {
          stock: product.stock + change,
          updatedat: now,
          syncstatus: 'pending'
        });
        await db.inventorymovements.add({
          id: uuid(),
          productid: item.productid,
          quantitychange: change,
          reason: input.type === 'sale' ? 'بيع' : 'شراء',
          invoiceid: invoiceId,
          createdat: now,
          syncstatus: 'pending'
        });
      }
      const invoice: Invoice = {
        id: invoiceId,
        customerid: input.customerid,
        type: input.type,
        total,
        createdat: now,
        updatedat: now,
        syncstatus: 'pending',
        deleted: 0
      };
      await db.invoices.add(invoice);
      return invoice;
    }
  );
}

export async function listInvoices(): Promise<Invoice[]> {
  return (await db.invoices.toArray())
    .filter(i => !i.deleted)
    .sort((a, b) => b.createdat.localeCompare(a.createdat));
}
