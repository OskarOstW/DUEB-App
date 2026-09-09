# DUEB App

**Digitale Übungsbeobachtung** unterstützt die Dokumentation von Krankenhaus- und Katastrophenschutzübungen, insbesondere beim Massenanfall von Verletzten (MANV). Die Anwendung verwaltet genau eine aktive Übung.

Beobachter erfassen freigegebene Beobachtungsformulare und Patientenbegleitbögen für simulierte Patienten. Formulare unterstützen Auswahlfragen, Skalen, Freitext und freigegebene Bildfragen. Patientenbegleitbögen enthalten Sichtung, Diagnostik, Therapie, OP-Team und Verlauf mit Zeitangaben und Notizen; Fotos gehören zu den Formularen.

Die Administration unter `/admin/` verwaltet Übung, Organisationen, Patientenprofile einschließlich XLSX-Import, Formulare und Beobachterkonten. Sie kann Zugangsdaten per SMTP versenden und eingegangene Antworten schreibgeschützt einsehen. Korrekturen erfolgen durch das betreffende Beobachterkonto mit Versionsprüfung. Beobachter sehen ihre eigenen Antworten und zugewiesenen Formulare. Patientenprofile und daraus erzeugte Übersichten benötigen eine gesonderte Berechtigung.

## Nutzung und Offline-Betrieb

1. Online anmelden und **Übungsdaten laden**.
2. Während der Übung erfassen, auch ohne Verbindung. Eingaben werden automatisch lokal gespeichert.
3. Mit **Alle Daten senden** die Formular- und Patientenbogen-Antworten des angemeldeten Kontos übertragen. **Meine Daten laden** lädt gesendete Antworten zur Nachbearbeitung.

Offline-Nutzung setzt eine noch gültige Anmeldung voraus. Nach Ablauf der Sitzung ist eine erneute Online-Anmeldung nötig. Browserdaten erst löschen, wenn ausstehende Eingaben übertragen oder gesichert sind. Die PWA-Installation allein lädt keine Übungsdaten.

Entwürfe behalten ihre Übungskennung und eine Kopie der Vorlage. Ändert sich die Übung oder Vorlage, werden alte Antworten nicht automatisch neu zugeordnet. Unter **Alle Daten senden** können sie einschließlich aller Fotos exportiert und für eine neue Übung lokal archiviert werden. Ein Archiv bleibt im Export enthalten. Altbestände ohne sichere Übungszuordnung benötigen eine manuelle Übernahme.

## Technologie und Architektur

- **Frontend:** React, TypeScript und Vite als installierbare PWA, Tailwind und shadcn/ui. Der Service Worker speichert die Anwendungshülle; API, Verwaltung und Medien sind vom Cache ausgenommen.
- **Lokale Speicherung:** Dexie/IndexedDB hält Übungsdaten, Antworten und Bilder getrennt nach Server, Rolle und unveränderlicher Kontokennung. Ein gemeinsamer Speichermechanismus sichert ausstehende Eingaben vor Versand und Navigation. Die ausdrücklich ausgelöste Synchronisierung überträgt einzeln bestätigte Formulare und Patientenbögen. Wiederholte Sendungen werden anhand einer Vorgangskennung erkannt; Versionskonflikte erhalten die lokalen Daten.
- **Backend:** Django und Django REST Framework mit API unter `/api/`, befristeten Tokens und serverseitiger Rechteprüfung. Medien werden nach Zugriffsprüfung ausgeliefert.
- **Betrieb:** PostgreSQL und ein separates Medien-Volume. Docker Compose startet die Dienste samt Mail-Worker; Caddy liefert die PWA aus und leitet Backend-Anfragen an Gunicorn/Django weiter. PWA und API verwenden dieselbe HTTPS-Domain. Datenbank, Backend, Proxy und Worker besitzen Healthchecks.

Der Code liegt in `frontend/` und `backend/`. `compose.yml` dient der lokalen Entwicklung, `docker-compose.prod.yml` dem Produktionsbetrieb.

## Betrieb und Lizenz

[Deployment-Anleitung](DEPLOYMENT.md) · [Sicherheit und Offline-Daten](SECURITY.md)

Copyright © 2026 Oskar Wiesatzki. Eigener Projektcode: **EUPL-1.2**, siehe [LICENSE](LICENSE). [Drittanbieter-Lizenzen und Herkunftshinweise](THIRD_PARTY_NOTICES.md) bleiben für fremde Bestandteile maßgeblich.
