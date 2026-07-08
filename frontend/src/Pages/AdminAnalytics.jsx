import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase';
import { theme, layout } from '../theme';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';

export default function AdminAnalytics({ user }) {
  const [patients, setPatients] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // REAL FIREBASE DATA
  useEffect(() => {
    if (!user) return;
    const patientsRef = collection(db, 'patients');
    const unsubscribe = onSnapshot(patientsRef, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      }));
      setPatients(patientData);
    });
    return () => unsubscribe();
  }, [user]);

  // LIVE METRICS
  const totalPatients = patients.length;
  const highRiskCount = patients.filter(p => p.riskScore >= 15).length;
  const adherentCount = totalPatients - highRiskCount;

  const chartData = [
    { name: 'Adherent', value: adherentCount > 0 ? adherentCount : 1, color: theme.success },
    { name: 'High Risk', value: highRiskCount > 0 ? highRiskCount : 0, color: theme.danger }
  ];

  // MOCK DATA (To make the dashboard look busy and enterprise-grade)
  const adherenceTrendData = [
    { day: 'Mon', rate: 72 }, { day: 'Tue', rate: 75 }, { day: 'Wed', rate: 70 },
    { day: 'Thu', rate: 82 }, { day: 'Fri', rate: 88 }, { day: 'Sat', rate: 85 }, { day: 'Sun', rate: 91 }
  ];

  const medicationDemographics = [
    { name: 'Metformin', patients: 45 }, { name: 'Lisinopril', patients: 38 }, 
    { name: 'Amoxicillin', patients: 22 }, { name: 'Atorvastatin', patients: 30 }
  ];

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
            <button onClick={() => navigate('/admin')} style={navButtonStyle(location.pathname === '/admin', theme)}>📊 Clinical Command</button>
            <button onClick={() => navigate('/admin/analytics')} style={navButtonStyle(location.pathname === '/admin/analytics', theme)}>📈 System Analytics</button>
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, color: theme.textMain }}>System Analytics</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: theme.textMuted }}>Enterprise population health and supply chain monitoring.</p>
        </header>

        <div className="fade-in">
          
          {/* TOP DENSE METRICS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <div style={cardStyle}><div style={metricLabelStyle}>System Efficacy</div><div style={metricValueStyle(theme.success)}>91.4%</div></div>
            <div style={cardStyle}><div style={metricLabelStyle}>Doses Logged (30d)</div><div style={metricValueStyle(theme.textMain)}>1,248</div></div>
            <div style={cardStyle}><div style={metricLabelStyle}>Refills Pending</div><div style={metricValueStyle(theme.warning)}>14</div></div>
            <div style={cardStyle}><div style={metricLabelStyle}>Critical Drop-offs</div><div style={metricValueStyle(theme.danger)}>{highRiskCount}</div></div>
          </div>

          {/* MIDDLE ROW: AREA CHART & BAR CHART */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
            
            {/* 7-Day Trend (Area Chart) */}
            <div style={{ ...cardStyle, padding: '24px' }}>
              <h3 style={{ marginTop: '0', color: theme.textMain, fontSize: '1.1rem', marginBottom: '24px' }}>7-Day System-Wide Adherence Trend</h3>
              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={adherenceTrendData}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: theme.textMuted}} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: theme.textMuted}} unit="%"/>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: layout.cardShadow }} />
                    <Area type="monotone" dataKey="rate" stroke={theme.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Demographics (Bar Chart) */}
            <div style={{ ...cardStyle, padding: '24px' }}>
              <h3 style={{ marginTop: '0', color: theme.textMain, fontSize: '1.1rem', marginBottom: '24px' }}>Top Medications</h3>
              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={medicationDemographics} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.border} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: theme.textMuted}}/>
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: theme.textMuted, fontSize: '0.8rem'}}/>
                    <Tooltip cursor={{fill: theme.surface}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: layout.cardShadow }} />
                    <Bar dataKey="patients" fill={theme.primary} radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* BOTTOM ROW: DONUT CHART & SYSTEM LOGS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            
            {/* Live Risk Distribution (Donut Chart) */}
            <div style={{ ...cardStyle, padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginTop: '0', color: theme.textMain, fontSize: '1.1rem', marginBottom: '8px' }}>Live Risk Distribution</h3>
              <div style={{ flexGrow: 1, minHeight: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: layout.cardShadow }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Logs (Mocked for visual density) */}
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.surface }}><h3 style={{ margin: 0, color: theme.textMain, fontSize: '1.1rem' }}>Recent API Activity</h3></div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}><span style={{ color: theme.textMuted, width: '80px' }}>10:42 AM</span><span style={{ color: theme.success, fontWeight: '600' }}>[POST]</span><span style={{ color: theme.textMain }}>Dose logged securely by Patient ID #8492</span></div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}><span style={{ color: theme.textMuted, width: '80px' }}>10:15 AM</span><span style={{ color: theme.primary, fontWeight: '600' }}>[UPDATE]</span><span style={{ color: theme.textMain }}>Inventory recalibrated for Metformin batch B-99</span></div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}><span style={{ color: theme.textMuted, width: '80px' }}>09:05 AM</span><span style={{ color: theme.danger, fontWeight: '600' }}>[ALERT]</span><span style={{ color: theme.textMain }}>Automated SMS dispatch to High Risk cohort</span></div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}><span style={{ color: theme.textMuted, width: '80px' }}>08:30 AM</span><span style={{ color: theme.success, fontWeight: '600' }}>[GET]</span><span style={{ color: theme.textMain }}>Daily Firebase sync completed (24ms)</span></div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}

// REUSABLE STYLES
const cardStyle = { backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '24px' };
const metricLabelStyle = { fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' };
const metricValueStyle = (color) => ({ fontSize: '2rem', fontWeight: '700', color: color, marginTop: '8px' });
const navButtonStyle = (isActive, theme) => ({ display: 'flex', alignItems: 'center', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: isActive ? theme.primaryLight : 'transparent', color: isActive ? theme.primary : theme.textMuted, transition: 'all 0.2s', textAlign: 'left' });