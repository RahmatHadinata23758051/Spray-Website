import {
  BarChart3,
  Beaker,
  Camera as CameraIcon,
  Crosshair,
  FileText,
  LayoutDashboard,
  Layers,
  SlidersHorizontal,
  Users as UsersIcon,
  type LucideIcon,
} from 'lucide-react';

export type NavPage = 'Dashboard' | 'Batches' | 'Capture' | 'Analysis' | 'Result' | 'Reports' | 'Products' | 'Calibration' | 'Users';
export type Page = NavPage | 'Settings' | 'Login';

export const navigation: { label: string; items: { page: NavPage; icon: LucideIcon }[] }[] = [
  { label: 'Main navigation', items: [{ page: 'Dashboard', icon: LayoutDashboard }, { page: 'Batches', icon: Layers }] },
  { label: 'Workflow', items: [{ page: 'Capture', icon: CameraIcon }, { page: 'Analysis', icon: Crosshair }, { page: 'Result', icon: BarChart3 }, { page: 'Reports', icon: FileText }] },
  { label: 'Configuration', items: [{ page: 'Products', icon: Beaker }, { page: 'Calibration', icon: SlidersHorizontal }] },
  { label: 'System', items: [{ page: 'Users', icon: UsersIcon }] },
];

export const legacyPageToPath: Record<Page, string> = {
  Login: '/login',
  Dashboard: '/dashboard',
  Batches: '/batches',
  Capture: '/capture',
  Analysis: '/analysis',
  Result: '/result',
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
  '/capture': 'Capture',
  '/analysis': 'Analysis',
  '/result': 'Result',
  '/reports': 'Reports',
  '/products': 'Products',
  '/calibration': 'Calibration',
  '/users': 'Users',
  '/settings': 'Settings',
};

export const pageDescriptions: Record<Exclude<Page, 'Login'>, string> = {
  Dashboard: 'Overview of testing queue, recent results, and system status.',
  Batches: 'Manage spray testing batches, draft setups, and historical runs.',
  Capture: 'Acquire synchronized high-speed video frames from side and front cameras.',
  Analysis: 'Review capture timeline, adjust calibration, and correct geometric measurements.',
  Result: 'Finalized test metrics, validation bounds, and automated pass/fail assessment.',
  Reports: 'Generated PDF reports and raw CSV data export for quality assurance.',
  Products: 'Manage product catalog, expected nozzle geometries, and target limits.',
  Calibration: 'System-wide physical calibration for spatial reference mapping.',
  Users: 'Manage operator access, roles, and shift configurations.',
  Settings: 'Hardware configuration, integration endpoints, and maintenance logs.',
};
