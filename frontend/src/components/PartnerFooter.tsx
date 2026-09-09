import { cn } from '@/lib/utils';

export function PartnerFooter({ variant = 'default' }: { variant?: 'default' | 'onDark' }) {
  return <footer className={cn('mt-8 pb-5 text-center text-xs', variant === 'onDark' ? 'text-white/70' : 'text-muted-foreground')}>
    DUEB App · Digitale Übungsbeobachtung
  </footer>;
}
