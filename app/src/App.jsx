import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'

import Stage from './three/Stage'
import Chrome from './components/Chrome'
import Intro from './components/Intro'
import Questions from './components/Questions'
import Composing from './components/Composing'
import Reveal from './components/Reveal'
import Refine from './components/Refine'
import Finale from './components/Finale'

import { QUESTIONS } from './lib/questions'
import {
  composeFormula,
  materialParams,
  EMPTY_ANSWERS,
  NO_TWEAKS,
} from './lib/colorEngine'
import { oklchToHex } from './lib/oklch'
import { createAudioEngine } from './lib/audio'
import { decodeColour, writeHash } from './lib/share'

/**
 * A colour someone was sent, read out of the address bar before the first
 * render — so a shared link opens on the colour instead of flashing the door
 * and jumping.
 */
const SHARED = typeof window === 'undefined' ? null : decodeColour(window.location.hash)

/**
 * Phases, in order.
 *
 * `composing` is deliberately a phase of its own rather than a transition:
 * the two seconds of near-silence between the last answer and the colour
 * appearing are what make the reveal land. Take them out and the whole thing
 * feels like a form submission.
 */
const PHASES = ['intro', 'questions', 'composing', 'reveal', 'refine', 'finale']

/**
 * How much the music winds up per answer. It compounds over the four.
 *
 * The obvious number here is 5%, and it is the wrong one. A recording played
 * faster also plays *higher* — there is no time-stretching in a browser worth
 * having — and 5% compounded over four answers is 1.05⁴ = +21.6%, which is
 * 338 cents: a minor third. The bed stops being the low resonant drone it was
 * chosen for and starts sounding like a tape running fast, right at the moment
 * the visitor is meant to be most held.
 *
 * At 1.25% the four answers add up to 86 cents — under a semitone. It reads as
 * the room leaning in, and nobody can name what changed, which is the point.
 * This is the one number to turn if the climb should be felt harder; 1.05 is
 * what Simon originally asked for and is one edit away.
 */
const TEMPO_PER_ANSWER = 1.0125

/** Phases where the search is over and the room is allowed to settle. */
const RESTING = ['intro', 'reveal', 'refine', 'finale']

/** Phases where the colour exists — everything after the composing beat. */
const RESULT_PHASES = ['reveal', 'refine', 'finale']

/** Question 02's four answers, as how loud the room should be about it. */
const VOICE_LOUDNESS = { whisper: 0, speak: 0.34, sing: 0.68, shout: 1 }

