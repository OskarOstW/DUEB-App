# Deployment

## Einrichtung

Benötigt werden Docker Engine mit Compose v2, eine Domain, DNS, SMTP und geschützter Sicherungsspeicher. Repository klonen, `.env.example` nach `.env` kopieren, unabhängige Zufallswerte für `SECRET_KEY` und `DB_PASSWORD` einsetzen und `chmod 600 .env` setzen.

Alle folgenden Befehle sind für Bash auf Linux gedacht und werden im Repository-Stamm ausgeführt:

```sh
git clone https://github.com/OskarOstW/DUEB-App.git
cd DUEB-App
cp .env.example .env
chmod 600 .env
```

Zufallswerte etwa mit `openssl rand -hex 32` erzeugen, für jeden Schlüssel getrennt. Keine Beispielwerte übernehmen. Node.js ist auf dem Produktionshost nicht erforderlich; der Frontend-Build erfolgt im Container.

Für Produktion `DEBUG=False`, `DOMAIN=app.example.org`, `ALLOWED_HOSTS=app.example.org`, `SITE_URL=https://app.example.org`, `CSRF_TRUSTED_ORIGINS=https://app.example.org` und `SECURE_SSL_REDIRECT=True` konfigurieren. Bei gemeinsamer Domain bleibt `CORS_ALLOWED_ORIGINS` leer. SMTP über die `EMAIL_*`-Felder und ein zugelassenes `DEFAULT_FROM_EMAIL` einrichten.

```sh
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
docker compose -f docker-compose.prod.yml exec backend python manage.py check --deploy
```

Caddy veröffentlicht ausschließlich 80/443. Öffentlich auflösbare Domains erhalten automatisch HTTPS-Zertifikate. Die optionale Kontaktadresse im globalen Caddyfile-Block eintragen. Für eigene Zertifikate die dort dokumentierte `tls`-Zeile aktivieren und Zertifikate geschützt unter `certs/` bereitstellen. `localhost` verwendet eine interne CA, die auf Endgeräten nicht automatisch vertrauenswürdig ist. HSTS nach Prüfung eines vertrauenswürdigen Zertifikats mit `SECURE_HSTS_SECONDS=31536000` aktivieren. Subdomain- und Preload-Freigaben gesondert bewerten; bei lokaler Test-CA zunächst HSTS 0 lassen.

Backend und Datenbank nicht öffentlich freigeben. Django vertraut dem HTTPS-Proxyheader hinter Caddy. Weitere vorgeschaltete Proxys erfordern eine eigene Prüfung der Header und Login-Begrenzung.

Die PWA ist anschließend unter `https://app.example.org` erreichbar, die Verwaltung unter `https://app.example.org/admin/`. Beim PWA-Login unter `/login` dieselbe HTTPS-Basisadresse als Server verwenden.

## Erste Einrichtung

In der Verwaltung genau eine Übung, Organisationen, Formulare und Beobachter anlegen. Formulare den Beobachtern ausdrücklich freigeben; die Berechtigung für Patientenprofile gesondert setzen. Patientenprofile können per XLSX importiert und der Übung zugeordnet werden. Kontakte und Galerie nach Bedarf ergänzen.

Generierte Patientenübersichten benötigen ebenfalls die Patientenprofil-Berechtigung. Bei selbst hochgeladenen Galerie-Bildern mit Profilinformationen „Nur mit Patientenprofil-Berechtigung sichtbar“ aktivieren. Die Migration kennzeichnet vorhandene generierte Übersichten anhand des bisherigen Dateinamens oder Beschreibungstexts; umbenannte Altbestände manuell prüfen. Bereits offline geladene Daten lassen sich durch einen Rechteentzug nicht vom Gerät zurückrufen.

Vor der ersten Offline-Nutzung online anmelden und **Übungsdaten laden**. Die PWA-Installation allein lädt keine Übungsdaten. Antworten werden über **Alle Daten senden** übertragen und mit **Meine Daten laden** zur Nachbearbeitung zurückgeholt. Browserdaten erst nach Übertragung oder Sicherung ausstehender Eingaben löschen.

## E-Mail-Versand einrichten

Die Verwaltung speichert Versandaufträge in PostgreSQL. Der Dienst `mail-worker` verarbeitet sie über den SMTP-Dienst des Betreibers; der Webrequest wartet nicht auf die Zustellung.

| Einstellung in `.env` | Bedeutung |
| --- | --- |
| `EMAIL_HOST` | SMTP-Server des Betreibers |
| `EMAIL_PORT` | Port laut Betreiber, für STARTTLS üblicherweise 587 |
| `EMAIL_USE_TLS` | `True` für STARTTLS |
| `EMAIL_HOST_USER` und `EMAIL_HOST_PASSWORD` | Geschützter SMTP-Zugang; bei einem ausdrücklich freigegebenen Relay gegebenenfalls leer |
| `DEFAULT_FROM_EMAIL` | Vom Maildienst zugelassener Absender |
| `SITE_URL` | Öffentliche HTTPS-Adresse der PWA für Einladungslinks |

