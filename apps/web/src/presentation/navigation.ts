import {
  Beaker,
  FileText,
  LayoutDashboard,
  Layers,
  SlidersHorizontal,
  Users as UsersIcon,
  type LucideIcon,
} from 'lucide-react';

export type NavPage = 'Dashboard' | 'Batches' | 'Reports' | 'Products' | 'Calibration' | 'Users';
export type Page = NavPage | 'Settings' | 'Login';

export const navigation: { label: string; items: { page: NavPage; icon: LucideIcon }[] }[] = [
  { label: 'Navigasi Utama', items: [{ page: 'Dashboard', icon: LayoutDashboard }, { page: 'Batches', icon: Layers }] },
  { label: 'Alur Kerja', items: [{ page: 'Reports', icon: FileText }] },
  { label: 'Konfigurasi', items: [{ page: 'Products', icon: Beaker }, { page: 'Calibration', icon: SlidersHorizontal }] },
  { label: 'Sistem', items: [{ page: 'Users', icon: UsersIcon }] },
];

export const legacyPageToPath: Record<Page, string> = {
  Login: '/login',
  Dashboard: '/dashboard',
  Batches: '/batches',
  Reports: '/reports',
  Products: '/products',
  Calibration: '/calibration',
  Users: '/users',
  Settings: '/settings',
};

export const pathToLegacyPage: Record<string, Page> = {
  '/login': 'Login',
  '/dashboard': 'Dashboard',
  '/batches': 'Batches',
  '/reports': 'Reports',
  '/products': 'Products',
  '/calibration': 'Calibration',
  '/users': 'Users',
  '/settings': 'Settings',
};

export const pageLabels: Record<Page, string> = {
  Login: 'Masuk',
  Dashboard: 'Dasbor',
  Batches: 'Batch',
  Reports: 'Laporan',
  Products: 'Produk',
  Calibration: 'Kalibrasi',
  Users: 'Pengguna',
  Settings: 'Pengaturan',
};

export const pageDescriptions: Record<Exclude<Page, 'Login'>, string> = {
  Dashboard: '',
  Batches: 'Kelola draf, antrean pengujian, dan riwayat batch.',
  Reports: 'Laporan hasil pengujian yang telah difinalisasi.',
  Products: 'Master data spesifikasi produk dan parameter pengujian.',
  Calibration: 'Pemetaan referensi spasial stasiun kamera ganda.',
  Users: 'Manajemen peran dan hak akses operator workstation.',
  Settings: 'Konfigurasi environment dan penyimpanan workstation.',
};
