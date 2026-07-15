import { Phone, Mail, Clock, Siren } from 'lucide-react';
import { Card } from '../components/ui';

const CLINIC_CONTACT = {
  name: 'DawaLoop Partner Clinic',
  phone: '+254 700 000 000',
  email: 'care@dawaloop.com',
  hours: 'Mon–Fri, 8:00 AM – 5:00 PM (Africa/Nairobi)'
};

export default function Support() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Support & Contact Clinic</h1>
        <p className="mt-1 text-sm text-text-muted">Reach your care team directly for anything urgent.</p>
      </header>

      <div className="fade-in grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Clinic Contact</h3>
          <div className="flex flex-col gap-3 text-sm">
            <div className="font-medium">{CLINIC_CONTACT.name}</div>
            <a href={`tel:${CLINIC_CONTACT.phone}`} className="flex items-center gap-2 text-primary hover:underline">
              <Phone size={16} /> {CLINIC_CONTACT.phone}
            </a>
            <a href={`mailto:${CLINIC_CONTACT.email}`} className="flex items-center gap-2 text-primary hover:underline">
              <Mail size={16} /> {CLINIC_CONTACT.email}
            </a>
            <div className="flex items-center gap-2 text-text-muted">
              <Clock size={16} /> {CLINIC_CONTACT.hours}
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-danger">
            <Siren size={18} /> In an Emergency
          </h3>
          <p className="text-sm text-text-muted">
            If you are experiencing a medical emergency, call your local emergency services immediately. This portal is
            for medication adherence support and is not monitored for urgent medical issues.
          </p>
        </Card>
      </div>
    </div>
  );
}
