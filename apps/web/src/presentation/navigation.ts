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
  { label: 'Main navigation', items: [{ page: 'Dashboard', icon: LayoutDashboard }, { page: 'Batches', icon: Layers }] },
  { label: 'Workflow', items: [{ page: 'Reports', icon: FileText }] },
  { label: 'Configuration', items: [{ page: 'Products', icon: Beaker }, { page: 'Calibration', icon: SlidersHorizontal }] },
  { label: 'System', items: [{ page: 'Users', icon: UsersIcon }] },
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

export const pageDescriptions: Record<Exclude<Page, 'Login'>, string> = {
  Dashboard: 'Overview of testing queue, recent results, and system status.',
  Batches: 'Manage spray testing batches, draft setups, and historical runs.',
  Reports: 'Generated PDF reports and raw CSV data export for quality assurance.',
  Products: 'Manage product catalog, expected nozzle geometries, and target limits.',
  Calibration: 'System-wide physical calibration for spatial reference mapping.',
  Users: 'Manage operator access, roles, and shift configurations.',
  Settings: 'Hardware configuration, integration endpoints, and maintenance logs.',
};
