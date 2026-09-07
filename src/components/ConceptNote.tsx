'use client'

import { useEffect, useState } from 'react'

/**
 * The "this is a concept" line, shown only where it is true.
 *
 * On a Y Combinator domain the app genuinely is Y Combinator's, so the note
 * would be false and it does not render. On any other host — Render, a preview
 * URL, localhost — it does. Rendering it by default and hiding it after mount
 * means the honest state is the one that survives if the check ever fails.
 */
export default function ConceptNote() {
  const [onYc, setOnYc] = useState(false)

  useEffect(() => {
    setOnYc(/(^|\.)ycombinator\.com$/i.test(window.location.hostname))
  }, [])

  if (onYc) return null

  return (
    <p className="login-note" style={{ marginTop: 0, borderTop: 0, paddingTop: 4 }}>
      A concept build exploring how Bookface could work &mdash; not the official
      product, and not affiliated with Y Combinator.
    </p>
  )
}
