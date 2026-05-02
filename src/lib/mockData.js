export const mockProducts = [
  {
    id: 1,
    name: 'Signature Latte',
    price: 38000,
    category: 'Coffee',
    description: 'Espresso dengan susu segar pilihan',
    image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&q=80',
  },
  {
    id: 2,
    name: 'Cold Brew',
    price: 35000,
    category: 'Coffee',
    description: 'Diseduh dingin selama 12 jam',
    image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
  },
  {
    id: 3,
    name: 'Caramel Macchiato',
    price: 42000,
    category: 'Coffee',
    description: 'Vanilla, espresso, dan karamel',
    image_url: 'https://images.unsplash.com/photo-1485808191679-5f86510bd9d4?w=400&q=80',
  },
  {
    id: 4,
    name: 'Matcha Latte',
    price: 38000,
    category: 'Non-Coffee',
    description: 'Matcha premium Jepang dengan susu',
    image_url: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=400&q=80',
  },
  {
    id: 5,
    name: 'Taro Milk Tea',
    price: 35000,
    category: 'Non-Coffee',
    description: 'Taro creamy dengan boba pilihan',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  },
  {
    id: 6,
    name: 'Chocolate Frappe',
    price: 40000,
    category: 'Non-Coffee',
    description: 'Coklat belgia blended dengan es',
    image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',
  },
  {
    id: 7,
    name: 'Butter Croissant',
    price: 28000,
    category: 'Pastry',
    description: 'Croissant renyah dengan mentega premium',
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80',
  },
  {
    id: 8,
    name: 'Banana Bread',
    price: 25000,
    category: 'Pastry',
    description: 'Banana bread lembut homemade',
    image_url: 'https://images.unsplash.com/photo-1605286978633-2dec93ff88a2?w=400&q=80',
  },
];

export const categories = ['Semua', 'Coffee', 'Non-Coffee', 'Pastry'];

export const promos = [
  {
    id: 1,
    title: 'Buy 2 Get 1 Free',
    subtitle: 'Berlaku setiap hari Senin',
    theme: 'green',
    image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
  },
  {
    id: 2,
    title: 'Happy Hour 14.00–16.00',
    subtitle: 'Diskon 20% semua minuman',
    theme: 'amber',
    image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80',
  },
  {
    id: 3,
    title: 'Member Spesial',
    subtitle: 'Poin 2x setiap weekend',
    theme: 'slate',
    image_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80',
  },
];

export const promoThemes = {
  green: 'from-emerald-700 to-emerald-500',
  amber: 'from-amber-600 to-amber-400',
  slate: 'from-slate-700 to-slate-500',
};
