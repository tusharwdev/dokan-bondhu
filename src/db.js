const STORAGE_KEY = 'dokan_bondhu_pro_db_v2';

export const DEFAULT_DB = {
  shop: {
    name: 'বিসমিল্লাহ জেনারেল স্টোর',
    owner: 'মোঃ রহিম উদ্দিন',
    phone: '01711-000000',
    bkash: '01711-000000 (বিকাশ/নগদ)',
    address: 'চৌরাস্তা বাজার, সদর',
    pin: ''
  },
  products: [
    { id: 'p1', name: 'মিনিকেট চাল (৫ কেজি)', buyPrice: 330, sellPrice: 360, stock: 25, category: 'মুদি' },
    { id: 'p2', name: 'সয়াবিন তেল (১ লিটার)', buyPrice: 152, sellPrice: 165, stock: 40, category: 'মুদি' },
    { id: 'p3', name: 'মসুর ডাল (১ কেজি)', buyPrice: 120, sellPrice: 135, stock: 18, category: 'মুদি' },
    { id: 'p4', name: 'চিনি (১ কেজি)', buyPrice: 118, sellPrice: 130, stock: 30, category: 'মুদি' },
    { id: 'p5', name: 'ডিম (১ হালি)', buyPrice: 44, sellPrice: 50, stock: 50, category: 'নিত্যপণ্য' },
    { id: 'p6', name: 'লবণ (১ কেজি)', buyPrice: 32, sellPrice: 40, stock: 22, category: 'মুদি' }
  ],
  sales: [
    {
      id: 'INV-1001',
      date: 'আজ, সকাল ১০:৩০',
      customer: 'করিম মিয়া',
      phone: '01712345678',
      items: [
        { id: 'p1', name: 'মিনিকেট চাল (৫ কেজি)', qty: 1, buyPrice: 330, sellPrice: 360 },
        { id: 'p2', name: 'সয়াবিন তেল (১ লিটার)', qty: 1, buyPrice: 152, sellPrice: 165 }
      ],
      discount: 0,
      total: 525,
      paid: 325,
      due: 200,
      profit: 43,
      paymentMethod: 'নগদ + বাকি'
    },
    {
      id: 'INV-1002',
      date: 'আজ, দুপুর ১২:১৫',
      customer: 'সালমা বেগম',
      phone: '01812345678',
      items: [
        { id: 'p4', name: 'চিনি (১ কেজি)', qty: 2, buyPrice: 118, sellPrice: 130 },
        { id: 'p5', name: 'ডিম (১ হালি)', qty: 2, buyPrice: 44, sellPrice: 50 }
      ],
      discount: 0,
      total: 360,
      paid: 200,
      due: 160,
      profit: 36,
      paymentMethod: 'বিকাশ + বাকি'
    }
  ],
  expenses: [
    { id: 'e1', title: 'দোকানের বিদ্যুৎ বিল ও চা-নাস্তা', amount: 120, date: 'আজ, সকাল ১১:০০' }
  ]
};

export function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_DB,
        ...parsed,
        shop: { ...DEFAULT_DB.shop, ...(parsed.shop || {}) }
      };
    }
  } catch (err) {
    console.error('Database load error:', err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

export function saveDatabase(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Database save error:', err);
  }
}

export function formatBDT(amount) {
  return '৳ ' + Number(amount || 0).toLocaleString('bn-BD');
}
