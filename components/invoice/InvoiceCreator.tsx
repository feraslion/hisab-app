'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Invoice, InvoiceItem, Product, Customer } from '@/lib/db/schema';
import { createInvoice, updateInvoice, getAllProducts, getProduct } from '@/lib/db/operations';
import { createInventoryMovement } from '@/lib/db/operations';
import toast from 'react-hot-toast';

/**
 * === مكون إنشاء الفواتير ===
 * واجهة متكاملة لإنشاء وتحرير فواتير البيع والشراء
 */

interface InvoiceCreatorProps {
  /**
   * نوع الفاتورة
   */
  type?: 'sale' | 'purchase';

  /**
   * العميل المحدد مسبقاً (اختياري)
   */
  initialCustomer?: Customer;

  /**
   * دالة تُستدعى عند حفظ الفاتورة
   */
  onSave?: (invoice: Invoice) => void;

  /**
   * دالة تُستدعى عند الإغلاق
   */
  onClose?: () => void;
}

interface DraftInvoice {
  type: 'sale' | 'purchase';
  customerId?: string;
  customerName?: string;
  items: InvoiceItem[];
  taxRate: number;
  discountAmount: number;
  paymentMethod: 'cash' | 'card' | 'check' | 'transfer' | 'credit';
  paymentStatus: 'paid' | 'pending' | 'partial';
  notes?: string;
}

