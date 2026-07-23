import { LayoutDashboard, UserPlus, Pill, Bell, Settings, FileBarChart2, UserCog, Activity, User, ClipboardList, RefreshCcw, MessageCircle } from 'lucide-react';

// Patient Detail (/admin|nurse/patients/:id) is intentionally excluded from
// nav — reached via a row click in the triage table, not a sidebar destination.
export const NAV_CONFIG = {
  // Admin: system oversight. Day-to-day clinical work (enrollment, inventory)
  // lives on the nurse side instead.
  admin: [
    { path: '/admin', label: 'Clinical Command', icon: LayoutDashboard },
    { path: '/admin/alerts', label: 'Alerts', icon: Bell },
    { path: '/admin/settings', label: 'Clinic Settings', icon: Settings },
    { path: '/admin/reports', label: 'Reports', icon: FileBarChart2 },
    { path: '/admin/nurses', label: 'Nurses & Settings', icon: UserCog },
    { path: '/admin/activity', label: 'Activity Log', icon: Activity }
  ],
  // Nurse: hands-on patient care.
  nurse: [
    { path: '/nurse', label: 'Clinical Command', icon: LayoutDashboard },
    { path: '/nurse/enrollment', label: 'Patient Enrollment', icon: UserPlus },
    { path: '/nurse/inventory', label: 'Inventory', icon: Pill },
    { path: '/nurse/alerts', label: 'Alerts', icon: Bell }
  ],
  patient: [
    { path: '/portal', label: 'Daily Dose', icon: User },
    { path: '/portal/history', label: 'Medication History', icon: ClipboardList },
    { path: '/portal/refills', label: 'Refill Requests', icon: RefreshCcw },
    { path: '/portal/support', label: 'Support', icon: MessageCircle },
    { path: '/portal/profile', label: 'Profile', icon: Settings }
  ]
};
