import React from 'react';
import { formatBDT } from '../db';

export default function ReceiptModal({ sale, shop, onClose }) {
  if (!sale) return null;

  const sendWhatsAppReceipt = () => {
    const itemLines = sale.items
      .map((i) => `• ${i.name} (${i.qty}টি) = ৳${i.qty * i.sellPrice}`)
      .join('\n');

    const msg =
      `🧾 *${shop.name}*\n` +
      `${shop.address || ''}\n` +
      `মোবাইল: ${shop.phone}\n` +
      `-------------------\n` +
      `মেমো নং: ${sale.id}\n` +
      `কাস্টমার: ${sale.customer}\n` +
      `তারিখ: ${sale.date}\n` +
      `-------------------\n` +
      `${itemLines}\n` +
      `-------------------\n` +
      `মোট বিল: ৳${sale.total}\n` +
      `জমা: ৳${sale.paid}\n` +
      `বাকি (Due): ৳${sale.due}\n` +
      (sale.due > 0 && shop.bkash ? `\nবিকাশ/নগদ পেমেন্ট: ${shop.bkash}\n` : '') +
      `\nধন্যবাদ, আবার আসবেন!`;

    const cleanPhone = (sale.phone || '').replace(/[^0-9]/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/88${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="modal-backdrop" id="receipt-modal-backdrop">
      <div className="modal-card">
        <div className="receipt-paper">
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0d4a3a' }}>{shop.name}</h2>
            <p style={{ fontSize: '0.74rem', color: '#4b5563' }}>{shop.address}</p>
            <p style={{ fontSize: '0.74rem', color: '#4b5563' }}>প্রোঃ {shop.owner} • {shop.phone}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '8px' }}>
            <div>
              <strong>কাস্টমার:</strong> {sale.customer}
              {sale.phone ? ` (${sale.phone})` : ''}
            </div>
            <div>
              <strong>#{sale.id}</strong>
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '8px' }}>
            তারিখ: {sale.date} • মাধ্যম: {sale.paymentMethod || 'নগদ'}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', marginBottom: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '4px 0' }}>বিবরণ</th>
                <th style={{ padding: '4px 0', textAlign: 'center' }}>পরিমাণ</th>
                <th style={{ padding: '4px 0', textAlign: 'right' }}>মোট</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px dashed #f1f5f9' }}>
                  <td style={{ padding: '5px 0' }}>{item.name}</td>
                  <td style={{ padding: '5px 0', textAlign: 'center' }}>{item.qty} × ৳{item.sellPrice}</td>
                  <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 700 }}>
                    ৳{item.qty * item.sellPrice}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sale.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ডিসকাউন্ট ছাড়:</span>
                <span>- {formatBDT(sale.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.88rem' }}>
              <span>সর্বমোট বিল:</span>
              <span>{formatBDT(sale.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 700 }}>
              <span>নগদ/বিকাশ জমা:</span>
              <span>{formatBDT(sale.paid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 800 }}>
              <span>বাকি (Due):</span>
              <span>{formatBDT(sale.due)}</span>
            </div>
          </div>

          {shop.bkash && (
            <div style={{ marginTop: '10px', padding: '6px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', fontSize: '0.72rem' }}>
              পেমেন্ট নাম্বার: <strong>{shop.bkash}</strong>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.72rem', color: '#6b7280' }}>
            ধন্যবাদ! আমাদের দোকানে আবার আসবেন।
          </div>
        </div>

        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '14px' }}>
          <button id="btn-print-receipt" className="btn btn-primary" onClick={() => window.print()}>
            🖨️ প্রিন্ট/PDF
          </button>
          <button id="btn-wa-receipt" className="btn btn-success" onClick={sendWhatsAppReceipt}>
            💬 WhatsApp
          </button>
          <button id="btn-close-receipt" className="btn btn-outline" onClick={onClose}>
            ✕ বন্ধ
          </button>
        </div>
      </div>
    </div>
  );
}
