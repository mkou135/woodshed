import { renderNotation } from './score.ts'

/**
 * Engraving exercises for the session report.
 *
 * OSMD measures the element it draws into, so an exercise cannot be laid out
 * in a detached node or a `display: none` one — `getBBox()` returns zeros and
 * the trim in `renderNotation` throws. The host here is therefore in the
 * document and fully laid out, just parked outside the viewport, and it is
 * torn down whatever happens.
 *
 * There is no unit test: the whole module is the part that needs a real
 * browser layout engine, which is exactly what a jsdom test would fake away.
 * It is verified by exporting a real solo and reading the file.
 */

/** Wide enough that a two-bar exercise engraves on one system. */
const HOST_WIDTH = 900

/**
 * Runs `fn` with an engraver that turns MusicXML into standalone SVG markup,
 * then removes the offscreen host. The engraver is only valid inside `fn`.
 */
export async function withEngraver<T>(
  fn: (engrave: (xml: string) => Promise<string>) => Promise<T>,
): Promise<T> {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:absolute;left:-20000px;top:0;width:${HOST_WIDTH}px`
  document.body.appendChild(host)

  const engrave = async (xml: string): Promise<string> => {
    const slot = document.createElement('div')
    host.appendChild(slot)
    try {
      await renderNotation(slot, xml)
      const svg = slot.querySelector('svg')
      // renderNotation swallows its own failures and writes a <p> instead, so
      // a missing SVG is the signal that this exercise did not engrave.
      if (!svg) throw new Error('no notation was drawn')
      return svg.outerHTML
    } finally {
      slot.remove()
    }
  }

  try {
    return await fn(engrave)
  } finally {
    host.remove()
  }
}
