# Edzés és tánc

Telefonra tehető edzés- és táncnapló. GitHub Pages-en fut, internet nélkül is megnyílik, és ha szeretnéd, minden mentést beír egy Google Táblázatba.

## 1. Feltöltés GitHubra (kb. 5 perc)

1. Lépj be a github.com-ra, jobb fent **+ → New repository**.
2. Név: például `edzes`. Legyen **Public** (az ingyenes GitHub Pages-hez ez kell; az adataid nem kerülnek bele, csak a program). **Create repository**.
3. A következő oldalon kattints az **uploading an existing file** linkre.
4. Húzd be az összes fájlt ebből a mappából (a mappa tartalmát, nem magát a mappát):
   `index.html`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `Code.gs`, `README.md`
5. Lent **Commit changes**.
6. Fent **Settings → Pages**. A *Build and deployment* résznél: Source: **Deploy from a branch**, Branch: **main**, mappa: **/ (root)** → **Save**.
7. 1–2 perc múlva ugyanitt megjelenik a címed, például:
   `https://FELHASZNALONEV.github.io/edzes/`

## 2. Kitétel a telefon kezdőképernyőjére

**iPhone (Safari):** nyisd meg a címet → alul a Megosztás gomb (négyzet felfelé nyíllal) → **Főképernyőhöz adás** → Hozzáadás.

**Android (Chrome):** nyisd meg a címet → jobb fent ⋮ → **Hozzáadás a kezdőképernyőhöz** vagy **Alkalmazás telepítése**.

Ezután mindig az ikonról nyisd meg. iPhone-on a kezdőképernyős app külön tárolja az adatait a Safaritól, ezért ne keverd a kettőt.

## 3. Google Táblázat szinkron (erősen ajánlott)

Az adatok alapból csak a telefonon vannak. Ha törlöd az ikont, vagy törlöd a böngésző adatait, elvesznek. A táblázat-szinkron ezt kivédi, és a táblázatban ugyanúgy látod az edzéseidet, mint eddig az Excelben.

1. Hozz létre egy új Google Táblázatot (például „Edzésnapló”).
2. Menü: **Bővítmények → Apps Script**.
3. Töröld ki a benne lévő kódot, és másold be a `Code.gs` fájl teljes tartalmát.
4. A 12. sorban írd át a `TOKEN` értékét egy saját titkos szóra, például `const TOKEN = 'lila-tangó-42';`. Mentés (floppy ikon).
5. Jobb fent **Telepítés → Új telepítés**. A fogaskeréknél válaszd: **Webes alkalmazás**.
   - Végrehajtás mint: **Én**
   - Hozzáférés: **Bárki**
   - **Telepítés** → engedélyezd a hozzáférést a fiókodhoz. Ha a Google figyelmeztet, hogy az app nincs ellenőrizve: Speciális → Ugrás a projektre.
6. Másold ki a **Webes alkalmazás URL**-t (`https://script.google.com/macros/s/…/exec`).
7. Az appban lent: **Adatok és szinkron** → illeszd be az URL-t és a titkos szót → **Összekötés**.

A jobb felső sarokban ezután a „Szinkronizálva a táblázattal” felirat látszik. Az első összekötéskor a telefonon lévő adatok feltöltődnek a táblázatba. A táblázatban három lap jön létre:
- **Edzés**: dátum, gyakorlat, széria, ismétlés, súly, volumen, kész, RIR
- **Tánc**: dátum, típus, óra típusa, időtartam, intenzitás, hely
- **_adatok**: ebből dolgozik az app, ezt ne szerkeszd kézzel

Az Edzés és a Tánc lap minden mentéskor újragenerálódik, ezért az ott végzett kézi módosítás elveszik. Szerkeszteni az appban tudsz.

Ha internet nélkül mentesz, az app megjegyzi a változásokat, és a következő alkalommal, amikor van net, feltölti őket.

## Frissítés

Ha később új `index.html`-t kapsz, töltsd fel ugyanígy (Add file → Upload files), és írd felül a régit. A `sw.js`-ben emeld meg a verziót (`edzes-tanc-v1` → `edzes-tanc-v2`), hogy a telefon biztosan az újat töltse be. Az adataidat ez nem érinti.

## Biztonsági mentés

Az **Adatok és szinkron** részben a „Biztonsági mentés letöltése” gomb egy fájlba menti az összes adatot, a „Visszatöltés fájlból” pedig visszaállítja. Táblázat-szinkron nélkül érdemes ezt havonta megcsinálni.