Die bereitgestellte Konfiguration unterstützt STARTTLS; implizites TLS auf Port 465 ist damit nicht konfiguriert. Verschlüsselungs- und Relay-Vorgaben mit dem Betreiber abgleichen. Den Maildienstadministrator die Freigabe des Absenders und die erforderlichen DNS-Einstellungen prüfen lassen.

Nach Änderungen `docker compose -f docker-compose.prod.yml up -d backend mail-worker` ausführen. Zuerst einen eigens angelegten Testbeobachter auswählen und eine Nachricht über die Verwaltung senden. Tatsächlichen Empfang, Absender, Link und Anmeldung prüfen. Der aktuelle Beobachterversand ersetzt bei SMTP-Annahme das Passwort des Empfängers; dafür keinen produktiv verwendeten Beobachter als Testkonto einsetzen.

## Betrieb

Status: `docker compose -f docker-compose.prod.yml ps`. Logs: `docker compose -f docker-compose.prod.yml logs --tail 100 backend caddy mail-worker`. Neustart: `docker compose -f docker-compose.prod.yml restart`. Speicherplatz, Erreichbarkeit, Zertifikate und Backups überwachen. Keine Volume-Löschung zur Fehlerbehebung. Logs nicht ungeprüft veröffentlichen.

E-Mail-Vorlage und Empfänger werden in der Verwaltung gepflegt. SMTP-Annahme setzt pro Empfänger ein neues Passwort und widerruft sein Token. Bei einem erkannten SMTP-Fehler bleibt das bisherige Passwort erhalten. SMTP-Annahme bestätigt keine Zustellung; bei unklaren Abbrüchen den Empfang vor einem erneuten Versand kontrollieren.

Der Anmeldelink verwendet `SITE_URL` plus `/login`. Derselbe Versandauftrag wird nicht doppelt verarbeitet; erneutes Öffnen der Versandseite erzeugt einen neuen Auftrag. SMTP-Annahme und Datenbankänderung sind nicht gemeinsam atomar. Der Status jedes Empfängers steht unter **E-Mail-Versandaufträge**. Nach einem Abbruch während der Zustellung wird der Auftrag als unklar markiert und nicht automatisch erneut gesendet. Erst Empfang und Anmeldung klären, dann bei Bedarf einen neuen Auftrag erstellen. Einen Worker betreiben; er verarbeitet die Empfänger nacheinander.

## Sicherung

Bash-Befehle im Repository ausführen. Ein neues, geschütztes Zielverzeichnis außerhalb des Repositorys unter `backup_dir` setzen. Ausreichend freien Speicher prüfen. Während der Sicherung ist die Anwendung kurz nicht verfügbar. Jeden Exitcode kontrollieren; bei Fehlern das Backend wieder starten und die Sicherung als unvollständig behandeln.

```sh
umask 077
backup_dir="/srv/dueb-backups/backup-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p /srv/dueb-backups
mkdir "$backup_dir"
docker compose -f docker-compose.prod.yml stop backend mail-worker
docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_dir/database.dump"
docker compose -f docker-compose.prod.yml run --rm --no-deps -T --entrypoint tar backend czf - -C /app/media . > "$backup_dir/media.tar.gz"
cp .env "$backup_dir/config.env"
git rev-parse HEAD > "$backup_dir/commit.txt"
docker compose -f docker-compose.prod.yml start backend mail-worker
sha256sum "$backup_dir/database.dump" "$backup_dir/media.tar.gz" > "$backup_dir/SHA256SUMS"
```

Datenbank, Medien, Konfiguration und Commit gemeinsam geschützt und zusätzlich außer Haus aufbewahren. Regelmäßig tatsächlich wiederherstellen und Tabellenzahlen sowie Medienprüfsummen vergleichen. RPO, RTO und Aufbewahrung legt der Betreiber fest.

## Wiederherstellung

Prüfsummen kontrollieren. Den gesicherten Commit in einer getrennten Arbeitskopie auschecken, dort die gesicherte Konfiguration geschützt als `.env` bereitstellen. Das folgende Projekt `dueb-recovery` muss neue, leere Volumes erhalten. Kein vorhandenes Projekt gleichen Namens wiederverwenden. `backup_dir` muss auf die geprüfte Sicherung verweisen.

```sh
docker compose -p dueb-recovery -f docker-compose.prod.yml up -d db
docker compose -p dueb-recovery -f docker-compose.prod.yml ps
```

Erst fortfahren, wenn die Datenbank healthy ist:

```sh
docker compose -p dueb-recovery -f docker-compose.prod.yml exec -T db sh -c 'pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$backup_dir/database.dump"
docker compose -p dueb-recovery -f docker-compose.prod.yml run --rm --no-deps -T --entrypoint tar backend xzf - -C /app/media < "$backup_dir/media.tar.gz"
docker compose -p dueb-recovery -f docker-compose.prod.yml up -d backend
```

