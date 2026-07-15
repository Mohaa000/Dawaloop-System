import { LayoutDashboard, BarChart3, Pill, Bell, Settings, User, ClipboardList, RefreshCcw, MessageCircle } from 'lucide-react';

// Patient Detail (/admin/patients/:id) is intentionally excluded — reached via
// a row click in the triage table, not a sidebar destination.
export const NAV_CONFIG = {
  admin: [
    { path: '/admin', label: 'Clinical Command', icon: LayoutDashboard },
    { path: '/admin/analytics', label: 'System Analytics', icon: BarChart3 },
    { path: '/admin/inventory', label: 'Inventory', icon: Pill },
    { path: '/admin/alerts', label: 'Alerts', icon: Bell },
    { path: '/admin/settings', label: 'Staff & Settings', icon: Settings }
  ],
  patient: [
    { path: '/portal', label: 'Daily Dose', icon: User },
    { path: '/portal/analytics', label: 'My Progress', icon: BarChart3 },
    { path: '/portal/history', label: 'Medication History', icon: ClipboardList },
    { path: '/portal/refills', label: 'Refill Requests', icon: RefreshCcw },
    { path: '/portal/support', label: 'Support', icon: MessageCircle },
    { path: '/portal/profile', label: 'Profile', icon: Settings }
  ]
};
