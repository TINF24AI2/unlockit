# UnlockIT

Dieses Projekt wurde im Rahmen des Moduls **Software Engineering** an der **DHBW Mannheim** bearbeitet. Hierbei handelt es sich um ein MVP für ein Self-Service-Portal für Lizenzanfragen und -verwaltung.

## Funktionen
### Nutzerverwaltung (Admin)
- Nutzer anlegen
- automatischer Versand einer Einladung-Mail
- Nutzer deaktivieren und löschen
- Rollenverwaltung (Admin, User)

### Produkt- und Lizenzverwaltung (Admin)
- Anlegen von Produkten und entsprechenden Lizenzschlüssel
- Anlegen von Einzel- und Volumenlizenzen
- Automatische Vergabe von Lizenzen
- Deaktivierung von Lizenzen
- Deaktivieren und Löschen von Produkten

### Bearbeitung Lizenzanfragen (Admin)
- Übersicht aller offenen Lizenzanfragen
- Genehmigen und Ablehnen von Lizenzanfragen

### Audit
- Admin: Export von Aktivitäten von allen Lizenzanfragen
- User: Übersicht über alle Aktivitäten eigener Lizenzanfragen

### Lizenzen beantragen
- Verfügbare Lizenzen anfragen
- eine Lizenz pro Produkt möglich

### Historie
- aktuellen Status und Informationen eigener Lizenzanfragen abrufen

### sonstiges
- Passwort zurücksetzen, automatischer Versand einer E-Mail
- Responsives, intuitives, einheitliches Design

## Sicherheitsaspekte
- Einladungslink/Link für Passwort zurücksetzen läuft nach 24h ab
- Middleware für angemeldete Nutzer und Administratoren
- Gehashte Passwörter


## Verwendte Technologien

| Technologie       | Beschreibung                                              |
| ----------------- | --------------------------------------------------------- |
| Nuxt              | Framework für serverseitig gerenderte Vue-Anwendungen                         |
| Prisma            | ORM für Datenbankzugriff, Migration und Schema                  |
| PostgreSQL        | relationales Datenbanksystem mit ACID-Unterstützung       |
| NuxtUI            | Komponentenbibliothek/Designsystem für UI-Entwicklung in Nuxt-Projekten                          |

## Projekt-Struktur

```
unlockit/
├─ compose.yaml
├─ eslint.config.mjs
├─ example.env
├─ LICENSE
├─ README.md
├─ nuxt.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ prisma.config.ts
├─ tsconfig.json
├─ app/
│ ├─ app.config.ts
│ ├─ app.vue
│ ├─ assets/
│ │ └─ css/
│ ├─ components/
│ ├─ middleware/
│ │ ├─ authenticated.ts
│ │ └─ is-Admin.ts
│ ├─ pages/
│ │ ├─ form.vue
│ │ ├─ index.vue
│ │ ├─ login.vue
│ │ ├─ request_reset.vue
│ │ ├─ set-password.vue
│ │ ├─ admin/
│ │ └─ user/
│ └─ plugins/
│   └─ authorization-resolver.ts
├─ generated/
│ └─ prisma/
│ ├─ browser.ts
│ ├─ client.ts
│ ├─ commonInputTypes.ts
│ ├─ enums.ts
│ ├─ models.ts
│ └─ internal/
├─ open_collection/
│ ├─ opencollection.yml
│ ├─ Set Setting.yml
│ ├─ Assignments/
│ ├─ Auth/
│ ├─ environments/
│ ├─ Licenses/
│ ├─ Products/
│ └─ Users/
├─ prisma/
│ ├─ schema.prisma
│ ├─ seed.ts
│ └─ migrations/
│ ├─ migration_lock.toml
│ ├─ 20260416145508_add_settings/
│ ├─ 20260428132125_add_products_and_licenses/
│ ├─ 20260428160631_add_users/
│ ├─ 20260504200126_add_needs_password_reset_to_user/
│ └─ 20260514083233_add_assignment_history/
├─ public/
├─ scripts/
│ ├─ install_hooks.ps1
│ ├─ install_hooks.sh
│ ├─ install_weak_hooks.ps1
│ └─ pre-commit.sh
├─ server/
│ ├─ api/
│ ├─ plugins/
│ ├─ services/
│ └─ utils/
├─ shared/
  ├─ types/
  └─ utils/

```

## Link
se-ssp.tix4u.de

## Anmerkung
Hierbei handelt es sich um ein MVP. Dementsprechend könnten in der Zukunft weitere Funktionen implementiert werden.

## Lizenz
Dieses Projekt wurde als Leistungsnachweis an der DHBW Mannheim eingereicht.
