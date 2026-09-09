import { Contact as ContactIcon, Mail, Phone, Info } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { db } from '../../lib/db';
import { useContacts } from '../home/queries';
import type { Contact } from '../../types';

function initials(c: Contact) {
  return `${(c.first_name || '?')[0]}${(c.last_name || '?')[0]}`.toUpperCase();
}

function ContactCard({ contact }: { contact: Contact }) {
  const { first_name, last_name, email, phone_number, general_info } = contact;
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initials(contact)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold">
            {first_name} {last_name}
          </p>
          <p className="text-xs text-muted-foreground">Kontaktperson</p>
        </div>
      </div>

      {(email || phone_number) && (
        <div className="space-y-1.5">
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-accent hover:underline">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{email}</span>
            </a>
          )}
          {phone_number && (
            <a href={`tel:${phone_number}`} className="flex items-center gap-2 text-sm text-accent hover:underline">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{phone_number}</span>
            </a>
          )}
        </div>
      )}

      {general_info && (
        <div className="flex items-start gap-2 rounded-lg bg-secondary/60 p-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{general_info}</p>
        </div>
      )}
    </Card>
  );
}

export function ContactsPage() {
  useContacts();
  const contacts = useLiveQuery(() => db.contacts.toArray(), [], undefined);

  return (
    <div className="space-y-6">
      <PageHeader title="Kontakte" subtitle="Ansprechpartner für die Übung" />

      {contacts && contacts.length === 0 ? (
        <EmptyState
          icon={<ContactIcon />}
          title="Keine Kontakte"
          description="Es sind keine Kontaktinformationen verfügbar."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(contacts ?? []).map((c) => (
            <ContactCard key={c.id} contact={c} />
          ))}
        </div>
      )}
    </div>
  );
}