export default function App() {
  const [phase, setPhase] = useState(SHARED ? 'reveal' : 'intro')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(SHARED?.answers ?? EMPTY_ANSWERS)
  const [tweaks, setTweaks] = useState(SHARED?.tweaks ?? NO_TWEAKS)
  const [muted, setMuted] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [bloom, setBloom] = useState(0)
  const [preview, setPreview] = useState(null)
  const [customName, setCustomName] = useState(SHARED?.customName ?? null)

  const audio = useRef(null)
  if (!audio.current) audio.current = createAudioEngine()

  /** True between an answer being given and the next question arriving. */
  const settling = useRef(false)

  /**
   * The passport's window for the sample panel.
   *
   * The panel is drawn in the WebGL canvas behind everything, so it cannot sit
   * *inside* the passport card — the card's own blur would be over the top of
   * it. Instead the passport leaves a gap in the document and hands its
   * position over; the panel measures that gap every frame and fills it, which
   * is also what keeps the two together while the sheet scrolls.
   */
  const passportSlot = useRef(null)

  /**
   * Hovering an option puts it into the colour temporarily. The whole room
   * shifts while the pointer rests on a card and settles back when it leaves —
   * you feel the consequence of an answer before you commit to it.
   */
  const liveAnswers = useMemo(() => {
    if (!preview || phase !== 'questions') return answers
    return { ...answers, [QUESTIONS[step].id]: preview }
  }, [answers, preview, phase, step])

  /**
   * The engine always produces a name; a typed one simply wins. The generated
   * one stays reachable underneath so clearing the field restores it rather
   * than leaving the colour nameless.
   */
  const formula = useMemo(() => {
    const composed = composeFormula(liveAnswers, tweaks)
    // Compared against null, not truthiness: an empty string is a valid state
    // while someone is mid-rename, and must not snap back to the generated
    // name under their cursor.
    return customName === null
      ? composed
      : { ...composed, name: customName, givenName: composed.name }
  }, [liveAnswers, tweaks, customName])

  const specimen = useMemo(() => materialParams(formula), [formula])

  /**
   * The field takes the hue but not the full brightness. A near-white answer
   * like Chalk would otherwise light the whole background up and swallow the
   * text sitting on it — the field is atmosphere, the panel is the colour.
   */
  const fieldHex = useMemo(
    () => oklchToHex({ ...formula.colour, l: Math.min(formula.colour.l, 0.6) }),
    [formula.colour],
  )

  const answered = Object.values(answers).filter(Boolean).length

  /* --- the colour drives the CSS custom properties the whole UI reads ------ */
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--lab-colour', formula.css)
    root.style.setProperty('--lab-glow', formula.css)
  }, [formula.css])

  /* --- ...and the pitch of the room --------------------------------------- */
  /*
    Keyed on the three numbers, not on the object that holds them.

    `formula.colour` is rebuilt on every render, so React saw a change every
    time anything moved — including the gloss slider, which does not touch the
    colour at all. Dragging gloss was retuning the room a hundred and twenty
    times a second to the note it was already playing.
  */
  useEffect(() => {
    audio.current.setColour(formula.colour)
  }, [formula.colour.l, formula.colour.c, formula.colour.h])

  useEffect(() => {
    audio.current.setMuted(muted)
  }, [muted])

  // Atmospheres belong to question 01 only; leaving the questions lets go.
  useEffect(() => {
    if (phase !== 'questions') audio.current.setAtmosphere(null)
  }, [phase])

  // The room holds its tension until the colour exists, then settles.
  useEffect(() => {
    audio.current.setAtRest(['reveal', 'refine', 'finale'].includes(phase))
  }, [phase])

  /**
   * Question 02 asks how loud the colour should be, so the room obeys it.
   * Driven off the live answers, which means it also moves under the pointer:
   * hovering Shout is audibly louder than hovering Whisper, before committing.
   */
  useEffect(() => {
    audio.current.setIntensity(VOICE_LOUDNESS[liveAnswers.voice] ?? 0.34)
  }, [liveAnswers.voice])

  /* --- the music winds up with every answer, and unwinds at the colour ----- */
  useEffect(() => {
    audio.current.setTempo(
      RESTING.includes(phase) ? 1 : Math.pow(TEMPO_PER_ANSWER, answered),
    )
  }, [phase, answered])

  /**
   * The question, read aloud.
   *
   * Late on purpose: the line has to be on screen and settled before it is
   * spoken, or the voice arrives as an interruption instead of as company.
   * Leaving the questions cuts it off mid-sentence, which is the right
   * behaviour — someone who has moved on is not still listening.
   */
  useEffect(() => {
    if (phase !== 'questions') {
      audio.current.silence()
      return
    }
    const id = QUESTIONS[step]?.id
    if (!id) return
    const spoken = setTimeout(() => audio.current.speak(id), 900)
    return () => clearTimeout(spoken)
  }, [phase, step])

  /**
   * Start pulling the audio down while the visitor is still reading the door.
   * It needs no AudioContext and therefore no gesture, so by the time they
   * press Begin the room is usually already there.
   */
  useEffect(() => {
    audio.current.prefetch()
  }, [])

  /**
   * The colour, written into the address bar as soon as there is one.
   *
   * replaceState rather than a hash assignment: a slider drag would otherwise
   * push a hundred entries into the back button.
   *
   * And on a trailing edge, which is not a nicety. Safari caps replaceState at
   * a hundred calls per thirty seconds and throws a SecurityError past it;
   * Chrome only throttles silently, which is why this was invisible in every
   * measurement taken there. One full pull on the depth slider steps through a
   * hundred and seventy distinct values, so a single gesture in the refine
   * bench cleared the quota by nearly double — and the throw arrived here, in
   * an effect. React tears down the whole root when an effect throws past no
   * boundary: the page goes black mid-drag and does not come back. That is the
   * reported lock-up, and it belongs to Safari on a Mac.
   *
   * Trailing is also simply right. Nobody reads the address bar mid-drag; the
   * link has to be correct the moment the hand stops.
   */
  /*
    The pending timer is held in a ref and cleared at the top of every run,
    rather than through the effect's own cleanup. Both are correct; this one is
    correct without depending on when React chooses to run a cleanup, and there
    is exactly one owner of the timer at any moment.

    Measured on the built app, an 81-step drag at 60 Hz: no writes during the
    drag, one after it, and the hash lands on the value the slider ended on.
    Without the debounce the same gesture writes 81 times.

    (An earlier reading appeared to show the debounce failing entirely. It was
    the instrument, not the code: a remote-controlled Chrome throttles
    requestAnimationFrame to 1 Hz when its window is not frontmost, which
    stretched a 1.5-second drag to forty seconds and put every step further
    apart than the debounce window. Pace synthetic drags on a timer, never on
    rAF, or the measurement quietly becomes about the browser instead.)
  */
  const hashTimer = useRef(null)
  useEffect(() => {
    if (!RESULT_PHASES.includes(phase)) return
    clearTimeout(hashTimer.current)
    hashTimer.current = setTimeout(() => writeHash(answers, tweaks, customName), 400)
  }, [phase, answers, tweaks, customName])

  useEffect(() => () => clearTimeout(hashTimer.current), [])

  /**
   * Someone arriving on a shared link never passed the door, so the audio was
   * never unlocked — and a browser will not let it be, until they do
   * something. The first thing they do, whatever it is, opens the room.
   */
  useEffect(() => {
    if (!SHARED) return
    const open = async () => {
      await audio.current.start()
      setAudioReady(true)
    }
    const events = ['pointerdown', 'keydown', 'touchend']
    events.forEach((e) => window.addEventListener(e, open, { once: true, passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, open))
  }, [])

  useEffect(() => () => audio.current?.dispose(), [])

  const play = useCallback((kind) => audio.current.tone(kind), [])

  const begin = useCallback(async () => {
    await audio.current.start()
    setAudioReady(true)
    setPhase('questions')
    setTimeout(() => audio.current.tone('advance'), 260)
  }, [])

  const answer = useCallback(
    (questionId, optionId) => {
      // An answer takes six-tenths of a second to be seen before the question
      // changes, and for that whole time the card is still under the cursor.
      // Without this, an impatient second click lands on a question that has
      // already been answered and advances the step twice — past the last
      // question, into a screen that does not exist.
      if (settling.current) return
      settling.current = true

      setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
      setPreview(null)
      play('select')

      const isLast = step === QUESTIONS.length - 1
      // Long enough to see the choice register on the field before moving on.
      setTimeout(() => {
        settling.current = false
        if (isLast) setPhase('composing')
        else {
          setStep((s) => Math.min(s + 1, QUESTIONS.length - 1))
          play('advance')
        }
        // The world you chose keeps sounding for a moment into the next
        // question, then lets go — an abrupt cut would feel like an error.
        if (questionId === 'world') {
          setTimeout(() => audio.current.setAtmosphere(null), 1400)
        }
      }, 620)
    },
    [step, play],
  )

  const back = useCallback(() => {
    if (step === 0) return
    settling.current = false
    setStep((s) => s - 1)
    setPreview(null)
    play('back')
  }, [step, play])

  /* --- the composing beat, then the reveal -------------------------------- */
  useEffect(() => {
    if (phase !== 'composing') return
    const toReveal = setTimeout(() => {
      setPhase('reveal')
      setBloom(1)
      play('reveal')
      setTimeout(() => setBloom(0), 2600)
    }, 2600)
    return () => clearTimeout(toReveal)
  }, [phase, play])

  /** Clear everything and go back to the questions, keeping the audio alive. */
  const restart = useCallback(() => {
    settling.current = false
    setAnswers(EMPTY_ANSWERS)
    setTweaks(NO_TWEAKS)
    setPreview(null)
    setCustomName(null)
    setStep(0)
    setPhase('questions')
    play('back')
  }, [play])

  /** All the way out — back to the door. */
  const backToStart = useCallback(() => {
    settling.current = false
    setAnswers(EMPTY_ANSWERS)
    setTweaks(NO_TWEAKS)
    setPreview(null)
    setCustomName(null)
    setStep(0)
    setBloom(0)
    setPhase('intro')
    audio.current.setAtmosphere(null)
    play('back')
  }, [play])

  /* --- keyboard: escape steps back, that is all ---------------------------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && phase === 'questions') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, back])

  /**
   * The panel is on screen from the reveal to the end.
   *
   * On the passport it stops framing itself against the window and takes the
   * slot the document gives it instead. A flat rectangle of colour there was
   * the one place in the experience that went back on the whole argument for
   * building this in WebGL — a passport for a coatings company should show the
   * finish, not a fill.
   */
  const showsSpecimen = ['reveal', 'refine', 'finale'].includes(phase)
  const fieldOpacity = phase === 'finale' ? 0.3 : showsSpecimen ? 0.6 : 1

  // How much of the visible height the panel may occupy, and how many pixels
  // the interface below it needs kept clear. Resolved against the real
  // viewport inside Specimen — whichever limit bites first wins.
  const specimenHeight = phase === 'refine' ? 0.26 : 0.42
  // Measured against the real blocks below: the reveal carries a name, code,
  // recipe, swatch row, button and caption — and the panel needs headroom for
  // its tilt on top of its flat height.
  const specimenReserve = phase === 'refine' ? 430 : 690
  // The refine bench is capped at 58vh (70vh from sm up), so it claims its
  // share proportionally rather than in pixels.
  const specimenReserveFraction = phase === 'refine' ? 0.63 : 0

  return (
    <>
      <Stage
        hex={formula.hex}
        fieldHex={fieldHex}
        energy={phase === 'intro' ? 0 : Math.max(answered / QUESTIONS.length, showsSpecimen ? 1 : 0)}
        bloom={bloom}
        // The field doubles its lines once the colour exists, and keeps them
        // for the rest of the visit — the room the colour lives in is a denser
        // room than the one the questions were asked in.
        density={RESULT_PHASES.includes(phase) ? 1 : 0}
        fieldOpacity={fieldOpacity}
        specimenParams={specimen}
        specimenPresence={showsSpecimen ? 1 : 0}
        specimenHeight={specimenHeight}
        specimenReserve={specimenReserve}
        specimenReserveFraction={specimenReserveFraction}
        specimenSlot={phase === 'finale' ? passportSlot : null}
      />

      <div className="vignette" />
      <div className="grain" />

      <Chrome
        phase={phase}
        step={step}
        total={QUESTIONS.length}
        muted={muted}
        audioReady={audioReady}
        onToggleSound={() => {
          setMuted((m) => !m)
          if (muted) play('tick')
        }}
        onBack={back}
        onRestart={backToStart}
      />

      <AnimatePresence mode="wait">
        {phase === 'intro' && <Intro key="intro" onBegin={begin} />}

        {phase === 'questions' && (
          <Questions
            key="questions"
            step={step}
            answers={answers}
            onAnswer={answer}
            onHover={(optionId) => {
              setPreview(optionId)
              if (optionId) play('hover')
              // Only question 01 has worlds to listen to.
              if (step === 0) audio.current.setAtmosphere(optionId)
            }}
          />
        )}

        {phase === 'composing' && <Composing key="composing" formula={formula} />}

        {phase === 'reveal' && (
          <Reveal
            key="reveal"
            formula={formula}
            answers={answers}
            tweaks={tweaks}
            onRename={setCustomName}
            onPick={(tweak) => {
              // Only the three colour axes move. Gloss and the special effect
              // were chosen in question 04 and are not this row's business.
              setTweaks((prev) => ({
                ...prev,
                hue: tweak?.hue ?? 0,
                lightness: tweak?.lightness ?? 0,
                chroma: tweak?.chroma ?? 0,
              }))
              play('select')
            }}
            onRefine={() => {
              setPhase('refine')
              play('advance')
            }}
          />
        )}

        {phase === 'refine' && (
          <Refine
            key="refine"
            formula={formula}
            answers={answers}
            tweaks={tweaks}
            setTweaks={setTweaks}
            onTick={() => play('tick')}
            onSelect={() => play('select')}
            onBack={() => {
              setPhase('reveal')
              play('back')
            }}
            onDone={() => {
              setPhase('finale')
              play('reveal')
            }}
          />
        )}

        {phase === 'finale' && (
          <Finale
            key="finale"
            formula={formula}
            answers={answers}
            tweaks={tweaks}
            slotRef={passportSlot}
            onRename={setCustomName}
            onRestart={restart}
            onBackToRefine={() => {
              setPhase('refine')
              play('back')
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export { PHASES }
