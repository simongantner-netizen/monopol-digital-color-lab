/**
 * The four questions.
 *
 * Design rule: never ask for a colour value, ask for a memory. Nobody knows
 * what "hue 214, chroma 0.08" means, but everybody knows what the sea looks
 * like after a storm. Each question still resolves to one precise parameter —
 * the poetry is the interface, the maths is underneath.
 *
 *   01  THE ONE    → base hue, chroma, lightness  (which world)
 *   02  THE VOICE  → chroma multiplier            (how loud)
 *   03  THE HOUR   → lightness + warmth           (which light)
 *   04  THE LIGHT  → surface + special effect     (how it holds light)
 */

export const QUESTIONS = [
  {
    id: 'world',
    index: '01',
    label: 'The one',
    prompt: 'If you could only ever see one colour on your building — which one would it be?',
    note: 'Answer with your gut. We will get precise later.',
    columns: 4,
    /**
     * Twelve worlds, chosen to cover the families an architect actually
     * specifies — white, anthracite, red, orange, ochre, beige, green,
     * verdigris, petrol, blue, violet, rust — so the first answer always
     * lands near the right neighbourhood and refinement does the rest.
     */
    options: [
      {
        id: 'chalk',
        title: 'Chalk, straight out of the cliff',
        caption: 'Bright, dry, absolute',
        name: 'Chalk',
        base: { l: 0.955, c: 0.006, h: 250 },
      },
      {
        id: 'sand',
        title: 'Sand nobody has walked on yet',
        caption: 'Pale, dry, untouched',
        name: 'Dune',
        base: { l: 0.83, c: 0.042, h: 78 },
      },
      {
        id: 'ochre',
        title: 'Wheat, a week before harvest',
        caption: 'Golden, warm, patient',
        name: 'Ochre',
        base: { l: 0.78, c: 0.115, h: 88 },
      },
      {
        id: 'clay',
        title: 'Clay, still wet from the wheel',
        caption: 'Warm, earthen, alive',
        name: 'Kiln',
        base: { l: 0.57, c: 0.115, h: 46 },
      },
      {
        id: 'cinnabar',
        title: 'Poppies at the edge of a field',
        caption: 'Loud, certain, unmissable',
        name: 'Cinnabar',
        base: { l: 0.55, c: 0.17, h: 30 },
      },
      {
        id: 'iron',
        title: 'Iron, left out in the weather',
        caption: 'Rust, time, honesty',
        name: 'Patina',
        base: { l: 0.42, c: 0.072, h: 38 },
      },
      {
        id: 'moss',
        title: 'Moss on the north side of a stone',
        caption: 'Quiet, shaded, patient',
        name: 'Lichen',
        base: { l: 0.45, c: 0.06, h: 148 },
      },
      {
        id: 'verdigris',
        title: 'Copper, at peace with the rain',
        caption: 'Aged, cool, noble',
        name: 'Verdigris',
        base: { l: 0.66, c: 0.075, h: 178 },
      },
      {
        id: 'sea',
        title: 'The sea, three hours after the storm',
        caption: 'Deep, cold, still moving',
        name: 'Fathom',
        base: { l: 0.47, c: 0.075, h: 218 },
      },
      {
        id: 'indigo',
        title: 'Ink, a second before it dries',
        caption: 'Deep, exact, serious',
        name: 'Indigo',
        base: { l: 0.36, c: 0.115, h: 262 },
      },
      {
        id: 'threshold',
        title: 'The pause between night and morning',
        caption: 'Neither dark nor light',
        name: 'Threshold',
        base: { l: 0.44, c: 0.05, h: 278 },
      },
      {
        id: 'basalt',
        title: 'Basalt, split open',
        caption: 'Dark, dense, final',
        name: 'Basalt',
        base: { l: 0.29, c: 0.012, h: 265 },
      },
    ],
  },
  {
    id: 'voice',
    index: '02',
    label: 'The voice',
    prompt: 'Every colour has a volume. Should yours whisper, or be heard from across the street?',
    note: 'This decides how much of itself the colour admits to.',
    columns: 4,
    options: [
      {
        id: 'whisper',
        title: 'Whisper',
        caption: 'You notice it on the second look',
        name: 'Hushed',
        chroma: 0.34,
      },
      {
        id: 'speak',
        title: 'Speak',
        caption: 'Present, never loud',
        name: '',
        chroma: 0.78,
      },
      {
        id: 'sing',
        title: 'Sing',
        caption: 'It carries down the street',
        name: 'Bright',
        chroma: 1.25,
      },
      {
        id: 'shout',
        title: 'Shout',
        caption: 'Nobody walks past this building',
        name: 'Vivid',
        chroma: 1.85,
      },
    ],
  },
  {
    id: 'hour',
    index: '03',
    label: 'The hour',
    prompt: 'Light writes the colour. At which hour should yours be at its most beautiful?',
    note: 'Architects know this one. The same wall is three colours a day.',
    columns: 4,
    options: [
      {
        id: 'dawn',
        title: 'First light',
        time: '05 : 47',
        caption: 'Cool, thin, hopeful',
        name: 'Aurora',
        lightness: 0.15,
        warmth: 7,
        chroma: 0.82,
      },
      {
        id: 'noon',
        title: 'High noon',
        time: '12 : 00',
        caption: 'Honest and unforgiving',
        name: 'Meridian',
        lightness: 0.05,
        warmth: 0,
        chroma: 1,
      },
      {
        id: 'golden',
        title: 'The golden hour',
        time: '19 : 12',
        caption: 'Everything is briefly beautiful',
        name: 'Ember',
        lightness: -0.03,
        warmth: -13,
        chroma: 1.18,
      },
      {
        id: 'dark',
        title: 'After dark',
        time: '23 : 30',
        caption: 'Only the streetlight is watching',
        name: 'Nocturne',
        lightness: -0.15,
        warmth: 9,
        chroma: 0.88,
      },
    ],
  },
  {
    id: 'light',
    index: '04',
    label: 'The light',
    prompt: 'Every surface holds light differently. How should yours hold it?',
    note: 'This is where a colour stops being a colour and becomes a material.',
    columns: 5,
    options: [
      {
        id: 'swallow',
        title: 'Swallow it whole',
        caption: 'Deep matt. Light goes in, nothing comes out.',
        name: 'Matt',
        gloss: 0.04,
        effect: 'none',
      },
      {
        id: 'soft',
        title: 'Hold it softly',
        caption: 'Silk. A slow sheen when you move.',
        name: 'Silk',
        gloss: 0.34,
        effect: 'none',
      },
      {
        id: 'return',
        title: 'Give it straight back',
        caption: 'High gloss. Sharp, wet, reflective.',
        name: 'Gloss',
        gloss: 0.9,
        effect: 'none',
      },
      {
        id: 'break',
        title: 'Break it into colours',
        caption: 'Iridescent. The hue shifts with your step.',
        name: 'Iris',
        gloss: 0.62,
        effect: 'iridescent',
      },
      {
        id: 'fire',
        title: 'Let it catch fire',
        caption: 'Metallic flake. Thousands of tiny mirrors.',
        name: 'Flake',
        gloss: 0.72,
        effect: 'glitter',
      },
    ],
  },
]

export const getQuestion = (id) => QUESTIONS.find((q) => q.id === id)

export const getOption = (questionId, optionId) =>
  getQuestion(questionId)?.options.find((o) => o.id === optionId)
