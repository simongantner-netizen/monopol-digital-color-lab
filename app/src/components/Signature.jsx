/**
 * The maker's mark. Appears the moment the colour first exists, and again on
 * the passport — quiet enough never to compete with either.
 */
export default function Signature({ className = '' }) {
  return (
    <p className={`text-center text-[0.78rem] font-light text-dim ${className}`}>
      Made with <span className="accent text-ash">love</span> by{' '}
      <a
        href="https://kampagnons.ch"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto text-ash underline decoration-white/15 underline-offset-4 transition-colors duration-300 hover:text-chalk hover:decoration-white/50"
      >
        kampagnons.ch
      </a>
    </p>
  )
}
