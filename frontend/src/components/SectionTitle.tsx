import type { ReactNode } from 'react';

interface SectionTitleProps {
  icon: ReactNode;
  title: string;
  /** Optionaler Inhalt rechts (z. B. Lock-Schalter). */
  action?: ReactNode;
}

/** Karten-Abschnittstitel: Icon-Tile + Titel (Satz-Schreibweise, kein Uppercase). */
export function SectionTitle({ icon, title, action }: SectionTitleProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-foreground [&_svg]:size-4">
          {icon}
        </span>
        <h3 className="font-bold">{title}</h3>
      </div>
      {action}
    </div>
  );
}
