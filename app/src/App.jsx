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

/**
 * Phases, in order.
 *
 * `composing` is deliberately a phase of its own rather than a transition:
 * the two seconds of near-silence between the last answer and the colour
 * appearing are what make the reveal land. Take them out and the whole thing
 * feels like a form submission.
 */
const PHASES = ['intro', 'questions', 'composing', 'reveal', 'refine', 'finale']

export default function App() {
  const [phase, setPhase] = useState('intro')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(EMPTY_ANSWERS)
  const [tweaks, setTweaks] = useState(NO_TWEAKS)
  const [muted, setMuted] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [bloom, setBloom] = useState(0)
  const [preview, setPreview] = useState(null)
  const [customName, setCustomName] = useState(null)

  const audio = useRef(null)
  if (!audio.current) audio.current = createAudioEngine()

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
  useEffect(() => {
    audio.current.setColour(formula.colour)
  }, [formula.colour])

  useEffect(() => {
    audio.current.setMuted(muted)
  }, [muted])

  // Atmospheres belong to question 01 only; leaving the questions lets go.
  useEffect(() => {
    if (phase !== 'questions') audio.current.setAtmosphere(null)
  }, [phase])

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
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
      setPreview(null)
      play('select')

      const isLast = step === QUESTIONS.length - 1
      // Long enough to see the choice register on the field before moving on.
      setTimeout(() => {
        if (isLast) setPhase('composing')
        else {
          setStep((s) => s + 1)
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
   * The panel appears for the reveal and stays through refinement, then hands
   * over: the passport carries its own colour chip, and keeping the 3D panel
   * as well would put a second version of the same thing behind the text.
   */
  const showsSpecimen = ['reveal', 'refine'].includes(phase)
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
        fieldOpacity={fieldOpacity}
        specimenParams={specimen}
        specimenPresence={showsSpecimen ? 1 : 0}
        specimenHeight={specimenHeight}
        specimenReserve={specimenReserve}
        specimenReserveFraction={specimenReserveFraction}
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
            onRename={setCustomName}
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
