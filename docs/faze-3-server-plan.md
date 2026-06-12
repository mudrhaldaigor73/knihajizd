# Fáze 3 — Serverová verze (plán)

> Stav: **neimplementováno, jen plán** (sepsáno 2026-06-12 po dokončení fáze 2).
> Předpoklad: VPS Hostinger + doména `mojeknihajizd.com` přes Cloudflare.
> Fáze 3 začne dávat smysl, až bude potřeba: stejná data na více zařízeních,
> 2–3 uživatelé s účty, nebo auditní stopa změn.

## 1. Cílová architektura

```
Prohlížeč (stávající React frontend)
   │  HTTPS přes Cloudflare proxy (oranžový mráček)
   ▼
Caddy (reverzní proxy, TLS, na VPS)
   ▼
Node.js API — Fastify (jeden kontejner s frontendem)
   ▼
SQLite (better-sqlite3 + Drizzle ORM), jeden soubor na disku VPS
```

Rozhodnutí a proč:

| Volba | Důvod |
|---|---|
| **SQLite, ne PostgreSQL** | 2–3 uživatelé, tisíce jízd ročně. Záloha = kopie souboru, žádný další kontejner ani údržba. better-sqlite3 výkonem bohatě stačí. |
| **Fastify** | Rychlé, TypeScript-friendly, vestavěná validace schémat (JSON Schema), snadný rate-limit plugin. |
| **Drizzle ORM** | Typovaná schémata sdílená s frontendem, migrace ve verzovaných SQL souborech. |
| **Caddy, ne Nginx** | Konfigurace ~4 řádky, automatická TLS. S Cloudflare Origin Certificate odpadá i obnova certifikátů. |
| **Jeden kontejner (API servíruje i statický frontend)** | Méně pohyblivých dílů; frontend build se kopíruje do image. |

Alternativa zvážená a odložená: **Cloudflare Workers + D1** (bez VPS, free tier).
Výhoda: žádný server k údržbě. Nevýhoda: jiný runtime (žádný Node fs/better-sqlite3),
přepis backendu na Workers API. Pokud by VPS vadilo cenou/údržbou, je to plán B.

## 2. Struktura repozitáře (nové soubory)

```
server/
  src/
    index.ts           # Fastify bootstrap, statický frontend, error handler
    db/
      schema.ts        # Drizzle schéma (viz kap. 3)
      migrate.ts       # spouštění migrací při startu
      migrations/      # verzované SQL migrace
    auth/
      session.ts       # vytvoření/ověření session cookie
      password.ts      # Argon2id hash + verify
    routes/
      auth.ts          # POST /api/login, POST /api/logout, GET /api/me
      trips.ts         # CRUD /api/trips (+ filtry ?from&to&vehicleId&driverId)
      vehicles.ts      # CRUD /api/vehicles
      drivers.ts       # CRUD /api/drivers
      places.ts        # CRUD /api/places
      fuels.ts         # CRUD /api/fuels
      users.ts         # admin: správa účtů
      audit.ts         # admin: GET /api/audit
      export.ts        # GET /api/export.xlsx, /api/export.csv (sdílený exportWorkbook!)
      backup.ts        # admin: GET /api/backup (stáhne JSON), POST /api/restore
    audit.ts           # zápis do audit_log (hook po každé mutaci)
  Dockerfile
  drizzle.config.ts
docker-compose.yml      # služby: app, caddy
Caddyfile
.github/workflows/deploy.yml   # volitelné: SSH deploy po push na main
src/renderer/src/lib/apiProvider.ts   # nová implementace LogbookApi
```

Klíčový princip: **frontend se skoro nemění.** Rozhraní `LogbookApi`
v `src/renderer/src/lib/logbookApi.ts` už existuje — přibude třetí
implementace `ApiProvider` (REST klient) vedle Electron a browser variant.
`getLogbookApi()` ji zvolí podle build flagu (`VITE_API_MODE=server`).
Sdílené moduly (`exportWorkbook`, `summaries`, `parseLogbook`, `types`)
se použijí na serveru beze změny.

## 3. Databázové schéma (Drizzle/SQL)

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,             -- UUID
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,                -- Argon2id
  role          TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
  disabled      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,                -- náhodných 32+ bajtů
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE vehicles (
  id               TEXT PRIMARY KEY,
  spz              TEXT NOT NULL,
  brand            TEXT NOT NULL,
  model            TEXT,
  year             INTEGER,
  fuel             TEXT,
  initial_odometer REAL NOT NULL DEFAULT 0,
  note             TEXT,
  archived         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE drivers (
  id      TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),          -- volitelná vazba řidič ↔ účet
  name    TEXT NOT NULL,
  note    TEXT
);

CREATE TABLE places (
  id   TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  note TEXT
);

