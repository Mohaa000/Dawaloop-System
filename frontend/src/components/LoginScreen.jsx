import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Pill, ShieldCheck } from 'lucide-react';
import { auth } from '../firebase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthError('');
    } catch {
      setAuthError('Invalid credentials. Access denied.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-bg-base font-sans">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-light blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-warning-light blur-3xl" />

      <div className="fade-in relative w-full max-w-[400px] rounded-card border border-border bg-surface p-10 shadow-soft-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
            <Pill size={22} strokeWidth={2.25} />
          </div>
          <h1 className="text-2xl font-bold text-text-main">
            Dawa<span className="text-primary">Core</span>
          </h1>
          <p className="mt-1 text-sm text-text-muted">Secure clinical & patient portal</p>
        </div>

        {authError && (
          <div className="mb-5 rounded-control bg-danger-light p-3 text-center text-sm text-danger">{authError}</div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-control border border-border bg-bg-base px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-control border border-border bg-bg-base px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-control bg-primary py-3 font-semibold text-white shadow-soft transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? 'Authenticating…' : 'Authenticate'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <ShieldCheck size={14} />
          AES-256 encrypted patient data
        </div>
      </div>
    </div>
  );
}
