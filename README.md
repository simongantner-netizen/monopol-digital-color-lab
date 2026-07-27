# Digital Color Lab — Monopol Colors

Prototyp einer digitalen Farbwerkstatt für Architekt:innen. Vier Fragen, eine
Farbe, ein Material — und ein Weg zurück ins echte Color Lab.

Für: Lionel Schlessinger, Inhaber & CEO Monopol Colors.

---

## Live

**https://simongantner-netizen.github.io/monopol-digital-color-lab/**

Jeder Push auf `main` baut und deployt automatisch (GitHub Actions →
GitHub Pages). Dauert rund 40 Sekunden.

## Starten

```bash
npm --prefix "Monopol/Digital Color Lab/app" run dev
```

Läuft auf http://localhost:5173

Produktion bauen:

```bash
npm --prefix "Monopol/Digital Color Lab/app" run build
```

Der Build erwartet, dass die Seite unter `/monopol-digital-color-lab/` liegt.
Für einen anderen Host (Vercel, Netlify, eigene Domain) den Pfad überschreiben:

```bash
BASE_PATH=/ npm --prefix "Monopol/Digital Color Lab/app" run build
```

---

## Vor der Präsentation erledigen

**Musikrechte klären — der einzige offene Rechtepunkt.** Die Atmosphären sind
sauber: Simons eigene Effektbibliothek plus drei Aufnahmen von Freesound, alle
drei CC0 (public domain, keine Namensnennung nötig) — `pen.mp3` aus
[#540567](https://freesound.org/s/540567/) von redsedona, `stone.mp3` aus
[#421826](https://freesound.org/s/421826/) von Kinoton, `dawn.mp3` aus
[#757868](https://freesound.org/s/757868/) von xkeril. Die Stimme kommt aus der
lizenzierten Higgsfield-/ElevenLabs-Nutzung.

Offen ist nur die Musik. Das Hintergrundbett (`app/src/assets/audio/music.mp3`)
ist ein 52-Sekunden-Ausschnitt aus einem YouTube-Upload: „Fascial Sound Bath"
von *Sound Energy Alchemist* (`_QZFHeQIQjc`). Für den internen Prototyp
bewusst so entschieden, Rechte später. Vor jeder öffentlichen oder
kundenseitigen Nutzung muss das geklärt oder ersetzt sein — die Seite liegt auf
GitHub Pages und ist damit öffentlich abrufbar. Ersetzen heisst: neue Datei
gleichen Namens ablegen, Länge in `LOOP_SECONDS.music` (`lib/audioAssets.js`)
korrigieren, fertig.

Lionels echte Adresse ist eingetragen (`app/src/lib/contact.js`). Der letzte
Button erzeugt daraus eine fertig ausgefüllte Mail mit der ganzen Farbformel
und einem Link zurück auf genau diese Farbe. Kein Backend nötig, funktioniert
von jedem Gerät im Raum — und falls kein Mailprogramm eingerichtet ist, stehen
Adresse und „Link kopieren" sichtbar darunter.

---

## Der Ablauf

| Phase | Was passiert |
|---|---|
| **Intro** | „Headphones recommended", dann Einstieg. Der Klick startet den Ton (Browser erlauben Audio erst nach einer Geste). |
| **4 Fragen** | Jede Antwort verschiebt die Farbe im Hintergrund. Hover zeigt live, welche Farbe eine Option erzeugen würde — **und in Frage 01 auch, wie sie klingt**. |
| **Composing** | 2,6 Sekunden Stille: Pigment → Binder → Light. Der Moment, der den Reveal trägt. |
| **Reveal** | Die Musterplatte erscheint in echtem Material. Name (frei umbenennbar) + Laborcode. |
| **Refine** | Farbton, Tiefe, Intensität, Glanz, Speziallack-Effekt. |
| **Finale** | Farbpass mit allen Werten. Mail an Lionel oder Termin im echten Lab. |

„Back to the start" oben rechts führt aus jedem Schritt zurück zur Startseite.

### Die vier Fragen

Nie nach einem Farbwert fragen, immer nach einer Erinnerung. Jede Frage
steuert trotzdem exakt einen Parameter:

1. **The one** — „Wenn du nur je eine Farbe an deinem Gebäude sehen könntest?" → Grundton
2. **The voice** — Whisper / Speak / Sing / Shout → Sättigung
3. **The hour** — First light / High noon / Golden hour / After dark → Helligkeit + Wärme
4. **The light** — Wie soll die Oberfläche das Licht halten? → Glanz + Effekt

Frage 1 bietet zwölf Welten, gewählt nach den Farbfamilien, die Architekt:innen
tatsächlich spezifizieren: Weiss (Chalk), Beige (Dune), Gelb (Ochre), Orange
(Kiln), Rot (Cinnabar), Rost (Patina), Grün (Lichen), Grünspan (Verdigris),
Petrol (Fathom), Blau (Indigo), Violett (Threshold), Anthrazit (Basalt).

Ergibt 960 Kombinationen und 84 Farbnamen (z. B. „Ember Kiln", „Vivid Fathom").

Der Name nimmt den Charakterzug der Antwort, die die Farbe am stärksten
verschiebt: Whisper und Shout verändern sie weiter als jede Stunde, also
benennen sie. Speak ist die neutrale Antwort und überlässt das Wort der Stunde.
Die Referenz daneben trägt alle drei OKLCH-Werte (`MC 262 · 41 · 19`) und
identifiziert die Farbe damit vollständig — ohne die Chroma-Stelle bekamen eine
geflüsterte und eine geschriene Farbe dieselbe Nummer, obwohl sie um den
Faktor fünf in der Sättigung auseinanderliegen.

**Jede Farbe hat einen Link.** Der Zustand steht im URL-Hash (6 bis 66 Zeichen,
versioniert), die Engine ist deterministisch — kein Backend. Ein geteilter Link
öffnet direkt auf der Farbe.

---

## Technik

- **Vite + React 19 + Tailwind v4**
- **three.js / react-three-fiber** — die Musterplatte ist echtes PBR-Material
  unter einem prozeduralen Studio-Licht. Matt, Seidenglanz und Hochglanz sind
  physikalisch unterschiedliche Reflexionen, kein CSS-Verlauf. Genau das
  erkennt ein Farbtechniker sofort.
- **framer-motion** — alle Übergänge
- **OKLCH statt HSL** (`src/lib/oklch.js`) — wahrnehmungsgleichmässig, damit
  Farbübergänge nicht durch Gelb und Cyan ruckeln. Inklusive Gamut-Mapping,
  das bei Übersättigung die Chroma reduziert statt den Farbton zu verfälschen.
- **Tone Mapping: `NeutralToneMapping`** — hält gesättigte Farben treu. ACES
  würde die Farbe entsättigen, was bei einem Farbhersteller nicht geht.
- **Web Audio** (`src/lib/audio.js`) — vier Ebenen, die einander aus dem Weg
  gehen: das Musikbett, ein Farb-Pad, die Welt unter dem Cursor und die
  gesprochene Frage. Der Farbton bestimmt den Grundton des Pads, die Sättigung
  öffnet den Filter und kippt das Musikbett heller oder wärmer. Die Farbe ist
  hörbar. Ton oben rechts umschaltbar.
- **Zwölf Atmosphären aus zehn Aufnahmen** (`src/lib/atmospheres.js`) — jede
  Welt in Frage 01 hat ihren eigenen Klang. Zehn Betten reichen für zwölf
  Welten, weil eine Welt nicht nur davon lebt, *welche* Aufnahme läuft, sondern
  *wie* sie gehört wird: derselbe Wind ist eine Kreideklippe, wenn nur seine
  Höhen überleben, und unberührter Sand, wenn nur sein Körper bleibt. Fällt
  eine Datei aus, springt die alte synthetisierte Version ein — schlechtes
  WLAN kostet dem Raum das Detail, nicht den Ton.
- **Die Pegel der Welten sind gemessen, nicht geschätzt.** Ein Filter nimmt so
  viel Energie weg, wie zufällig ausserhalb von ihm liegt — und das hängt ganz
  von der Aufnahme ab. In der ersten Fassung waren vier Welten deshalb faktisch
  stumm, Moos um 23 dB. Jetzt wird jede Filterkette offline gerendert, gemessen
  und auf dieselbe Lautheit gezogen. **Wer einen Filter ändert, muss neu
  messen** — der Gain daneben stimmt dann nicht mehr.
- **Das Musikbett zieht mit jeder Antwort an** (`TEMPO_PER_ANSWER` in
  `App.jsx`) und lässt beim Reveal wieder los. Bewusst nur 1,25 % pro Antwort:
  im Browser gibt es kein brauchbares Time-Stretching, schneller heisst also
  auch höher. 5 % pro Schritt wären kumuliert +21,6 % — 338 Cent, eine kleine
  Terz, und aus dem tiefen Drone wird eine zu schnell laufende Bandmaschine.
  1,25 % ergeben 86 Cent: spürbar, aber nicht benennbar.
- **Die Fragen werden vorgelesen** — englische Frauenstimme (ElevenLabs
  „Nora"), auf -23 LUFS gepegelt. Während sie spricht, geht alles andere um
  7,5 dB zurück und kommt einen Wimpernschlag nach dem letzten Wort wieder,
  damit der Raum wartend wirkt statt geschaltet.
- **Loops sind sample-genau** — jede Datei ist auf sich selbst überblendet und
  wird nach dem Dekodieren auf ihre exakte Länge zurückgeschnitten. MP3 trägt
  ein paar Millisekunden Encoder-Padding, und ob ein Browser sie entfernt, ist
  nicht standardisiert: Chrome tut es, Firefox erst ab 83, Safari macht sein
  eigenes Ding. Ungeschnitten tickt ein 12-Sekunden-Bett fünfmal pro Minute.
  Gemessen liegt der Sprung an der Nahtstelle unter dem grössten Sprung
  *innerhalb* der Datei — bei `rumble` um den Faktor 60.

### Struktur

```
app/src/
  lib/
    oklch.js         Farbmathematik
    questions.js     Die vier Fragen  ← Texte hier ändern
    colorEngine.js   Antworten → Farbe + Material
    audio.js         Die ganze Klangregie
    atmospheres.js   Welt → Aufnahme + Filter
    audioAssets.js   Dateien + exakte Looplängen
    contact.js       Kontaktdaten     ← E-Mail hier eintragen
  assets/audio/      7 Betten, 1 Musikbett, 4 gesprochene Fragen (2,3 MB)
  three/
    Stage.jsx        Canvas + Studio-Licht
    DottedField.jsx  Das Punktefeld
    Specimen.jsx     Die Musterplatte
    flakeTexture.js  Prozedurale Normal-Maps
  components/        Intro, Questions, Composing, Reveal, Refine, Finale
```

---

## Bewusst so entschieden

- **Keine Fotos aus dem physischen Lab.** Das digitale Erlebnis ist etwas
  anderes und soll nicht dessen Abbild sein.
- **Farben sind für den Prototyp frei erfunden.** Keine RAL-/NCS-Anbindung.
  Der Farbpass sagt das auch: „Screen values are indicative."
- **Der Abschluss führt zurück ins echte Lab.** Die App ersetzt das Color Lab
  nicht, sie macht Lust darauf.
- **Summer Loving wird zweimal eingesetzt** — im Intro und in der Signatur.
  Sonst durchgehend Calibre.

---

## Bekannte Grenzen

- **Bundle 369 kB gzip** (three.js). Für die Demo unkritisch; bei Bedarf lässt
  sich three per dynamischem Import nachladen.
- **Glitter lebt von Bewegung.** Der Flake-Effekt blitzt auf, wenn sich der
  Betrachtungswinkel ändert — im Standbild sieht man ihn kaum. Maus bewegen.
- **Kein Speichern.** Farben existieren nur in der Session.
- **Mobil funktioniert alles**, ist aber für Desktop gestaltet.
