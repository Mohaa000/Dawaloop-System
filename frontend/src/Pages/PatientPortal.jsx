import { useState } from 'react';
import { Pill, CheckCircle2, AlertTriangle, Clock, Trophy } from 'lucide-react';
import useCurrentPatient from '../hooks/useCurrentPatient';
import { logDoseTaken, requestRefill } from '../lib/patientActions';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui';
import LoadingScreen from '../components/LoadingScreen';

export default function PatientPortal() {
  const { patient: currentPatient, isLoading } = useCurrentPatient();
  const { showToast } = useToast();
  const [justTaken, setJustTaken] = useState(false);

  const handleTakeDose = async () => {
    if (!currentPatient) return;
    try {
      await logDoseTaken(currentPatient);
      setJustTaken(true);
      setTimeout(() => setJustTaken(false), 3000);
    } catch (error) {
      console.error('Error logging dose', error);
      showToast('Failed to log dose. Please try again.', { type: 'error' });
    }
  };

  const handleRequestRefill = async () => {
    if (!currentPatient) return;
    try {
      await requestRefill(currentPatient);
      showToast('Refill requested — your clinic has been notified.', { type: 'success' });
    } catch (error) {
      console.error('Error requesting refill', error);
      showToast('Failed to request refill. Please try again.', { type: 'error' });
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading Secure Health Record..." />;
  }

  if (!currentPatient) {
    return (
      <div className="text-sm text-text-muted">
        No patient record is linked to this login yet. Please contact your clinic to have your account linked.
      </div>
    );
  }

  const isLowInventory = currentPatient.pillsRemaining <= 7;
  const isRefillRequested = currentPatient.status === 'Refill Requested';
  const progressPercent = Math.min((currentPatient.pillsRemaining / 30) * 100, 100);

  return (
    <div className="max-w-[900px]">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Welcome back, {currentPatient.firstName.split(' ')[0]}! 👋</h1>
        <p className="mt-1 text-sm text-text-muted">Your health data is secured with end-to-end AES-256 encryption.</p>
      </header>

      <div className="fade-in flex flex-col gap-6">
        <Card className="border-t-4 border-t-primary text-center !p-10">
          <h2 className="text-xl font-semibold">{currentPatient.medication}</h2>
          <p className="mb-8 text-text-muted">Prescribed dose: {currentPatient.pillsPerDay} pill(s) daily.</p>

          {justTaken ? (
            <div className="inline-flex items-center gap-2 rounded-control bg-success-light px-6 py-5 text-lg font-semibold text-success">
              <CheckCircle2 size={22} /> Dose securely logged for today!
            </div>
          ) : (
            <button
              onClick={handleTakeDose}
              disabled={currentPatient.pillsRemaining <= 0}
              className={`inline-flex items-center gap-2 rounded-full px-10 py-4 text-lg font-bold text-white transition-all active:scale-[0.98] ${
                currentPatient.pillsRemaining <= 0
                  ? 'cursor-not-allowed bg-border'
                  : 'bg-primary shadow-soft hover:bg-primary-dark'
              }`}
            >
              {currentPatient.pillsRemaining <= 0 ? 'Out of Medication' : <><Pill size={20} /> Log Daily Dose</>}
            </button>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <h3 className="mb-4 flex justify-between font-semibold">
              Medication Supply
              <span className={isLowInventory ? 'text-danger' : 'text-success'}>{currentPatient.pillsRemaining} left</span>
            </h3>

            <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-bg-base">
              <div
                className={`h-full transition-all ${isLowInventory ? 'bg-danger' : 'bg-success'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {isLowInventory && !isRefillRequested && (
              <div className="rounded-control border border-warning bg-warning-light p-4">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-warning">
                  <AlertTriangle size={16} /> You are running low on medication.
                </p>
                <button onClick={handleRequestRefill} className="w-full rounded-control bg-warning py-2.5 font-bold text-white transition-all active:scale-[0.98]">
                  Alert Clinic for Refill
                </button>
              </div>
            )}

            {isRefillRequested && (
              <div className="flex items-center justify-center gap-1.5 rounded-control bg-bg-base p-4 text-center text-sm font-semibold text-text-muted">
                <Clock size={16} /> Refill requested. Awaiting clinic approval.
              </div>
            )}

            {!isLowInventory && currentPatient.riskScore < 5 && (
              <div className="flex items-center gap-3 rounded-control bg-primary-light p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Trophy size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-primary-dark">Adherence Champion</div>
                  <div className="text-xs text-text-muted">You are on a perfect streak!</div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="mb-5 font-semibold">Secure Profile</h3>
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase text-text-muted">Decrypted Legal Name</div>
                <div className="rounded-control bg-bg-base p-3 text-sm font-medium">{currentPatient.firstName}</div>
              </div>
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase text-text-muted">Decrypted Mobile</div>
                <div className="rounded-control bg-bg-base p-3 text-sm font-medium">{currentPatient.phoneNumber}</div>
              </div>
              <div className="mt-2 text-xs italic text-text-muted">
                * This data is encrypted in the hospital database and can only be decoded by your authenticated device and authorized clinicians.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
