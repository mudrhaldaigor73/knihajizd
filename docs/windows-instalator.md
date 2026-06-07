# Windows instalátor

Projekt používá `electron-builder` a cíl `nsis`.

1. Nainstalujte Node.js LTS.
2. Ve složce projektu spusťte `npm install`.
3. Spusťte `npm run dist`.
4. Hotový instalátor najdete ve složce `release`.

Výchozí konfigurace:

- název aplikace: `Kniha jízd`
- App ID: `cz.lokalni.knihajizd`
- typ instalátoru: NSIS
- uživatel si může zvolit instalační složku

Pro podepisování instalačního balíčku doplňte certifikát podle dokumentace `electron-builder`.
