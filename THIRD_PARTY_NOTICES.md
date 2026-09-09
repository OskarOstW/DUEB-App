# Drittanbieter und Lizenzen

Der eigene Projektcode steht unter [EUPL-1.2](LICENSE), Copyright © 2026 Oskar Wiesatzki. Eingebundene Drittanbieter-Bestandteile behalten ihre jeweiligen Lizenzen.

Die vollständigen Copyright- und Lizenzhinweise sind hier enthalten:

- **Frontend:** [Lizenztexte](frontend/public/third-party-notices.txt), unter anderem für React, angepasste shadcn/ui-Komponenten, Lucide und Inter. Im Betrieb unter `/third-party-notices.txt` verfügbar.
- **Python-Pakete:** [Lizenztexte](docs/licenses/python.txt).
- **Frühere MIT-Veröffentlichungen:** [Bisheriger Lizenzhinweis](docs/licenses/previous-MIT.txt); ihre Lizenz bleibt bestehen.

Der Caddy-Build übernimmt die gefundenen Lizenz- und NOTICE-Dateien seiner Go-Abhängigkeiten nach `/usr/share/licenses/caddy/third-party.txt` im Image. Bei Weitergabe von Container-Images auch die Lizenzdateien und gegebenenfalls erforderlichen Quellcodeangebote ihrer Basis- und Systempakete erhalten.

Paketstände stehen in [package-lock.json](frontend/package-lock.json), [requirements.txt](backend/requirements.txt) sowie [go.mod](frontend/caddy/go.mod) und [go.sum](frontend/caddy/go.sum). Bei Änderungen an Abhängigkeiten die Lizenzhinweise entsprechend aktualisieren.
