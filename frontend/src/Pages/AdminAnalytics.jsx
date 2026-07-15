import { useState, useEffect } from 'react';
import { collection, collectionGroup, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { TrendingUp, Activity, RotateCcw, AlertTriangle, Radio } from 'lucide-react';
import { db } from '../firebase';
import { theme } from '../theme';
import { Card, StatTile, EmptyState } from '../components/ui';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function AdminAnalytics() {
  const [patients, setPatients] = useState([]);
  const [doseLogs, setDoseLogs] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'patients'), (snapshot) => {
      setPatients(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cutoff = Timestamp.fromDate(new Date(Date.now() - THIRTY_DAYS_MS));
    const q = query(collectionGroup(db, 'doseLogs'), where('timestamp', '>=', cutoff), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDoseLogs(
        snapshot.docs.map((d) => ({
          ...d.data(),
          patientId: d.ref.parent.parent.id
        }))
      );
    });
    return () => unsubscribe();
  }, []);

  const activePatients = patients.filter((p) => !p.archived);
  const totalPatients = activePatients.length;
  const highRiskCount = activePatients.filter((p) => p.riskScore >= 15).length;
  const adherentCount = totalPatients - highRiskCount;
  const refillsPending = activePatients.filter((p) => p.status === 'Refill Requested').length;

  const chartData = [
    { name: 'Adherent', value: adherentCount > 0 ? adherentCount : 1, color: theme.success },
    { name: 'High Risk', value: highRiskCount > 0 ? highRiskCount : 0, color: theme.danger }
  ];

  const takenLogs = doseLogs.filter((l) => l.status === 'taken');
  const systemEfficacy = doseLogs.length > 0 ? Math.round((takenLogs.length / doseLogs.length) * 100) : 0;

  const adherenceTrendData = last7Days().map(({ start, end, label }) => {
    const dayLogs = doseLogs.filter((l) => {
      const t = l.timestamp?.toDate?.();
      return t && t >= start && t < end;
    });
    const dayTaken = dayLogs.filter((l) => l.status === 'taken').length;
    return { day: label, rate: dayLogs.length ? Math.round((dayTaken / dayLogs.length) * 100) : 0 };
  });

  const medicationCounts = activePatients.reduce((acc, p) => {
    const med = p.medication || 'Unspecified';
    acc[med] = (acc[med] || 0) + 1;
    return acc;
  }, {});
  const medicationDemographics = Object.entries(medicationCounts)
    .map(([name, patientCount]) => ({ name, patients: patientCount }))
    .sort((a, b) => b.patients - a.patients)
    .slice(0, 6);

  const recentActivity = doseLogs.slice(0, 6).map((log) => {
    const patient = patients.find((p) => p.id === log.patientId);
    const time = log.timestamp?.toDate?.();
    return {
      time: time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      tone: log.status === 'taken' ? theme.success : theme.danger,
      tag: log.source === 'sms' ? '[SMS]' : '[PORTAL]',
      text: `${patient ? `Patient #${patient.id.slice(0, 6)}` : 'Unknown patient'} — dose ${log.status}`
    };
  });

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">System Analytics</h1>
        <p className="mt-1 text-sm text-text-muted">Enterprise population health and supply chain monitoring.</p>
      </header>

      <div className="fade-in">
        <div className="mb-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
          <StatTile label="System Efficacy (30d)" value={`${systemEfficacy}%`} accent="success" icon={TrendingUp} />
          <StatTile label="Doses Logged (30d)" value={doseLogs.length} accent="primary" valueColor="main" icon={Activity} />
          <StatTile label="Refills Pending" value={refillsPending} accent="warning" icon={RotateCcw} />
          <StatTile label="Critical Drop-offs" value={highRiskCount} accent="danger" icon={AlertTriangle} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <h3 className="mb-6 text-lg font-semibold">7-Day System-Wide Adherence Trend</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adherenceTrendData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: theme.textMuted }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: theme.textMuted }} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="rate" stroke={theme.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="mb-6 text-lg font-semibold">Top Medications</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={medicationDemographics} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.border} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: theme.textMuted }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: theme.textMuted, fontSize: '0.8rem' }} />
                  <Tooltip cursor={{ fill: theme.surface }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="patients" fill={theme.primary} radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
          <Card>
            <h3 className="mb-2 text-lg font-semibold">Live Risk Distribution</h3>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padded={false}>
            <div className="border-b border-border p-5">
              <h3 className="text-lg font-semibold">Recent Dose Activity</h3>
            </div>
            <div className="flex flex-col gap-4 p-6">
              {recentActivity.length === 0 ? (
                <EmptyState icon={Radio} title="No dose activity yet" description="Dose events from the last 30 days will show up here." />
              ) : (
                recentActivity.map((item, i) => (
                  <div key={i} className="flex gap-4 text-sm">
                    <span className="w-20 text-text-muted">{item.time}</span>
                    <span className="font-semibold" style={{ color: item.tone }}>{item.tag}</span>
                    <span>{item.text}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    days.push({ start, end, label: start.toLocaleDateString('en-US', { weekday: 'short' }) });
  }
  return days;
}
