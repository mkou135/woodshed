/** Small DOM helpers shared by the page's modules. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export function button(className: string, text: string, onClick?: () => void): HTMLButtonElement {
  const b = el('button', className, text)
  b.type = 'button'
  if (onClick) b.addEventListener('click', onClick)
  return b
}

export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS('http://www.w3.org/2000/svg', tag)
}

export function download(name: string, xml: string): void {
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' }))
  const link = el('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking in the same tick can cancel the download before it starts.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
