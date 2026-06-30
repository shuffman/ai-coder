import React from 'react'

/** Render a string with a single **bold** span as JSX (used in the activity log). */
export function Bold({ text }: { text: string }): React.ReactElement {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>
      )}
    </>
  )
}
