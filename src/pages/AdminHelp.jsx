import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Rocket, UtensilsCrossed, ClipboardList, QrCode, BarChart3, Settings, HelpCircle } from 'lucide-react';

const SECTIONS = [
  {
    icon: Rocket,
    title: 'Cara Setup Awal',
    content: `1. Login ke halaman admin dengan email dan password yang sudah didaftarkan.
2. Saat pertama kali login, Setup Wizard akan muncul otomatis.
3. Isi nama toko yang akan ditampilkan ke pelanggan.
4. Upload gambar QRIS untuk pembayaran digital.
5. Atur jam operasional toko (jam buka dan tutup).
6. Tambahkan cabang pertama toko kamu.
7. Klik "Mulai Terima Pesanan" untuk menyelesaikan setup.

Setelah setup selesai, kamu bisa langsung mulai menambahkan menu dan menerima pesanan.`,
  },
  {
    icon: UtensilsCrossed,
    title: 'Mengelola Menu',
    content: `Menambah Produk:
1. Buka Admin Dashboard → Kelola Menu.
2. Klik tombol "Tambah Produk".
3. Isi nama, harga, kategori, dan upload foto produk.
4. Klik "Simpan" untuk menambahkan ke menu.

Mengedit Produk:
- Klik produk yang ingin diedit, ubah informasi, lalu simpan.

Menghapus Produk:
- Klik ikon hapus pada produk yang ingin dihapus.

Mengatur Kategori:
- Produk otomatis dikelompokkan berdasarkan kategori yang kamu isi.`,
  },
  {
    icon: ClipboardList,
    title: 'Mengelola Pesanan',
    content: `Alur Pesanan:
1. Belum Bayar → Pelanggan sudah order, menunggu pembayaran.
2. Sudah Bayar → Pembayaran dikonfirmasi, siap diproses.
3. Diproses → Pesanan sedang dibuat.
4. Siap → Pesanan siap diambil pelanggan.
5. Selesai → Pesanan sudah diambil.

Konfirmasi Pembayaran:
- Untuk pembayaran QRIS, klik "Konfirmasi Bayar" setelah memverifikasi pembayaran masuk.
- Untuk pembayaran cash, konfirmasi setelah menerima uang tunai.

Membatalkan Pesanan:
- Klik "Batalkan" pada pesanan yang ingin dibatalkan.`,
  },
  {
    icon: QrCode,
    title: 'Pembayaran QRIS',
    content: `Upload QRIS:
1. Buka Pengaturan → Branding → QRIS Pembayaran.
2. Klik "Upload QRIS" dan pilih gambar QRIS dari perangkat.
3. Gambar QRIS akan otomatis ditampilkan ke pelanggan saat checkout.

Cara Pelanggan Bayar:
1. Pelanggan memilih metode pembayaran QRIS saat checkout.
2. Halaman status pesanan menampilkan gambar QRIS.
3. Pelanggan scan QRIS menggunakan e-wallet (GoPay, OVO, DANA, dll).
4. Admin mengkonfirmasi pembayaran di dashboard.

Tips:
- Pastikan QRIS yang diupload jelas dan mudah di-scan.
- Gunakan format JPG atau PNG dengan resolusi yang baik.`,
  },
  {
    icon: BarChart3,
    title: 'Laporan Penjualan',
    content: `Melihat Laporan:
1. Buka Admin Dashboard → Laporan Penjualan.
2. Pilih rentang tanggal yang ingin dilihat.
3. Lihat total revenue, jumlah pesanan, dan item terlaris.

Export Data:
- Klik tombol "Export CSV" untuk mengunduh data penjualan.
- File CSV bisa dibuka di Excel atau Google Sheets.

Statistik yang Tersedia:
- Total pendapatan per hari/minggu/bulan
- Jumlah pesanan
- Menu paling laris
- Rata-rata nilai pesanan`,
  },
  {
    icon: Settings,
    title: 'Pengaturan',
    content: `Ganti Nama Toko:
- Buka Pengaturan → Branding → ubah nama toko → Simpan.

Ganti Password:
- Buka Pengaturan → Ganti Password → isi password baru → Ubah Password.

Reset Data:
- Buka Pengaturan → Reset Data.
- Ketik "RESET" untuk konfirmasi.
- Semua pesanan dan review akan dihapus. Menu dan pengaturan tetap aman.

Upload Logo & QRIS:
- Buka Pengaturan → Branding → upload file gambar.`,
  },
  {
    icon: HelpCircle,
    title: 'FAQ',
    content: `T: Apakah pelanggan perlu login untuk memesan?
J: Tidak. Pelanggan cukup mengisi nama saat checkout.

T: Bagaimana pelanggan tahu pesanannya sudah siap?
J: Halaman status pesanan akan otomatis update secara realtime.

T: Bisa ganti QRIS kapan saja?
J: Ya, buka Pengaturan → Branding → Upload QRIS baru.

T: Apa yang terjadi jika saya reset data?
J: Semua pesanan, review, dan counter akan dihapus. Menu dan pengaturan toko tetap aman.

T: Bagaimana cara menambah admin baru?
J: Saat ini hanya mendukung satu akun admin. Hubungi developer untuk menambah akun.

T: Apakah bisa diakses dari HP?
J: Ya, aplikasi ini responsive dan bisa diakses dari browser HP manapun.`,
  },
];

function AccordionItem({ section, isOpen, onToggle }) {
  const Icon = section.icon;
  return (
    <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left active:bg-surface-secondary transition-colors"
      >
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-primary" />
        </div>
        <span className="flex-1 font-semibold text-text-primary text-sm">{section.title}</span>
        <ChevronDown
          size={18}
          className={`text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-4 pt-0">
          <div className="bg-surface-secondary rounded-xl p-4">
            <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
              {section.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminHelp() {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <div className="page-enter min-h-screen bg-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto flex items-center gap-3">
          <Link
            to="/admin/settings"
            className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold text-text-primary flex-1">Bantuan</h1>
        </div>
      </header>

      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 mt-4 space-y-3">
        <div className="text-center mb-4">
          <p className="text-sm text-text-secondary">Panduan lengkap penggunaan aplikasi</p>
        </div>

        {SECTIONS.map((section, idx) => (
          <AccordionItem
            key={idx}
            section={section}
            isOpen={openIdx === idx}
            onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
          />
        ))}
      </main>
    </div>
  );
}
