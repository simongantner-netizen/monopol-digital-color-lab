# Digital Color Lab — Monopol Colors

Prototyp einer digitalen Farbwerkstatt für Architekt:innen. Vier Fragen, eine
Farbe, ein Material — und ein Weg zurück ins echte Color Lab.

Für: Lionel Schlessinger, Inhaber & CEO Monopol Colors.

---

## Starten

```bash
npm --prefix "Monopol/Digital Color Lab/app" run dev
```

Läuft auf http://localhost:5173

Produktion bauen:

```bash
npm --prefix "Monopol/Digital Color Lab/app" run build
```

---

## Vor der Präsentation erledigen

**Lionels E-Mail-Adresse eintragen** in `app/src/lib/contact.js`:

```js
email: 'colorlab@monopol-colors.ch', // ← Platzhalter
```

Der letzte Button erzeugt daraus eine fertig ausgefüllte Mail mit der ganzen
Farbformel. Kein Backend nötig — funktioniert von jedem Gerät im Raum.

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

Ergibt 960 Kombinationen, 48 Farbnamen (z. B. „Ember Kiln", „Nocturne Fathom").

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
- **Web Audio, komplett prozedural** (`src/lib/audio.js`) — keine Audiodateien.
  Der Farbton bestimmt den Grundton, die Sättigung öffnet den Filter. Die
  Farbe ist hörbar. Ton oben rechts umschaltbar.
- **Zwölf Atmosphären** (`src/lib/atmospheres.js`) — jede Welt in Frage 01 hat
  ihren eigenen Klang: Brandung, Wüstenwind, Regen auf Kupfer, raschelnder
  Weizen, das Summen einer Töpferscheibe. Ebenfalls synthetisiert: fast jede
  Naturatmosphäre *ist* gefiltertes Rauschen — der Unterschied liegt darin,
  welche Frequenzen überleben, wie langsam der Filter atmet und ob Transienten
  darüberliegen (Tropfen, Halme, Insekten).

### Struktur

```
app/src/
  lib/
    oklch.js         Farbmathematik
    questions.js     Die vier Fragen  ← Texte hier ändern
    colorEngine.js   Antworten → Farbe + Material
    audio.js         Synthese
    contact.js       Kontaktdaten     ← E-Mail hier eintragen
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
