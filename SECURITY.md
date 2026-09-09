# Sicherheit

Sicherheitslücken vertraulich beim Projektinhaber oder Betreiber melden. Betroffene Version, reproduzierbare Schritte mit synthetischen Daten und mögliche Auswirkungen angeben. Keine Passwörter, Tokens oder Patientendaten in öffentlichen Issues veröffentlichen.

## Wichtige Betriebsgrenzen

- Produktion nur mit HTTPS, ausgeschaltetem Debug-Modus und eigenen Zugangsschlüsseln betreiben. Abhängigkeiten regelmäßig aktualisieren; Backend und Datenbank nicht öffentlich freigeben.
- Beobachter erhalten freigegebene Formulare und eigene Antworten; Patientenprofile benötigen eine gesonderte Berechtigung. Die PWA-Adminrolle und die Admin-API erfordern einen aktiven Django-Superuser. Eingeschränkte Mitarbeiter arbeiten in `/admin/` mit ihren Django-Modellberechtigungen; diese gelten auch beim Medienabruf.
- Offline gespeicherte Daten können nicht aus der Ferne gelöscht werden. IndexedDB und lokale Exporte sind nicht zusätzlich durch die Anwendung verschlüsselt. Geräte schützen und ihre Weitergabe regeln.
- Abmelden löscht keine Entwürfe. Browserdaten erst nach Übertragung oder Sicherung löschen. Passwortänderungen widerrufen Tokens; offline wird der Widerruf erst bei erneuter Verbindung wirksam.
- Datenbank und Medien gemeinsam sichern. Beim Ersetzen einer Antwort werden deren alte Bilddateien erst nach erfolgreichem Commit entfernt. Verwaiste Dateien nach Abstürzen und Aufbewahrungsfristen separat behandeln.

- Alle Anmeldewege begrenzen Versuche über gemeinsame Datenbankzähler auf 10 pro Konto und Kalenderminute sowie 300 pro Quelle und Minute. Caddy ersetzt den Quell-IP-Header; das Backend darf nicht direkt aus nicht vertrauenswürdigen Netzen erreichbar sein. Vorgeschaltete Proxys gesondert konfigurieren.
- Admin-Tokens sind an den Passwortzustand gebunden. Die Umstellung verlangt eine erneute Admin-Anmeldung. Alte Offline-Daten ohne unveränderliche Konto-/Übungszuordnung werden nicht automatisch in aktuelle Antworten übernommen.

Installation, Sicherung und Wiederherstellung: [DEPLOYMENT.md](DEPLOYMENT.md).