Für parallele Caddy-Tests andere Hostports oder einen getrennten Testhost verwenden. Vor Umschaltung Anmeldung, Rollen, Antworten, Bilder und Datensatzzahlen kontrollieren. Eine laufende Datenbank nicht als Standardverfahren überschreiben.

## Update und Rückkehr

Vor jedem Update sichern und alten Commit festhalten. Backend und Mail-Worker vor Schemaänderungen stoppen. Freigegebenen Tag auschecken und `up -d --build` ausführen. Backend-Start prüft Konfiguration, migriert und sammelt Admin-Assets. Danach Anwendung und Logs kontrollieren. Offline-Geräte vor der Übung aktualisieren; ungesendete Entwürfe sichern und Browserdaten nicht löschen.

Nach inkompatiblen Migrationen reicht ein Zurücksetzen nur des Codes nicht. Zusammengehörige Datenbank, Medien und Konfiguration mit dem alten Commit getrennt wiederherstellen, prüfen und erst dann umschalten. Ursprüngliche Volumes bis zum Abschluss aufbewahren.


## Upgrade auf den versionierten Schreibvertrag

Vor der Umstellung Datenbank und Medien gemeinsam sichern. Lokale Entwürfe auf allen Geräten zuerst senden oder exportieren. Migration `0065_release_integrity` übernimmt die bisherigen fünfzehn Bildfelder in eine eigene Bildtabelle, ohne die Dateien zu verschieben. Konten und Übung erhalten UUIDs. Doppelte Antworten oder mehrere aktive Übungen lassen die Migration mit einer Diagnose abbrechen; sie werden nicht automatisch gelöscht. Die ungenutzte Tabelle `CompletedForm` entfällt. Die Datenmigration ist nicht rückwärts ausführbar; für eine Rückkehr die vollständige Sicherung verwenden.

Erneut anmelden und die Geräte online vorbereiten. Entwürfe aus älteren App-Versionen bleiben in ihren bisherigen lokalen Datenbanken erhalten. Soweit sie dem früheren Benutzernamen zugeordnet sind, erscheint auf der Startseite ein Exporthinweis. Fehlende Übungs- oder Vorlagenversionen werden nicht nachträglich geraten: Solche Bestände und alte Serverantworten ohne Versionsnachweis können eingesehen und exportiert, aber nicht automatisch erneut gesendet werden. Ihre manuelle Übernahme vor Beginn einer neuen Übung einplanen.

Antworten sind in der Admin-Oberfläche und der Katalog-API schreibgeschützt. Für Nachbearbeitung das betreffende Beobachterkonto verwenden. Die PWA-Adminanmeldung ist auf Superuser begrenzt; eingeschränkte Mitarbeiter verwenden die Django-Verwaltung mit ausdrücklich erteilten Modellberechtigungen.

## Healthchecks und Build-Basis

`/api/ready/` prüft die Datenbankverbindung. Der Backend-Healthcheck ruft diesen Endpunkt über Gunicorn auf; Caddy wartet auf ein gesundes Backend und prüft denselben Weg über einen nur containerintern erreichbaren HTTP-Port. Der Mail-Worker schreibt einen lokalen Heartbeat. Ein fehlerhafter Healthcheck allein löst bei Docker keinen Neustart aus: Status überwachen und die Ursache anhand der Logs beheben.

Basisimages sind mit SHA-256-Digests festgeschrieben. `frontend/runtime-apk.lock` und `database/runtime-apk.lock` halten die freigegebenen Alpine-Paketstände fest. Bei einem Update Digests und Paketlisten gemeinsam aktualisieren und die Images neu bauen. Fehlende Paketversionen brechen den Build ab, statt still andere Versionen zu installieren. Für langfristig reproduzierbare Releases die gebauten Images zusätzlich in einer eigenen Registry nach Digest aufbewahren.

Der eigene Caddy-Build verwendet die Standardmodule mit einer separat festgeschriebenen Go-Abhängigkeitskette (`frontend/caddy/go.mod` und `go.sum`). Er ermöglicht die Pflege von transitiven Sicherheitsaktualisierungen; Go-Toolchain und Modulversionen müssen deshalb zusammen mit den übrigen Abhängigkeiten geprüft werden. Ein neuer Basisimage-Digest allein aktualisiert diesen Caddy-Build nicht.

Jedes Formular wird separat und wiederholbar übertragen, mit höchstens 15 Bildern zu je 2 MiB. Die PWA komprimiert größere Bilder und prüft das gesamte Paket vor dem Versand. Bereits bestätigte Pakete bleiben bei einer späteren Unterbrechung gespeichert; noch nicht bestätigte oder zwischenzeitlich bearbeitete Entwürfe bleiben auf dem Gerät.
