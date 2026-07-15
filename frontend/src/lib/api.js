import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Creates a passwordless Firebase Auth login for a new patient or staff
// member via the backend (which holds the firebase-admin service account).
// Returns { uid }. The account has no password until the recipient sets
// their own via the email triggered by sendAccountSetupEmail().
export async function createAccount({ email, name, role }) {
  const res = await fetch(`${API_BASE_URL}/api/admin/create-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': import.meta.env.VITE_ADMIN_API_SECRET
    },
    body: JSON.stringify({ email, name, role })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Account creation failed');
  }

  return res.json();
}

// Firebase sends its built-in "reset your password" email, which for an
// account with no password yet effectively serves as a "set your password"
// invite. No secret ever passes through the admin.
export function sendAccountSetupEmail(email) {
  return sendPasswordResetEmail(auth, email);
}

// Disables (archive) or re-enables (reactivate) a patient/staff login.
export async function setAccountDisabled(uid, disabled) {
  const res = await fetch(`${API_BASE_URL}/api/admin/set-account-disabled`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': import.meta.env.VITE_ADMIN_API_SECRET
    },
    body: JSON.stringify({ uid, disabled })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to update account status');
  }

  return res.json();
}
