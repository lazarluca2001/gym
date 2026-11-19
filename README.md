# Napló – súly, edzés, tánc

Telefonra tehető napló: **Ma** kezdőképernyő, **Heti terv** (A/B edzés, tánc, lépéscél), **Edzés és tánc** (szériánkénti súllyal és ismétléssel) és **Statisztika** (edzés, tánc, lépés). Súlyt és étkezést nem naplóz. A lapok között a bal felső hamburger menüvel váltasz. GitHub Pages-en fut, internet nélkül is megnyílik, és ha szeretnéd, minden mentést beír egy Google Táblázatba.

## 1. Feltöltés GitHubra (kb. 5 perc)

1. Lépj be a github.com-ra, jobb fent **+ → New repository**.
2. Név: például `edzes`. Legyen **Public** (az ingyenes GitHub Pages-hez ez kell; az adataid nem kerülnek bele, csak a program). **Create repository**.
3. A következő oldalon kattints az **uploading an existing file** linkre.
4. Húzd be az összes fájlt ebből a mappából (a mappa tartalmát, nem magát a mappát):
   `index.html`, `terv.html`, `edzes.html`, `stats.html`, `store.js`, `plan.js`, `nav.js`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `Code.gs`, `README.md`
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
7. Az appban: menü → **Adatok és szinkron** → illeszd be az URL-t és a titkos szót → **Összekötés**.

A jobb felső sarokban ezután a „Szinkronizálva a táblázattal” felirat látszik. Az első összekötéskor a telefonon lévő adatok feltöltődnek a táblázatba. A táblázatban öt lap jön létre:
- **Súly**: csak a korábban beírt súlyadatok (az app már nem naplóz súlyt)
- **Edzés**: szériánként egy sor: dátum, gyakorlat, hányadik széria, ismétlés, súly, volumen, kész, RIR
- **Tánc**: dátum, típus, óra típusa, időtartam, intenzitás, hely
- **Lépés**: dátum, nap, lépésszám
- **_adatok**: ebből dolgozik az app, ezt ne szerkeszd kézzel

A Súly, az Edzés, a Tánc és a Lépés lap minden mentéskor újragenerálódik, ezért az ott végzett kézi módosítás elveszik. Szerkeszteni az appban tudsz.

Ha internet nélkül mentesz, az app megjegyzi a változásokat, és a következő alkalommal, amikor van net, feltölti őket.

## Heti terv

A **Heti terv** oldal (menü → Heti terv) a heti beosztást mutatja:

| Nap | Program | Lépéscél (1–2. hét / 3–4. hét / 5. héttől) |
|---|---|---|
| Hétfő | A edzés (combfeszítő + hát + has) | 7 000 / 7 500 / 8 000 |
| Kedd | Tánc 3 óra | 5 000 + tánc |
| Szerda | Aktív pihenő, séta | 8 000 / 9 000 / 10 000 |
| Csütörtök | Tánc 2,5 óra | 5 000 + tánc |
| Péntek | Tánc 1,5 óra | 7 000 / 7 500 / 8 000 + tánc |
| Szombat | B edzés (far + mell/váll + vádli) | 7 000 / 8 000 / 9 000 |
| Vasárnap | Pihenő, könnyű séta | 8 000 / 9 000 / 10 000 |

- Itt írod be a napi lépésszámot (a napra kattintva korábbi napra is).
- Az A és B edzésnél látod a kezdősúlyt és a legutóbbi alkalmat; az „indítása” gomb az Edzés oldalon betölti a gyakorlatokat.
- A program első alkalmánál a terv kezdősúlyai töltődnek be, utána a megszokott módon a legutóbbi alkalomból (RIR 2+ esetén eggyel nehezebb).
- A **Program beállítása** részben állíthatod, melyik hétfőn indult a program – ettől számolja a lépéscél emelését.
- A terv tartalma (gyakorlatok, kezdősúlyok, lépéscélok) a `plan.js` fájlban van.

## Frissítés

Ha új fájlokat kapsz, töltsd fel őket ugyanígy (Add file → Upload files), felülírva a régieket. Verziót nem kell állítani: amikor legközelebb megnyitod az appot, alul megjelenik az „Új verzió érhető el – Frissítés” sáv. Az adataidat a frissítés nem érinti.

## Biztonsági mentés

Az **Adatok és szinkron** részben a „Biztonsági mentés letöltése” gomb egy fájlba menti az összes adatot, a „Visszatöltés fájlból” pedig visszaállítja. Táblázat-szinkron nélkül érdemes ezt havonta megcsinálni.

## Ha már beállítottad a szinkront egy korábbi változattal

A `Code.gs` bővült (Súly lap, szériánkénti Edzés lap, Lépés lap). Frissítsd így, hogy az URL ugyanaz maradjon:
1. A táblázatban **Bővítmények → Apps Script**, töröld a régi kódot, és másold be az új `Code.gs`-t. A `TOKEN` sorba írd vissza a saját titkos szavadat. Mentés.
2. **Telepítés → Telepítések kezelése** → ceruza ikon → **Verzió: Új verzió** → **Telepítés**.

Ellenőrzés: a webalkalmazás URL-je böngészőben megnyitva ezt írja: „A napló szinkron működik (4. verzió).” (A 4. verzió a Lépés lapot hozza.) Ha kihagyod, az app akkor is működik, a régi szkript mellett a súlyadatok a telefonon maradnak, és a frissítés után automatikusan feltöltődnek.
