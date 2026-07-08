import { signOut } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { theme, layout } from '../theme';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PatientAnalytics({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Mock 7-day patient history data
  const weeklyData = [
    { day: 'Mon', taken: 1 }, { day: 'Tue', taken: 1 },
    { day: 'Wed', taken: 0 }, { day: 'Thu', taken: 1 },
    { day: 'Fri', taken: 1 }, { day: 'Sat', taken: 1 },
    { day: 'Sun', taken: 1 }
  ];

  const adherenceRate = Math.round((6 / 7) * 100); // 6 out of 7 days

  return (
    <div style={{ backgroundColor: theme.bgBase, minHeight: '100vh', fontFamily: layout.fontFamily, color: theme.textMain, display: 'flex' }}>
      
      {/* SIDEBAR WITH ROUTING */}
      <aside style={{ width: '260px', backgroundColor: theme.surface, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 16px', position: 'fixed', height: '100vh', boxSizing: 'border-box' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>D</div>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.025em', color: theme.textMain }}>Dawa<span style={{ color: theme.primary }}>Core</span></span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => navigate('/portal')} style={navButtonStyle(location.pathname === '/portal', theme)}>👤 Daily Dose</button>
            <button onClick={() => navigate('/portal/analytics')} style={navButtonStyle(location.pathname === '/portal/analytics', theme)}>📈 My Progress</button>
          </nav>
        </div>
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px', paddingLeft: '8px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: theme.textMain }}>{user.email}</div>
          <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginBottom: '12px', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => signOut(auth)}>Secure Logout</div>
        </div>
      </aside>

      {/* WORKSPACE */}
      <main style={{ marginLeft: '260px', flexGrow: 1, padding: '40px', boxSizing: 'border-box' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, color: theme.textMain }}>My Health Progress</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: theme.textMuted }}>Track your medication consistency over time.</p>
        </header>

        <div className="fade-in">
          <div style={{ ...cardStyle, marginBottom: '24px', display: 'flex', gap: '40px', alignItems: 'center' }}>
             <div>
                <div style={{ fontSize: '0.85rem', color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>7-Day Adherence Score</div>
                <div style={{ fontSize: '3rem', fontWeight: '700', color: adherenceRate > 80 ? theme.success : theme.warning }}>{adherenceRate}%</div>
             </div>
             <p style={{ color: theme.textMuted, maxWidth: '400px' }}>You have successfully taken your medication 6 out of the last 7 days. Consistency is key to your treatment plan.</p>
          </div>

          <div style={{ ...cardStyle, padding: '32px' }}>
            <h3 style={{ marginTop: '0', color: theme.textMain, fontSize: '1.1rem', marginBottom: '24px' }}>Weekly Dose Log</h3>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: theme.textMuted}} />
                  <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={(val) => val === 1 ? 'Taken' : 'Missed'} axisLine={false} tickLine={false} tick={{fill: theme.textMuted}} width={80}/>
                  <Tooltip cursor={{stroke: theme.border, strokeWidth: 2}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: layout.cardShadow}} />
                  <Line type="monotone" dataKey="taken" stroke={theme.primary} strokeWidth={4} dot={{r: 6, fill: theme.primary, strokeWidth: 2, stroke: theme.surface}} activeDot={{r: 8}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// REUSABLE STYLES
const cardStyle = { backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '24px' };
const navButtonStyle = (isActive, theme) => ({ display: 'flex', alignItems: 'center', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: isActive ? theme.primaryLight : 'transparent', color: isActive ? theme.primary : theme.textMuted, transition: 'all 0.2s', textAlign: 'left' });