CREATE TABLE trips (
  id             TEXT PRIMARY KEY,
  date           TEXT NOT NULL,               -- YYYY-MM-DD
  departure_time TEXT NOT NULL,               -- HH:MM
  arrival_time   TEXT NOT NULL,               -- příjezd < odjezd = přes půlnoc
  vehicle_id     TEXT NOT NULL REFERENCES vehicles(id),
  driver_id      TEXT REFERENCES drivers(id),
  from_place     TEXT NOT NULL,
  to_place       TEXT NOT NULL,
  purpose        TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'služební',
  odometer_start REAL NOT NULL,
  odometer_end   REAL NOT NULL,
  note           TEXT,
  created_by     TEXT REFERENCES users(id),
  updated_at     TEXT NOT NULL,
  deleted        INTEGER NOT NULL DEFAULT 0,  -- soft delete (audit)
  CHECK (odometer_end > odometer_start)
);
CREATE INDEX idx_trips_vehicle_date ON trips(vehicle_id, date);
CREATE INDEX idx_trips_date ON trips(date);

CREATE TABLE fuel_records (
  id              TEXT PRIMARY KEY,
  date            TEXT NOT NULL,
  vehicle_id      TEXT NOT NULL REFERENCES vehicles(id),
  station         TEXT,
  liters          REAL NOT NULL DEFAULT 0,
  price_per_liter REAL NOT NULL DEFAULT 0,
  total_price     REAL NOT NULL DEFAULT 0,
  odometer        REAL,
  note            TEXT,
  created_by      TEXT REFERENCES users(id),
  deleted         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id),
  action     TEXT NOT NULL,                   -- 'create' | 'update' | 'delete'
  entity     TEXT NOT NULL,                   -- 'trip' | 'vehicle' | ...
  entity_id  TEXT NOT NULL,
  old_value  TEXT,                            -- JSON snapshot před změnou
  new_value  TEXT,                            -- JSON snapshot po změně
  created_at TEXT NOT NULL
);

CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,                     -- highKmPerDayThreshold, ...
  value TEXT NOT NULL
);
```

Změny proti dnešnímu JSON modelu:
- `trips.driver` (volný text) → `trips.driver_id` (FK). Při migraci se jména
  spárují/založí v `drivers`.
- mazání jízd a tankování = **soft delete** + záznam v `audit_log`.
- `version`/`settings` z JSON se rozpadnou do `app_settings`.

## 4. API (REST, JSON)

- `POST /api/login` `{email, password}` → session cookie (`HttpOnly; Secure; SameSite=Lax`, 30 dní). Rate-limit 5/min/IP.
- `POST /api/logout`, `GET /api/me`
- `GET/POST /api/trips`, `PUT/DELETE /api/trips/:id`
  - GET filtry: `?from=&to=&vehicleId=&driverId=&type=&q=`
  - validace vstupu: JSON Schema (stejná pravidla jako `validateTrip` — sdílet konstanty)
- analogicky `vehicles`, `drivers`, `places`, `fuels`
- `GET /api/export.xlsx|csv` — generuje **stávající** `src/shared/exportWorkbook.ts`
- `GET /api/backup` (admin) — kompletní JSON ve formátu `parseLogbookData`
  → import/export zůstává kompatibilní s desktop verzí!
- `POST /api/restore` (admin) — nahraje JSON zálohu (projde `parseLogbookData`)
- `GET /api/audit?entity=&entityId=` (admin)
- `GET/POST/PUT /api/users` (admin) — bez samoobslužné registrace

Oprávnění:
- **user**: čte vše, vytváří jízdy/tankování; edituje a maže jen záznamy,
  kde `created_by = on` (nebo je řidičem)
- **admin**: vše + správa uživatelů, vozidel, obnova záloh, audit

## 5. Migrace stávajících dat

1. V aplikaci: Export → stáhnout JSON (formát už validuje `parseLogbookData`).
2. Skript `server/src/scripts/import-json.ts`:
   - načte JSON, projde `parseLogbookData`,
   - založí výchozího admina (e-mail + heslo z parametrů),
   - jména řidičů z jízd napáruje na `drivers` (založí chybějící),
   - vloží vozidla → řidiče → místa → jízdy → tankování v transakci.
3. Ověření: počty záznamů + `GET /api/export.xlsx` se musí shodovat se
   starým exportem.

## 6. Nasazení na VPS Hostinger

### 6.1 Server (jednorázová příprava)
```bash
# Ubuntu 24.04 LTS, plán KVM 1 (2 vCPU / 4 GB) stačí s rezervou
adduser deploy && usermod -aG sudo,docker deploy
# SSH: jen klíče, zakázat root login a heslo (/etc/ssh/sshd_config)
apt install -y docker.io docker-compose-v2 ufw fail2ban unattended-upgrades
ufw default deny incoming
ufw allow 22/tcp          # ideálně jen z vlastní IP
# 443 povolit pouze z Cloudflare IP rozsahů (https://www.cloudflare.com/ips/)
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do ufw allow from $ip to any port 443 proto tcp; done
ufw enable
```

### 6.2 docker-compose.yml (náčrt)
```yaml
services:
  app:
    build: ./server
    restart: unless-stopped
    volumes:
      - ./data:/data            # /data/kniha.sqlite
    environment:
      - DATABASE_PATH=/data/kniha.sqlite
      - SESSION_SECRET=${SESSION_SECRET}
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./certs:/certs          # Cloudflare Origin Certificate
```

### 6.3 Caddyfile
```
mojeknihajizd.com {
    tls /certs/origin.pem /certs/origin-key.pem
    reverse_proxy app:3000
}
```

### 6.4 Cloudflare
1. DNS A záznam `mojeknihajizd.com` → IP VPS, **proxy zapnutá**.
2. SSL/TLS → **Full (strict)**.
3. Origin Server → Create Certificate (platnost 15 let) → uložit do `certs/`.
4. WAF zapnout, Bot Fight Mode zapnout.
5. **Cloudflare Access** (Zero Trust, zdarma do 50 uživatelů): policy
   na celou doménu, povolené e-maily 2–3 uživatelů, ověření e-mail OTP.
   = druhá vrstva přihlášení ještě před aplikací.
6. Stávající Workers/Assets deploy (čistě statická verze) může zůstat na
   jiné subdoméně, např. `offline.mojeknihajizd.com`, jako záložní režim.

### 6.5 Zálohy
- Cron na VPS (denně 03:00):
  ```bash
  sqlite3 /srv/knihajizd/data/kniha.sqlite ".backup /srv/backups/kniha-$(date +%F).sqlite" \
    && gzip /srv/backups/kniha-$(date +%F).sqlite \
    && rclone copy /srv/backups/ r2:knihajizd-zalohy/   # Cloudflare R2, free tier 10 GB
  ```
- Retence: 30 denních + 12 měsíčních (skript promaže zbytek).
- **Test obnovy provést hned po zprovoznění** (stáhnout zálohu, nahradit
  soubor, restart kontejneru) a postup zapsat do README.

### 6.6 Deploy
- Začátek: ručně `git pull && docker compose up -d --build`.
- Později GitHub Actions: na push do `main` → SSH na VPS → tentýž příkaz.

## 7. Bezpečnostní checklist

- [ ] Argon2id na hesla (`@node-rs/argon2`), žádné vlastní krypto
- [ ] Session cookie `HttpOnly; Secure; SameSite=Lax`, rotace při loginu
- [ ] Rate-limit na /api/login (5/min) — `@fastify/rate-limit`
- [ ] Validace všech vstupů (Fastify JSON Schema), žádný raw SQL string
- [ ] Hlavičky: CSP, X-Content-Type-Options, Referrer-Policy — `@fastify/helmet`
- [ ] Port 443 jen z Cloudflare IP, SSH jen klíčem, fail2ban, unattended-upgrades
- [ ] Cloudflare Access před aplikací
- [ ] Smazat klientské heslo z `auth.ts` (nahradí ho skutečný login)
- [ ] Zálohy šifrovaně mimo VPS + otestovaná obnova

## 8. Postup implementace (odhad ~3–5 dní)

1. **Server skeleton** (½ dne): Fastify + Drizzle + migrace + healthcheck,
   servírování frontendu, Dockerfile.
2. **Auth** (½ dne): users/sessions, login/logout/me, seed admin účtu,
   rate-limit, helmet.
3. **CRUD + audit** (1 den): trips/vehicles/drivers/places/fuels,
   soft delete, audit_log hook, oprávnění user/admin.
4. **ApiProvider ve frontendu** (½–1 den): implementace `LogbookApi` nad
   REST API, login obrazovka proti API, build flag `VITE_API_MODE`.
5. **Export/backup endpointy + import skript** (½ dne): sdílený
   exportWorkbook na serveru, /api/backup, /api/restore, migrace JSON.
6. **Nasazení** (½–1 den): VPS setup dle kap. 6, Cloudflare DNS/TLS/Access,
   zálohovací cron, test obnovy.
7. **Fáze 4 navazuje**: UI správy uživatelů, obrazovka auditu, obnova
   záloh z UI.

## 9. Na co nezapomenout / rizika

- **Konflikt souběžných editací**: pro 2–3 uživatele stačí „last write wins"
  + `updated_at` kontrola (při PUT poslat původní `updated_at`; nesouhlasí-li,
  vrátit 409 a nechat uživatele rozhodnout).
- **Desktop verze po fázi 3**: zůstává funkční offline; export/import JSON
  je oboustranně kompatibilní díky `parseLogbookData`. Plnohodnotná
  synchronizace desktop ↔ server je samostatná (odložená) kapitola.
- **localStorage verze**: po přechodu na server nabídnout jednorázový
  import dat z prohlížeče (tlačítko „Nahrát data z tohoto prohlížeče na server").
- Hostinger VPS má vlastní firewall v panelu — nastavit konzistentně s UFW.
