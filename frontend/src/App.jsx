import { useState, useEffect } from 'react';
import { theme, layout } from './theme';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase'; 

// Import your new pages (we will build these next)
import AdminAnalytics from "./Pages/AdminAnalytics";
import PatientAnalytics from "./pages/PatientAnalytics";
import AdminDashboard from './Pages/AdminDashboard';
import PatientPortal from './Pages/PatientPortal';


function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // The Architectural Fork
        if (currentUser.email === 'admin@dawaloop.com') {
          setUserRole('admin');
        } else {
          setUserRole('patient');
        }
      }
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthError('');
    } catch (error) {
      setAuthError('Invalid credentials. Access denied.');
    }
  };

  if (isCheckingAuth) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgBase }}><h2 style={{ color: theme.primary }}>Loading Secure Portal...</h2></div>;

  // --- UNAUTHENTICATED ROUTE (Login Screen) ---
  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: theme.bgBase, fontFamily: layout.fontFamily }}>
        <div style={{ backgroundColor: theme.surface, padding: '40px', borderRadius: '10px', boxShadow: layout.cardShadow, width: '100%', maxWidth: '400px' }}>
          <h1 style={{ color: theme.textMain, margin: '0 0 24px 0', textAlign: 'center' }}>DawaCore<span style={{color: theme.primary}}>.</span></h1>
          {authError && <div style={{ backgroundColor: theme.dangerLight, color: theme.danger, padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{authError}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, boxSizing: 'border-box' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, boxSizing: 'border-box' }} />
            <button type="submit" style={{ padding: '12px', backgroundColor: theme.primary, color: theme.surface, border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Authenticate</button>
          </form>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED ROUTES (The Forked Paths) ---
  return (
    <BrowserRouter>
      <Routes>
        {/* If Admin logs in, send them to /admin, otherwise block them */}
        <Route path="/admin" element={
          userRole === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/portal" />
        } />
<Route path="/admin" element={
          userRole === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/portal" />
        } />

        {/* This path handles the admin chart page directly */}
        <Route path="/admin/analytics" element={
          userRole === 'admin' ? <AdminAnalytics user={user} /> : <Navigate to="/portal" />
        } />
        {/* If Patient logs in, send them to /portal, otherwise block them */}
        <Route path="/portal" element={
          userRole === 'patient' ? <PatientPortal user={user} /> : <Navigate to="/admin" />
        } />
<Route path="/portal" element={
          userRole === 'patient' ? <PatientPortal user={user} /> : <Navigate to="/admin" />
        } />

        {/* --- ADD THIS NEW PATIENT ROUTE --- */}
        <Route path="/portal/analytics" element={
          userRole === 'patient' ? <PatientAnalytics user={user} /> : <Navigate to="/admin" />
        } />
        {/* Catch-all: Route users to their correct home base immediately upon login */}
        <Route path="*" element={
          <Navigate to={userRole === 'admin' ? "/admin" : "/portal"} />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;