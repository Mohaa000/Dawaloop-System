import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Pill, ShieldCheck } from 'lucide-react';
import { auth } from '../firebase';

const BACKGROUND_IMAGE_URL = '/login-nurse.jpg';

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
    <div
      className="relative flex h-screen items-center justify-center bg-cover bg-center font-sans"
      style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1f1c]/80 via-[#0b1f1c]/60 to-primary-dark/70" />

      <div className="fade-in relative z-10 w-full max-w-[400px] rounded-card border border-white/10 bg-surface/95 p-10 shadow-soft-lg backdrop-blur-sm">
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
