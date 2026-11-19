import React, { useState, useEffect } from 'react';
import { loadDatabase, saveDatabase, formatBDT, DEFAULT_DB } from './db';
import ReceiptModal from './components/ReceiptModal';

export default function App() {
  const [db, setDb] = useState(() => loadDatabase());
  const [activeTab, setActiveTab] = useState('pos');
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [toast, setToast] = useState('');

  // POS Cart state
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('নগদ');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom item entry in POS
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQty, setCustomItemQty] = useState(1);
  const [customItemPrice, setCustomItemPrice] = useState('');

  // Due Ledger state
  const [showDirectDue, setShowDirectDue] = useState(false);
  const [dueCustName, setDueCustName] = useState('');
  const [dueCustPhone, setDueCustPhone] = useState('');
  const [dueCustAmount, setDueCustAmount] = useState('');

  // Product Form state
  const [prodName, setProdName] = useState('');
  const [prodBuyPrice, setProdBuyPrice] = useState('');
  const [prodSellPrice, setProdSellPrice] = useState('');
  const [prodStock, setProdStock] = useState('');

  // Expense Form state
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');

  // Settings Form state
  const [shopForm, setShopForm] = useState(db.shop);

  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const showNotice = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  // Update paidAmount automatically when cart or discount changes
  const cartSubtotal = cart.reduce((sum, item) => sum + item.qty * item.sellPrice, 0);
  const netPayable = Math.max(0, cartSubtotal - Number(discount || 0));
  const currentDue = Math.max(0, netPayable - Number(paidAmount || 0));

  useEffect(() => {
    setPaidAmount(netPayable);
  }, [cartSubtotal, discount]);

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } else {
      showNotice('মোবাইল ব্রাউজারের মেনু (⋮) থেকে "Add to Home Screen / Install App" চাপুন!');
    }
  };

  // Add Product from Quick Chips
  const addProductToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      if (exists) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          qty: 1,
          buyPrice: Number(product.buyPrice || 0),
          sellPrice: Number(product.sellPrice)
        }
      ];
    });
  };

  const addCustomToCart = () => {
    if (!customItemName.trim() || Number(customItemPrice) <= 0) {
      showNotice('পণ্যের নাম ও সঠিক দাম লিখুন');
      return;
    }
    const price = Number(customItemPrice);
    setCart((prev) => [
      ...prev,
      {
        id: 'custom-' + Date.now(),
        name: customItemName.trim(),
        qty: Math.max(1, Number(customItemQty || 1)),
        buyPrice: Math.round(price * 0.88),
        sellPrice: price
      }
    ]);
    setCustomItemName('');
    setCustomItemQty(1);
    setCustomItemPrice('');
  };

  const updateCartQty = (idx, delta) => {
    setCart((prev) =>
      prev
        .map((item, i) => (i === idx ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const completeSale = () => {
    if (cart.length === 0) {
      showNotice('প্রথমে বিলে অন্তত ১টি পণ্য যোগ করুন!');
      return;
    }

    const totalCost = cart.reduce((sum, i) => sum + i.qty * Number(i.buyPrice || 0), 0);
    const profit = Math.max(0, netPayable - totalCost);

    const newSale = {
      id: 'INV-' + (1000 + db.sales.length + 1),
      date: new Date().toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' }),
      customer: customerName.trim() || 'নগদ কাস্টমার',
      phone: customerPhone.trim(),
      items: cart,
      discount: Number(discount || 0),
      total: netPayable,
      paid: Number(paidAmount || 0),
      due: currentDue,
      profit,
      paymentMethod: currentDue > 0 ? `${paymentMethod} + বাকি` : paymentMethod
    };

    // Deduct stock
    const updatedProducts = db.products.map((p) => {
      const soldItem = cart.find((c) => c.id === p.id);
      if (soldItem) {
        return { ...p, stock: Math.max(0, Number(p.stock || 0) - soldItem.qty) };
      }
      return p;
    });

    setDb((prev) => ({
      ...prev,
      products: updatedProducts,
      sales: [newSale, ...prev.sales]
    }));

    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscount(0);
    setPaidAmount(0);
    setActiveReceipt(newSale);
    showNotice('বিল সেভ হয়েছে এবং ক্যাশমেমো তৈরি হয়েছে!');
  };

  // Save direct due entry
  const handleAddDirectDue = () => {
    if (!dueCustName.trim() || Number(dueCustAmount) <= 0) {
      showNotice('কাস্টমারের নাম ও বাকির পরিমাণ লিখুন');
      return;
    }
    const amt = Number(dueCustAmount);
    const directSale = {
      id: 'DUE-' + (100 + db.sales.length + 1),
      date: new Date().toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' }),
      customer: dueCustName.trim(),
      phone: dueCustPhone.trim(),
      items: [{ id: 'due', name: 'পূর্বের/সরাসরি বাকি হিসাব', qty: 1, buyPrice: amt, sellPrice: amt }],
      discount: 0,
      total: amt,
      paid: 0,
      due: amt,
      profit: 0,
      paymentMethod: 'বাকি খাতা'
    };

    setDb((prev) => ({ ...prev, sales: [directSale, ...prev.sales] }));
    setDueCustName('');
    setDueCustPhone('');
    setDueCustAmount('');
    setShowDirectDue(false);
    showNotice('বাকি খাতায় নতুন হিসাব যুক্ত হয়েছে!');
  };

  const handleCollectDue = (saleId, partialAmount) => {
    setDb((prev) => ({
      ...prev,
      sales: prev.sales.map((s) => {
        if (s.id !== saleId) return s;
        const collect = partialAmount ? Math.min(s.due, partialAmount) : s.due;
        return {
          ...s,
          paid: Number(s.paid) + collect,
          due: Math.max(0, Number(s.due) - collect)
        };
      })
    }));
    showNotice('বাকি টাকা আদায় সম্পন্ন হয়েছে!');
  };

  // Add Product to inventory
  const handleAddProduct = () => {
    if (!prodName.trim() || Number(prodSellPrice) <= 0) {
      showNotice('পণ্যের নাম ও বিক্রয়মূল্য দিন');
      return;
    }
    const sell = Number(prodSellPrice);
    const buy = Number(prodBuyPrice) > 0 ? Number(prodBuyPrice) : Math.round(sell * 0.85);
    const newProd = {
      id: 'p-' + Date.now(),
      name: prodName.trim(),
      buyPrice: buy,
      sellPrice: sell,
      stock: Number(prodStock || 20),
      category: 'সাধারণ'
    };
    setDb((prev) => ({ ...prev, products: [newProd, ...prev.products] }));
    setProdName('');
    setProdBuyPrice('');
    setProdSellPrice('');
    setProdStock('');
    showNotice('নতুন পণ্য স্টকে যুক্ত হয়েছে!');
  };

  const handleDeleteProduct = (id) => {
    setDb((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== id) }));
  };

  // Add Expense
  const handleAddExpense = () => {
    if (!expTitle.trim() || Number(expAmount) <= 0) return;
    const newExp = {
      id: 'exp-' + Date.now(),
      title: expTitle.trim(),
      amount: Number(expAmount),
      date: new Date().toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' })
    };
    setDb((prev) => ({ ...prev, expenses: [newExp, ...(prev.expenses || [])] }));
    setExpTitle('');
    setExpAmount('');
    showNotice('খরচ হিসাবভুক্ত হয়েছে');
  };

  // Save Shop Branding Settings
  const handleSaveShopSettings = () => {
    setDb((prev) => ({ ...prev, shop: shopForm }));
    showNotice('দোকানের তথ্য সফলভাবে আপডেট হয়েছে!');
  };

  // Backup JSON Download
  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dokan-bondhu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('ডাটাবেজ ব্যাকআপ ফাইল ডাউনলোড হয়েছে!');
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (imported.shop && imported.products && imported.sales) {
          setDb(imported);
          setShopForm(imported.shop);
          showNotice('ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!');
        }
      } catch {
        showNotice('সঠিক ব্যাকআপ ফাইল নির্বাচন করুন');
      }
    };
    reader.readAsText(file);
  };

  // KPIs
  const totalSales = db.sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const totalCash = db.sales.reduce((sum, s) => sum + Number(s.paid || 0), 0);
  const totalDue = db.sales.reduce((sum, s) => sum + Number(s.due || 0), 0);
  const grossProfit = db.sales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
  const totalExpenses = (db.expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;

  const filteredProducts = db.products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Top Sticky App Header */}
      <header className="app-header">
        <div className="header-top">
          <div className="shop-brand">
            <div className="shop-logo">৳</div>
            <div>
              <h1 className="shop-title" id="header-shop-title">{db.shop.name}</h1>
              <p className="shop-subtitle">প্রোঃ {db.shop.owner} • {db.shop.phone}</p>
            </div>
          </div>
          <div className="header-actions">
            <a
              id="btn-download-zip-top"
              href="./downloads/dokan-bondhu-ready-app.zip"
              download="dokan-bondhu-ready-app.zip"
              className="btn-header"
              style={{ textDecoration: 'none', background: '#fbbf24', color: '#111827', borderColor: '#f59e0b', fontWeight: 800 }}
            >
              ⬇️ ডাউনলোড
            </a>
            <button id="btn-install-top" className="btn-header" onClick={handleInstallApp}>
              📲 ইনস্টল
            </button>
          </div>
        </div>

        {toast && (
          <div className="install-banner" style={{ background: 'rgba(16, 185, 129, 0.25)', borderColor: '#34d399' }}>
            <span>✅ {toast}</span>
          </div>
        )}
      </header>

      {/* Live Business KPI Strip */}
      <section className="kpi-grid" aria-label="ব্যবসার সারসংক্ষেপ">
        <div className="kpi-card">
          <div className="kpi-label">মোট বিক্রি</div>
          <div className="kpi-val text-brand" id="kpi-total-sales">{formatBDT(totalSales)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">নগদ জমা</div>
          <div className="kpi-val text-success" id="kpi-total-cash">{formatBDT(totalCash)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">মোট বাকি</div>
          <div className="kpi-val text-danger" id="kpi-total-due">{formatBDT(totalDue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">নিট লাভ</div>
          <div className="kpi-val text-warning" id="kpi-net-profit">{formatBDT(netProfit)}</div>
        </div>
      </section>

      {/* Main Tab Views */}
      <main className="app-main">
        {/* TAB 1: POS & CASHMEMO */}
        {activeTab === 'pos' && (
          <>
            <div className="card">
              <div className="card-title">
                <span>১. কাস্টমারের তথ্য</span>
                <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500 }}>ঐচ্ছিক (বাকির জন্য আবশ্যক)</span>
              </div>
              <div className="row-2">
                <input
                  id="pos-customer-name"
                  type="text"
                  className="input-field"
                  placeholder="কাস্টমারের নাম"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  id="pos-customer-phone"
                  type="tel"
                  className="input-field"
                  placeholder="মোবাইল নাম্বার"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <span>২. দ্রুত পণ্য নির্বাচন করুন</span>
                <span style={{ fontSize: '0.72rem', color: '#059669' }}>ট্যাপ করলেই বিলে যোগ হবে</span>
              </div>

              <div className="input-group">
                <input
                  id="pos-search-product"
                  type="text"
                  className="input-field"
                  placeholder="🔍 পণ্য খুঁজুন (যেমন: চাল, তেল, ডিম...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="chip-list" id="quick-products-container">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="prod-chip"
                    onClick={() => addProductToCart(p)}
                  >
                    <span>{p.name}</span>
                    <span className="prod-chip-price">৳{p.sellPrice}</span>
                  </button>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #eef3f0', paddingTop: '10px', marginTop: '4px' }}>
                <div className="input-label" style={{ marginBottom: '6px' }}>অথবা যেকোনো পণ্য সরাসরি লিখুন:</div>
                <div className="row-3">
                  <input
                    id="custom-item-name"
                    type="text"
                    className="input-field"
                    placeholder="পণ্যের নাম"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                  />
                  <input
                    id="custom-item-qty"
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder="সংখ্যা"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(e.target.value)}
                  />
                  <input
                    id="custom-item-price"
                    type="number"
                    min="0"
                    className="input-field"
                    placeholder="দর (৳)"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                  />
                </div>
                <button
                  id="btn-add-custom-item"
                  type="button"
                  className="btn btn-outline"
                  style={{ width: '100%', marginTop: '8px' }}
                  onClick={addCustomToCart}
                >
                  + বিলে পণ্যটি যোগ করুন
                </button>
              </div>
            </div>

            {/* Current Bill Cart */}
            <div className="card">
              <div className="card-title">
                <span>৩. বর্তমান ক্যাশমেমো ({cart.length}টি আইটেম)</span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    সব মুছুন
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '18px 8px', color: '#6b7280', fontSize: '0.8rem' }}>
                  উপরের যেকোনো পণ্যের নামের উপর ট্যাপ করে বিল তৈরি শুরু করুন
                </div>
              ) : (
                <table className="cart-table">
                  <thead>
                    <tr>
                      <th>পণ্য</th>
                      <th style={{ textAlign: 'center' }}>পরিমাণ</th>
                      <th style={{ textAlign: 'right' }}>মোট</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{item.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>দর: ৳{item.sellPrice}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button type="button" className="qty-btn" onClick={() => updateCartQty(idx, -1)}>-</button>
                            <span style={{ fontWeight: 700 }}>{item.qty}</span>
                            <button type="button" className="qty-btn" onClick={() => updateCartQty(idx, 1)}>+</button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>
                          ৳{item.qty * item.sellPrice}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ borderTop: '1px solid #dde5e0', marginTop: '12px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>মোট বিল:</span>
                  <strong style={{ fontSize: '1rem' }}>{formatBDT(cartSubtotal)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>ডিসকাউন্ট (ছাড় ৳):</span>
                  <input
                    id="pos-discount-input"
                    type="number"
                    min="0"
                    className="input-field"
                    style={{ width: '110px', textAlign: 'right', padding: '6px 10px' }}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>পেমেন্ট মাধ্যম:</span>
                  <select
                    id="pos-payment-method"
                    className="input-field"
                    style={{ width: '130px', padding: '6px 10px' }}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="নগদ">💵 নগদ ক্যাশ</option>
                    <option value="বিকাশ">📱 বিকাশ</option>
                    <option value="নগদ অ্যাপ">📱 নগদ অ্যাপ</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>কাস্টমার জমা দিলেন (৳):</span>
                  <input
                    id="pos-paid-input"
                    type="number"
                    min="0"
                    className="input-field"
                    style={{ width: '110px', textAlign: 'right', padding: '6px 10px', fontWeight: 800 }}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: currentDue > 0 ? '#fef2f2' : '#ecfdf5', borderRadius: '10px' }}>
                  <span style={{ fontWeight: 700, color: currentDue > 0 ? '#dc2626' : '#059669' }}>
                    {currentDue > 0 ? 'বাকি থাকলো (Due):' : 'সম্পূর্ণ পরিশোধিত:'}
                  </span>
                  <strong style={{ fontSize: '0.96rem', color: currentDue > 0 ? '#dc2626' : '#059669' }}>
                    {formatBDT(currentDue)}
                  </strong>
                </div>

                <button
                  id="btn-complete-sale"
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={completeSale}
                >
                  ✅ বিল সেভ করুন ও ক্যাশমেমো দিন
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: DUE LEDGER (বাকি খাতা) */}
        {activeTab === 'due' && (
          <>
            <div className="card">
              <div className="card-title">
                <span>📒 কাস্টমারের বাকি খাতা (মোট পাওনা: {formatBDT(totalDue)})</span>
                <button
                  id="btn-toggle-direct-due"
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  onClick={() => setShowDirectDue(!showDirectDue)}
                >
                  + পুরাতন বাকি যোগ
                </button>
              </div>

              {showDirectDue && (
                <div style={{ background: '#eef3f0', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                  <div className="input-label" style={{ marginBottom: '8px' }}>খাতার পুরাতন বা সরাসরি বাকি এন্ট্রি করুন:</div>
                  <div className="input-group">
                    <input
                      id="direct-due-name"
                      type="text"
                      className="input-field"
                      placeholder="কাস্টমারের নাম"
                      value={dueCustName}
                      onChange={(e) => setDueCustName(e.target.value)}
                    />
                  </div>
                  <div className="row-2" style={{ marginBottom: '8px' }}>
                    <input
                      id="direct-due-phone"
                      type="tel"
                      className="input-field"
                      placeholder="মোবাইল নাম্বার"
                      value={dueCustPhone}
                      onChange={(e) => setDueCustPhone(e.target.value)}
                    />
                    <input
                      id="direct-due-amount"
                      type="number"
                      className="input-field"
                      placeholder="বাকির পরিমাণ (৳)"
                      value={dueCustAmount}
                      onChange={(e) => setDueCustAmount(e.target.value)}
                    />
                  </div>
                  <button id="btn-save-direct-due" type="button" className="btn btn-primary btn-block" onClick={handleAddDirectDue}>
                    💾 বাকি খাতায় সেভ করুন
                  </button>
                </div>
              )}

              <div className="item-list">
                {db.sales.filter((s) => Number(s.due) > 0).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '0.82rem' }}>
                    আলহামদুলিল্লাহ! বর্তমানে কোনো কাস্টমারের কাছে বাকি পাওনা নেই।
                  </div>
                ) : (
                  db.sales
                    .filter((s) => Number(s.due) > 0)
                    .map((s) => {
                      const reminderText =
                        `আসসালামু আলাইকুম ${s.customer},\n` +
                        `আমাদের *${db.shop.name}*-এ আপনার *৳${s.due}* টাকা বকেয়া রয়েছে (মেমো: ${s.id})।\n` +
                        (db.shop.bkash ? `বিকাশ/নগদ নাম্বার: ${db.shop.bkash}\n` : '') +
                        `অনুগ্রহ করে দ্রুত পরিশোধ করার অনুরোধ রইলো। ধন্যবাদ!`;
                      const cleanPhone = (s.phone || '').replace(/[^0-9]/g, '');
                      const waUrl = cleanPhone
                        ? `https://wa.me/88${cleanPhone}?text=${encodeURIComponent(reminderText)}`
                        : `https://wa.me/?text=${encodeURIComponent(reminderText)}`;

                      return (
                        <div key={s.id} className="list-row">
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{s.customer}</div>
                            <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                              {s.phone || 'নাম্বার দেওয়া হয়নি'} • {s.date}
                            </div>
                            <div style={{ marginTop: '4px' }}>
                              <span className="badge badge-danger">বাকি: {formatBDT(s.due)}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-success"
                              style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                              onClick={() => handleCollectDue(s.id)}
                            >
                              ✓ টাকা আদায়
                            </button>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline"
                              style={{ padding: '5px 10px', fontSize: '0.72rem', textDecoration: 'none' }}
                            >
                              💬 তাগাদা মেসেজ
                            </a>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 3: INVENTORY & STOCK (পণ্য ও স্টক) */}
        {activeTab === 'stock' && (
          <>
            <div className="card">
              <div className="card-title">
                <span>📦 নতুন পণ্য ও স্টক যোগ করুন</span>
              </div>
              <div className="input-group">
                <input
                  id="stock-prod-name"
                  type="text"
                  className="input-field"
                  placeholder="পণ্যের নাম (যেমন: প্যারাসিটামল / সয়াবিন তেল ২ লিটার)"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                />
              </div>
              <div className="row-3" style={{ marginBottom: '10px' }}>
                <input
                  id="stock-buy-price"
                  type="number"
                  className="input-field"
                  placeholder="কেনা দাম (৳)"
                  value={prodBuyPrice}
                  onChange={(e) => setProdBuyPrice(e.target.value)}
                />
                <input
                  id="stock-sell-price"
                  type="number"
                  className="input-field"
                  placeholder="বিক্রি দাম (৳)"
                  value={prodSellPrice}
                  onChange={(e) => setProdSellPrice(e.target.value)}
                />
                <input
                  id="stock-qty"
                  type="number"
                  className="input-field"
                  placeholder="স্টক সংখ্যা"
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                />
              </div>
              <button id="btn-add-product" type="button" className="btn btn-primary btn-block" onClick={handleAddProduct}>
                + পণ্য তালিকায় সেভ করুন
              </button>
            </div>

            <div className="card">
              <div className="card-title">
                <span>দোকানের পণ্য তালিকা ({db.products.length}টি)</span>
              </div>
              <div className="item-list">
                {db.products.map((p) => (
                  <div key={p.id} className="list-row">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                        কেনা: ৳{p.buyPrice} • বিক্রি: <strong>৳{p.sellPrice}</strong> • লাভ: ৳{p.sellPrice - p.buyPrice}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${p.stock <= 5 ? 'badge-danger' : 'badge-success'}`}>
                        স্টক: {p.stock}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TAB 4: REPORTS, PROFIT & EXPENSES (হিসাব খাতা) */}
        {activeTab === 'reports' && (
          <>
            <div className="card">
              <div className="card-title">
                <span>📊 লাভ-ক্ষতি ও খরচের হিসাব</span>
              </div>
              <div className="row-2" style={{ marginBottom: '12px' }}>
                <div style={{ padding: '10px', background: '#ecfdf5', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#059669' }}>মোট বিক্রি থেকে লাভ</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>{formatBDT(grossProfit)}</div>
                </div>
                <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#dc2626' }}>দোকানের মোট খরচ</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>{formatBDT(totalExpenses)}</div>
                </div>
              </div>

              <div className="input-label" style={{ marginBottom: '6px' }}>দোকানের দৈনিক খরচ যোগ করুন (বিদ্যুৎ, ভাড়া, নাস্তা):</div>
              <div className="row-2" style={{ marginBottom: '8px' }}>
                <input
                  id="exp-title-input"
                  type="text"
                  className="input-field"
                  placeholder="খরচের বিবরণ"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                />
                <input
                  id="exp-amount-input"
                  type="number"
                  className="input-field"
                  placeholder="টাকার পরিমাণ (৳)"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                />
              </div>
              <button id="btn-add-expense" type="button" className="btn btn-outline btn-block" onClick={handleAddExpense}>
                + খরচ যুক্ত করুন
              </button>
            </div>

            <div className="card">
              <div className="card-title">
                <span>🧾 সকল বিক্রির মেমো তালিকা ({db.sales.length})</span>
              </div>
              <div className="item-list">
                {db.sales.map((s) => (
                  <div key={s.id} className="list-row">
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                        {s.customer} <span style={{ color: '#6b7280', fontWeight: 500 }}>({s.id})</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{s.date} • {s.paymentMethod}</div>
                      <div style={{ fontSize: '0.76rem', marginTop: '3px' }}>
                        বিল: <strong>৳{s.total}</strong> • জমা: ৳{s.paid}{' '}
                        {s.due > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>• বাকি: ৳{s.due}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                      onClick={() => setActiveReceipt(s)}
                    >
                      🧾 মেমো
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TAB 5: SHOP CUSTOMIZATION & BACKUP (সেটিংস) */}
        {activeTab === 'settings' && (
          <>
            <div className="card" style={{ border: '2px solid #0d4a3a', background: '#f0fdf4' }}>
              <div className="card-title">
                <span>📦 অ্যাপ ডাউনলোড সেন্টার (সার্ভার ডাউনলোড লিংক)</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#1f2937', marginBottom: '12px' }}>
                নিচের বাটনে ক্লিক করে সরাসরি আমাদের সার্ভার থেকে সম্পূর্ণ অ্যাপের রেডি বিল্ড অথবা সোর্স কোড ZIP ফাইল আপনার মোবাইল বা কম্পিউটারে ডাউনলোড করে নিন:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a
                  id="btn-dl-ready-zip"
                  href="./downloads/dokan-bondhu-ready-app.zip"
                  download="dokan-bondhu-ready-app.zip"
                  className="btn btn-primary btn-block"
                  style={{ textDecoration: 'none' }}
                >
                  ⬇️ ১. রেডি মোবাইল অ্যাপ ডাউনলোড করুন (ZIP - 83 KB)
                </a>
                <a
                  id="btn-dl-source-zip"
                  href="./downloads/dokan-bondhu-full-project.zip"
                  download="dokan-bondhu-full-project.zip"
                  className="btn btn-outline btn-block"
                  style={{ textDecoration: 'none', background: '#ffffff' }}
                >
                  💻 ২. সম্পূর্ণ সোর্স কোড প্রজেক্ট ডাউনলোড (React + Capacitor ZIP)
                </a>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <span>⚙️ দোকানের নাম ও ব্র্যান্ডিং সেটআপ</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#4b5563', marginBottom: '12px' }}>
                যে দোকানদারের কাছে অ্যাপটি বিক্রি বা সেটআপ করে দেবেন, তার দোকানের নাম ও বিকাশ নাম্বার এখানে লিখে সেভ করে দিন।
              </p>

              <div className="input-group">
                <label className="input-label">দোকানের নাম</label>
                <input
                  id="set-shop-name"
                  type="text"
                  className="input-field"
                  value={shopForm.name}
                  onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                />
              </div>

              <div className="row-2">
                <div className="input-group">
                  <label className="input-label">মালিকের নাম</label>
                  <input
                    id="set-shop-owner"
                    type="text"
                    className="input-field"
                    value={shopForm.owner}
                    onChange={(e) => setShopForm({ ...shopForm, owner: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">মোবাইল নাম্বার</label>
                  <input
                    id="set-shop-phone"
                    type="text"
                    className="input-field"
                    value={shopForm.phone}
                    onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">বিকাশ / নগদ পেমেন্ট নাম্বার (মেমো ও তাগাদা মেসেজে যাবে)</label>
                <input
                  id="set-shop-bkash"
                  type="text"
                  className="input-field"
                  value={shopForm.bkash}
                  onChange={(e) => setShopForm({ ...shopForm, bkash: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">দোকানের ঠিকানা</label>
                <input
                  id="set-shop-address"
                  type="text"
                  className="input-field"
                  value={shopForm.address}
                  onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                />
              </div>

              <button id="btn-save-settings" type="button" className="btn btn-primary btn-block" onClick={handleSaveShopSettings}>
                💾 দোকানের তথ্য সেভ করুন
              </button>
            </div>

            <div className="card">
              <div className="card-title">
                <span>☁️ ডাটাবেজ ব্যাকআপ ও রিস্টোর (নিরাপত্তা)</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '10px' }}>
                দোকানদারের মোবাইল পরিবর্তন বা হারিয়ে গেলেও যেন হিসাব না হারায়, তাই ১ ক্লিকে ব্যাকআপ ফাইল ডাউনলোড করে রাখা যাবে।
              </p>
              <div className="row-2">
                <button id="btn-export-backup" type="button" className="btn btn-outline" onClick={handleExportBackup}>
                  ⬇️ ব্যাকআপ ডাউনলোড
                </button>
                <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                  ⬆️ ব্যাকআপ রিস্টোর
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportBackup} />
                </label>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <span>🔄 ডেমো ডাটা রিসেট</span>
              </div>
              <button
                id="btn-reset-demo"
                type="button"
                className="btn btn-danger btn-block"
                onClick={() => {
                  setDb(JSON.parse(JSON.stringify(DEFAULT_DB)));
                  setShopForm(DEFAULT_DB.shop);
                  showNotice('ডেমো ডাটা রিসেট করা হয়েছে');
                }}
              >
                নতুন দোকানের জন্য সব হিসাব রিসেট করুন
              </button>
            </div>
          </>
        )}
      </main>

      {/* Bottom Mobile App Navigation Bar */}
      <nav className="bottom-nav" aria-label="প্রধান মেনু">
        <button
          id="nav-pos"
          type="button"
          className={`nav-item ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
        >
          <span className="nav-icon">🧾</span>
          <span>ক্যাশমেমো</span>
        </button>
        <button
          id="nav-due"
          type="button"
          className={`nav-item ${activeTab === 'due' ? 'active' : ''}`}
          onClick={() => setActiveTab('due')}
        >
          <span className="nav-icon">📒</span>
          <span>বাকি খাতা</span>
        </button>
        <button
          id="nav-stock"
          type="button"
          className={`nav-item ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          <span className="nav-icon">📦</span>
          <span>পণ্য ও স্টক</span>
        </button>
        <button
          id="nav-reports"
          type="button"
          className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="nav-icon">📊</span>
          <span>হিসাব ও লাভ</span>
        </button>
        <button
          id="nav-settings"
          type="button"
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span>সেটিংস</span>
        </button>
      </nav>

      {/* Printable & WhatsApp Receipt Modal */}
      <ReceiptModal
        sale={activeReceipt}
        shop={db.shop}
        onClose={() => setActiveReceipt(null)}
      />
    </>
  );
}
