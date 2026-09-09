import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/SectionTitle';
import {
  Activity,
  Droplet,
  HeartPulse,
  Stethoscope,
  Eye,
  TimerReset,
  FlaskConical,
  Wind,
} from 'lucide-react';
import type { DiagnosticLoaded, Vitalwerte } from '../../types';

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="w-28 shrink-0 text-sm font-semibold text-muted-foreground">{label}</span>
      <span className="text-sm">{value || '–'}</span>
    </div>
  );
}

export function DiagnosticCard({ diagnose, blickdiagnose, befund, symptome }: DiagnosticLoaded) {
  return (
    <Card className="p-4">
      <SectionTitle icon={<Stethoscope />} title="Diagnostische Angaben" />
      <div className="divide-y divide-border">
        <DiagnosticRow label="Diagnose" value={diagnose} />
        <DiagnosticRow label="Blickdiagnose" value={blickdiagnose} />
        <DiagnosticRow label="Befund" value={befund} />
        <DiagnosticRow label="Symptome" value={symptome} />
      </div>
    </Card>
  );
}

function VitalItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2">
      <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-bold tabular-nums">{value || '–'}</span>
    </div>
  );
}

export function VitalCard({ gcs, spo2, rekap, sysRr, ekg, af, hb }: Vitalwerte) {
  return (
    <Card className="p-4">
      <SectionTitle icon={<HeartPulse />} title="Vitalparameter" />
      <div className="grid grid-cols-2 gap-2">
        <VitalItem icon={<Eye />} label="GCS" value={gcs} />
        <VitalItem icon={<Droplet />} label="sys.RR" value={sysRr} />
        <VitalItem icon={<Wind />} label="SpO₂" value={spo2} />
        <VitalItem icon={<HeartPulse />} label="EKG" value={ekg} />
        <VitalItem icon={<TimerReset />} label="Rekap" value={rekap} />
        <VitalItem icon={<Activity />} label="AF" value={af} />
        <VitalItem icon={<FlaskConical />} label="Hb" value={hb} />
      </div>
    </Card>
  );
}