const InvoiceCreator: React.FC<InvoiceCreatorProps> = ({
  type = 'sale',
  initialCustomer,
  onSave,
  onClose,
}) => {
  // ========== الحالة ==========
  const [draft, setDraft] = useState<DraftInvoice>({
    type,
    customerId: initialCustomer?.id,
    customerName: initialCustomer?.name || '',
    items: [],
    taxRate: 0.15,
    discountAmount: 0,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  // ========== الحسابات ==========

  /**
   * حساب الإجمالي الجزئي
   */
  const subtotal = useMemo(() => {
    return draft.items.reduce((sum, item) => sum + item.total, 0);
  }, [draft.items]);

  /**
   * حساب الضريبة
   */
  const taxAmount = useMemo(() => {
    return Math.round((subtotal - draft.discountAmount) * draft.taxRate * 100) / 100;
  }, [subtotal, draft.discountAmount, draft.taxRate]);

  /**
   * حساب الإجمالي النهائي
   */
  const total = useMemo(() => {
    return subtotal - draft.discountAmount + taxAmount;
  }, [subtotal, draft.discountAmount, taxAmount]);

  // ========== الدوال ==========

  /**
   * البحث عن المنتجات
   */
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setProducts([]);
      return;
    }

    setIsSearching(true);
    try {
      const allProducts = await getAllProducts();
      if (allProducts.success && allProducts.data) {
        const filtered = allProducts.data.filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setProducts(filtered);
      }
    } catch (error) {
      console.error('❌ خطأ في البحث:', error);
      toast.error('خطأ في البحث عن المنتجات');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  /**
   * إضافة منتج إلى الفاتورة
   */
  const handleAddProduct = useCallback((product: Product) => {
    if (!selectedProduct || quantity <= 0) {
      toast.error('اختر منتج وكمية صحيحة');
      return;
    }

    if (draft.type === 'sale' && product.quantity < quantity) {
      toast.error('الكمية المتاحة غير كافية');
      return;
    }

    const itemTotal = quantity * product.salePrice;
    const newItem: InvoiceItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.salePrice,
      discount: 0,
      total: itemTotal,
    };

    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    // إعادة تعيين
    setSelectedProduct(null);
    setQuantity(1);
    setSearchQuery('');
    toast.success(`تمت إضافة ${product.name}`);
  }, [selectedProduct, quantity, draft.type]);

  /**
   * حذف منتج من الفاتورة
   */
  const handleRemoveItem = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    toast.success('تم حذف المنتج');
  }, []);

  /**
   * تحديث كمية المنتج
   */
  const handleUpdateQuantity = useCallback((index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;

    setDraft((prev) => {
      const newItems = [...prev.items];
      const item = newItems[index];
      item.quantity = newQuantity;
      item.total = (item.quantity * item.unitPrice) - item.discount;
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  }, []);

  /**
   * حفظ الفاتورة
   */
  const handleSave = useCallback(async () => {
    if (draft.items.length === 0) {
      toast.error('أضف منتجات إلى الفاتورة');
      return;
    }

    try {
      const invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
        type: draft.type,
        customerId: draft.customerId,
        customerName: draft.customerName || 'زبون نقدي',
        items: draft.items,
        subtotal,
        taxRate: draft.taxRate,
        taxAmount,
        discountAmount: draft.discountAmount,
        total,
        paymentMethod: draft.paymentMethod,
        paymentStatus: draft.paymentStatus,
        status: 'completed',
        notes: draft.notes,
      };

      const result = await createInvoice(invoiceData);
      if (result.success && result.data) {
        toast.success('✅ تم حفظ الفاتورة بنجاح');

        // تحديث المخزون إذا كانت فاتورة بيع
        if (draft.type === 'sale') {
          for (const item of draft.items) {
            await createInventoryMovement({
              productId: item.productId,
              type: 'out',
              quantity: item.quantity,
              reason: 'sale',
              referenceId: result.data.id,
            });
          }
        }

        onSave?.(result.data);
      } else {
        toast.error(result.error || 'خطأ في حفظ الفاتورة');
      }
    } catch (error) {
      console.error('❌ خطأ في حفظ الفاتورة:', error);
      toast.error('حدث خطأ أثناء حفظ الفاتورة');
    }
  }, [draft, subtotal, taxAmount, total, onSave]);

  // ========== الـ JSX ==========

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6 rtl" dir="rtl">
      {/* رأس الفاتورة */}
      <div className="border-b pb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            فاتورة {draft.type === 'sale' ? 'بيع' : 'شراء'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* معلومات العميل */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              {draft.type === 'sale' ? 'العميل' : 'المورد'}
            </label>
            <input
              type="text"
              value={draft.customerName}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, customerName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="اسم العميل أو المورد"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              طريقة الدفع
            </label>
            <select
              value={draft.paymentMethod}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  paymentMethod: e.target.value as any,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="cash">💵 نقداً</option>
              <option value="card">💳 بطاقة</option>
              <option value="check">📋 شيك</option>
              <option value="transfer">🔄 تحويل بنكي</option>
              <option value="credit">📊 أجل</option>
            </select>
          </div>
        </div>
      </div>

      {/* إضافة المنتجات */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="font-bold text-lg text-gray-800">المنتجات</h3>

        {/* شريط البحث والإضافة */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="ابحث عن منتج (اسم أو رمز)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSearching ? '🔄' : '🔍'}
            </button>
          </div>

          {/* نتائج البحث */}
          {products.length > 0 && (
            <div className="border rounded max-h-40 overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`w-full text-right px-3 py-2 border-b hover:bg-gray-100 ${
                    selectedProduct?.id === product.id ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="font-semibold text-sm">{product.name}</div>
                  <div className="text-xs text-gray-500">
                    {product.code} • {product.quantity} متاح • {product.salePrice} ريال
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* كمية وإضافة */}
          {selectedProduct && (
            <div className="flex gap-2 bg-gray-50 p-3 rounded">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
              />
              <button
                onClick={() => handleAddProduct(selectedProduct)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                ➕ إضافة
              </button>
            </div>
          )}
        </div>

        {/* جدول المنتجات */}
        {draft.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-right">المنتج</th>
                  <th className="px-3 py-2 text-center">الكمية</th>
                  <th className="px-3 py-2 text-center">السعر</th>
                  <th className="px-3 py-2 text-center">الخصم</th>
                  <th className="px-3 py-2 text-center">الإجمالي</th>
                  <th className="px-3 py-2 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(index, parseInt(e.target.value) || 1)
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">{item.unitPrice}</td>
                    <td className="px-3 py-2 text-center">{item.discount}</td>
                    <td className="px-3 py-2 text-center font-semibold">{item.total}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-800"
                        title="حذف"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* الملخص المالي */}
      <div className="space-y-3 border-b pb-4">
        <div className="flex justify-between text-lg font-semibold">
          <span>الإجمالي الجزئي:</span>
          <span className="font-mono">{subtotal.toFixed(2)} ريال</span>
        </div>

        <div className="flex justify-between items-center">
          <label className="font-semibold">الخصم:</label>
          <input
            type="number"
            min="0"
            value={draft.discountAmount}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                discountAmount: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-24 px-2 py-1 border border-gray-300 rounded text-right font-mono"
          />
        </div>

        <div className="flex justify-between items-center">
          <label className="font-semibold">معدل الضريبة:</label>
          <div className="flex items-center">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={draft.taxRate * 100}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  taxRate: parseFloat(e.target.value) / 100 || 0,
                }))
              }
              className="w-16 px-2 py-1 border border-gray-300 rounded text-right font-mono"
            />
            <span className="mr-2">%</span>
          </div>
        </div>

        <div className="flex justify-between text-lg font-semibold">
          <span>الضريبة ({(draft.taxRate * 100).toFixed(1)}%):</span>
          <span className="font-mono">{taxAmount.toFixed(2)} ريال</span>
        </div>

        <div className="flex justify-between text-2xl font-bold text-blue-600 bg-blue-50 p-3 rounded">
          <span>الإجمالي النهائي:</span>
          <span className="font-mono">{total.toFixed(2)} ريال</span>
        </div>
      </div>

      {/* الملاحظات والأزرار */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            ملاحظات
          </label>
          <textarea
            value={draft.notes || ''}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, notes: e.target.value }))
            }
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="ملاحظات إضافية..."
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
          >
            ✅ حفظ الفاتورة
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 font-semibold"
          >
            ❌ إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreator;
