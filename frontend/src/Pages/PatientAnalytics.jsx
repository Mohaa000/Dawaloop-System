import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { theme } from '../theme';
import { Card } from '../components/ui';
import useCurrentPatient from '../hooks/useCurrentPatient';
import LoadingScreen from '../components/LoadingScreen';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PatientAnalytics() {
  const { patient, isLoading: isPatientLoading } = useCurrentPatient();
  const [doseLogs, setDoseLogs] = useState([]);

  useEffect(() => {
    if (!patient) return;
    const q = query(collection(db, 'patients', patient.id, 'doseLogs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDoseLogs(snapshot.docs.map((d) => d.data()));
    });
    return () => unsubscribe();
  }, [patient]);

  if (isPatientLoading) return <LoadingScreen message="Loading your progress..." />;
  if (!patient) return <div className="text-sm text-text-muted">No patient record linked to this login yet.</div>;

  const weeklyData = last7Days().map(({ start, end, label }) => {
    const dayLogs = doseLogs.filter((l) => {
      const t = l.timestamp?.toDate?.();
      return t && t >= start && t < end;
    });
    const taken = dayLogs.some((l) => l.status === 'taken');
    return { day: label, taken: taken ? 1 : 0 };
  });

  const adherenceRate = Math.round((weeklyData.filter((d) => d.taken === 1).length / weeklyData.length) * 100);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">My Health Progress</h1>
        <p className="mt-1 text-sm text-text-muted">Track your medication consistency over time.</p>
      </header>

      <div className="fade-in">
        <Card className="mb-6 flex flex-wrap items-center gap-10">
          <div>
            <div className="text-sm font-semibold uppercase text-text-muted">7-Day Adherence Score</div>
            <div className={`text-5xl font-bold ${adherenceRate > 80 ? 'text-success' : 'text-warning'}`}>{adherenceRate}%</div>
          </div>
          <p className="max-w-[400px] text-text-muted">
            You have taken your medication on {weeklyData.filter((d) => d.taken === 1).length} of the last 7 days. Consistency is key to your treatment plan.
          </p>
        </Card>

        <Card>
          <h3 className="mb-6 text-lg font-semibold">Weekly Dose Log</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: theme.textMuted }} />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 1]}
                  tickFormatter={(val) => (val === 1 ? 'Taken' : 'Missed')}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme.textMuted }}
                  width={80}
                />
                <Tooltip cursor={{ stroke: theme.border, strokeWidth: 2 }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="taken" stroke={theme.primary} strokeWidth={4} dot={{ r: 6, fill: theme.primary, strokeWidth: 2, stroke: theme.surface }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
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
