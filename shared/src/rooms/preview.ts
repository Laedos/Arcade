import { button, h } from './dom'

export interface PreviewStep {
  label: string
  render(): HTMLElement
}

// A strip of buttons, one per sample screen, for clicking through a game's UI before its server
// exists. Every action inside the preview is a no-op; the steps are fixed sample states.
export function previewBar(steps: PreviewStep[], show: (screen: HTMLElement) => void, exit: () => void, start = 0): HTMLElement {
  const bar = h('nav', { class: 'preview-bar', 'aria-label': 'Preview screens' }, h('span', { class: 'preview-label' }, 'Preview'))
  const buttons = steps.map((step, i) =>
    button(step.label, () => {
      for (const b of buttons) b.setAttribute('aria-pressed', String(b === buttons[i]))
      show(step.render())
    }),
  )
  bar.append(...buttons, button('Exit preview', exit, 'exit'))
  if (steps.length > 0) buttons[Math.min(Math.max(0, start), steps.length - 1)].click()
  return bar
}

// Preview screens have no live clock; this fills a screen's countdown with a fixed sample.
export function withSampleTimer(screen: HTMLElement, text = '0:42'): HTMLElement {
  const timer = screen.querySelector<HTMLElement>('#timer')
  if (timer) timer.textContent = text
  return screen
}
