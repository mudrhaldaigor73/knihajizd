# Kniha jízd

Lokální offline desktopová aplikace pro evidenci jízd vozidla. Data se ukládají do JSON souboru na počítači uživatele a exportují se do Excelu přes ExcelJS.

## Funkce

- české uživatelské rozhraní
- evidence vozidel, jízd a tankování
- lokální JSON datový soubor s volbou umístění
- načtení poslední použité knihy jízd při spuštění
- otevření existující knihy, uložení jako a ruční záloha
- automatické zálohy do složky `zalohy-knihy-jizd`
- kontroly tachometru, povinných polí, návaznosti, duplicit, vysokých denních km a překryvu časů
- dashboard se souhrny a měsíčním přehledem
- export `.xlsx` s listy Kniha jízd, Tankování, Měsíční souhrn, Roční souhrn a Vozidla
- volitelný CSV export jízd
- světlý a tmavý režim

## Spuštění ve vývoji

```bash
npm install
npm run dev
```

Aplikace je offline. Instalace závislostí vyžaduje internet pouze jednorázově při přípravě projektu.

## Webová verze

Webová verze běží bez serveru. Data se ukládají pouze v prohlížeči uživatele do `localStorage`; JSON záloha, CSV i Excel export se stahují lokálně.

```bash
npm run web:dev
```

Produkční build pro Cloudflare Pages:

```bash
npm run web:build
```

Výstupní složka:

```text
dist/renderer
```

Nastavení Cloudflare Pages:

- Framework preset: `None`
- Build command: `npm run web:build`
- Build output directory: `dist/renderer`
- Deploy command: nechat prázdné
- Custom domain: `mojeknihajizd.com`

## Sestavení aplikace

```bash
npm run build
npm start
```

## Vytvoření instalačního balíčku pro Windows

Na Windows spusťte:

```bash
npm install
npm run dist
```

Instalátor NSIS vznikne ve složce `release`. Konfigurace je v části `build` v `package.json`.

## Ukázková data

Ukázkový JSON je v souboru:

```text
sample-data/kniha-jizd-data.json
```

V aplikaci ho načtete přes `Otevřít` nebo `Export -> Importovat JSON`.

## Ukázkový Excel export

Po instalaci závislostí vytvoříte ukázkový export příkazem:

```bash
npm run export:sample
```

Soubor vznikne zde:

```text
sample-data/ukazkovy-export.xlsx
```

## Soukromí

Aplikace neposílá žádná data na server. Electron main proces pracuje pouze s lokálním souborovým systémem a všechna data zůstávají v počítači uživatele.
