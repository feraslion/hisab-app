'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Product, Invoice, Expense } from '@/lib/db/schema';
import { getAllProducts, getAllInvoices } from '@/lib/db/operations';
import { db } from '@/lib/db/schema';
import toast from 'react-hot-toast';

/**
 * === لوحة التحكم الرئيسية (Dashboard) ===
 * عرض ملخص المبيعات والأرباح والإحصائيات
 */

interface DashboardStats {
  totalSales: number;
  totalCosts: number;
  profit: number;
  profitMargin: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  lowStockProducts: Product[];
  totalRevenue: number;
  averageOrderValue: number;
  salesCount: number;
  expensesTotal: number;
}

const Dashboard: React.FC = () => {
  // ========== الحالة ==========
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // آخر 30 يوم
    end: new Date(),
  });

  // ========== تحميل البيانات ==========
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [productsResult, invoicesResult] = await Promise.all([
          getAllProducts(),
          getAllInvoices(),
        ]);

        if (productsResult.success && productsResult.data) {
          setProducts(productsResult.data);
        }

        if (invoicesResult.success && invoicesResult.data) {
          setInvoices(invoicesResult.data);
        }

        // جلب المصروفات
        const expensesData = await db.expenses.toArray();
        setExpenses(expensesData);
      } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        toast.error('خطأ في تحميل البيانات');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // ========== الحسابات ==========

  /**
   * حساب الإحصائيات
   */
  const stats = useMemo<DashboardStats>(() => {
    // تصفية الفواتير حسب التاريخ
    const filteredInvoices = invoices.filter(
      (inv) =>
        inv.createdAt >= dateRange.start.getTime() &&
        inv.createdAt <= dateRange.end.getTime() &&
        inv.status !== 'cancelled'
    );

    // تصفية المصروفات حسب التاريخ
    const filteredExpenses = expenses.filter(
      (exp) =>
        exp.createdAt >= dateRange.start.getTime() &&
        exp.createdAt <= dateRange.end.getTime() &&
        !exp._deleted
    );

    // المبيعات
    const salesInvoices = filteredInvoices.filter((inv) => inv.type === 'sale');
    const totalRevenue = salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const salesCount = salesInvoices.length;
    const averageOrderValue = salesCount > 0 ? totalRevenue / salesCount : 0;

    // المشتريات
    const purchaseInvoices = filteredInvoices.filter((inv) => inv.type === 'purchase');
    const totalCosts = purchaseInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // المصروفات
    const expensesTotal = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // الأرباح
    const profit = totalRevenue - totalCosts - expensesTotal;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // أشهر المنتجات
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    salesInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.total;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // المنتجات منخفضة المخزون
    const lowStockProducts = products.filter(
      (p) => p.quantity <= p.minStock && !p._deleted
    );

    return {
      totalSales: totalRevenue,
      totalCosts,
      profit,
      profitMargin,
      topProducts,
      lowStockProducts,
      totalRevenue,
      averageOrderValue,
      salesCount,
      expensesTotal,
    };
  }, [invoices, expenses, products, dateRange]);

  // ========== الـ JSX ==========

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-2xl font-bold">جاري تحميل البيانات... 🔄</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rtl" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">📊 لوحة التحكم</h1>
        <div className="flex gap-4">
          <input
            type="date"
            value={dateRange.start.toISOString().split('T')[0]}
            onChange={(e) =>
              setDateRange((prev) => ({
                ...prev,
                start: new Date(e.target.value),
              }))
            }
            className="px-4 py-2 border border-gray-300 rounded"
          />
          <span className="text-gray-500 flex items-center">إلى</span>
          <input
            type="date"
            value={dateRange.end.toISOString().split('T')[0]}
            onChange={(e) =>
              setDateRange((prev) => ({
                ...prev,
                end: new Date(e.target.value),
              }))
            }
            className="px-4 py-2 border border-gray-300 rounded"
          />
        </div>
      </div>

      {/* بطاقات الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* إجمالي المبيعات */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
          <div className="text-4xl font-bold">💰</div>
          <div className="text-sm text-blue-100 mt-2">إجمالي المبيعات</div>
          <div className="text-2xl font-bold mt-2">
            {stats.totalSales.toLocaleString('ar-SA')} ريال
          </div>
          <div className="text-xs text-blue-100 mt-1">({stats.salesCount} فاتورة)</div>
        </div>

        {/* الأرباح */}
        <div
          className={`rounded-lg p-6 shadow-lg text-white ${
            stats.profit >= 0
              ? 'bg-gradient-to-br from-green-500 to-green-600'
              : 'bg-gradient-to-br from-red-500 to-red-600'
          }`}
        >
          <div className="text-4xl font-bold">📈</div>
          <div className="text-sm opacity-80 mt-2">صافي الربح</div>
          <div className="text-2xl font-bold mt-2">
            {stats.profit.toLocaleString('ar-SA')} ريال
          </div>
          <div className="text-xs opacity-75 mt-1">({stats.profitMargin.toFixed(1)}%)</div>
        </div>

        {/* المصروفات */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg">
          <div className="text-4xl font-bold">💸</div>
          <div className="text-sm text-orange-100 mt-2">المصروفات</div>
          <div className="text-2xl font-bold mt-2">
            {stats.expensesTotal.toLocaleString('ar-SA')} ريال
          </div>
        </div>

        {/* متوسط قيمة الطلب */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="text-4xl font-bold">📋</div>
          <div className="text-sm text-purple-100 mt-2">متوسط الطلب</div>
          <div className="text-2xl font-bold mt-2">
            {stats.averageOrderValue.toLocaleString('ar-SA')} ريال
          </div>
        </div>

        {/* المنتجات */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg p-6 shadow-lg">
          <div className="text-4xl font-bold">📦</div>
          <div className="text-sm text-indigo-100 mt-2">عدد المنتجات</div>
          <div className="text-2xl font-bold mt-2">{products.length}</div>
          <div className="text-xs text-indigo-100 mt-1">
            ({stats.lowStockProducts.length} منخفضة المخزون)
          </div>
        </div>
      </div>

      {/* الصف الثاني: البيانات التفصيلية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* أشهر المنتجات */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 أشهر المنتجات</h2>
          {stats.topProducts.length > 0 ? (
            <div className="space-y-3">
              {stats.topProducts.map((product, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      {product.quantity} قطعة • {product.revenue.toLocaleString('ar-SA')} ريال
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{index + 1}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">لا توجد مبيعات</div>
          )}
        </div>

        {/* المنتجات منخفضة المخزون */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🚨 المخزون المنخفض</h2>
          {stats.lowStockProducts.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stats.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      المتاح: {product.quantity} • الحد الأدنى: {product.minStock}
                    </div>
                  </div>
                  <div className="text-3xl">⚠️</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">✅ جميع المنتجات بخزن كافي</div>
          )}
        </div>
      </div>

      {/* ملخص المبيعات حسب الطريقة */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">💳 المبيعات حسب طريقة الدفع</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['cash', 'card', 'check', 'transfer', 'credit'].map((method) => {
            const methodInvoices = invoices.filter(
              (inv) =>
                inv.type === 'sale' &&
                inv.paymentMethod === method &&
                inv.createdAt >= dateRange.start.getTime() &&
                inv.createdAt <= dateRange.end.getTime()
            );
            const total = methodInvoices.reduce((sum, inv) => sum + inv.total, 0);
            const count = methodInvoices.length;

            const methodLabels: Record<string, string> = {
              cash: '💵 نقداً',
              card: '💳 بطاقة',
              check: '📋 شيك',
              transfer: '🔄 تحويل',
              credit: '📊 أجل',
            };

            return (
              <div key={method} className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl mb-1">{methodLabels[method]}</div>
                <div className="text-lg font-bold text-gray-800">{total.toLocaleString('ar-SA')}</div>
                <div className="text-xs text-gray-500">({count} عملية)</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
