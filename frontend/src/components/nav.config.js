import { LayoutDashboard, UserPlus, Pill, Bell, Settings, User, ClipboardList, RefreshCcw, MessageCircle } from 'lucide-react';

// Patient Detail (/admin|nurse/patients/:id) is intentionally excluded from
// nav — reached via a row click in the triage table, not a sidebar destination.
const ADMIN_NAV = [
  { path: '/admin', label: 'Clinical Command', icon: LayoutDashboard },
  { path: '/admin/enrollment', label: 'Patient Enrollment', icon: UserPlus },
  { path: '/admin/inventory', label: 'Inventory', icon: Pill },
  { path: '/admin/alerts', label: 'Alerts', icon: Bell },
  { path: '/admin/nurses', label: 'Nurses & Settings', icon: Settings }
];

export const NAV_CONFIG = {
  admin: ADMIN_NAV,
  // Nurse gets the same pages as admin for now, just under its own URL space.
  nurse: ADMIN_NAV.map((item) => ({ ...item, path: item.path.replace('/admin', '/nurse') })),
  patient: [
    { path: '/portal', label: 'Daily Dose', icon: User },
    { path: '/portal/history', label: 'Medication History', icon: ClipboardList },
    { path: '/portal/refills', label: 'Refill Requests', icon: RefreshCcw },
    { path: '/portal/support', label: 'Support', icon: MessageCircle },
    { path: '/portal/profile', label: 'Profile', icon: Settings }
  ]
};
