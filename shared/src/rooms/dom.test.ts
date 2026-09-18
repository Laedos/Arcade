// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { formatSeconds, h, replaceKeepingFocus } from './dom'

describe('replaceKeepingFocus', () => {
  it('gives a kept input its focus and cursor back after the swap', () => {
    const container = h('div')
    document.body.replaceChildren(container)
    const input = h('input')
    container.append(h('p', {}, 'old'), input)
    input.value = 'a cat on a mat'
    input.focus()
    input.setSelectionRange(5, 5)

    replaceKeepingFocus(container, h('p', {}, 'new'), input)

    expect(container.firstChild!.textContent).toBe('new')
    expect(document.activeElement).toBe(input)
    expect([input.selectionStart, input.selectionEnd]).toEqual([5, 5])
  })

  it('refocuses a kept button too, without touching selections', () => {
    const container = h('div')
    document.body.replaceChildren(container)
    const button = h('button', {}, 'Go')
    container.append(button)
    button.focus()
    replaceKeepingFocus(container, button)
    expect(document.activeElement).toBe(button)
  })

  it('leaves focus alone when the focused element is not in the new content', () => {
    const container = h('div')
    const outside = h('input')
    document.body.replaceChildren(container, outside)
    const gone = h('input')
    container.append(gone)
    gone.focus()
    replaceKeepingFocus(container, h('p', {}, 'new'))
    expect(document.activeElement).toBe(document.body)

    outside.focus()
    replaceKeepingFocus(container, h('p', {}, 'again'))
    expect(document.activeElement).toBe(outside)
  })

  it('does nothing special when nothing has focus', () => {
    const container = h('div')
    document.body.replaceChildren(container)
    replaceKeepingFocus(container, h('p', {}, 'x'))
    expect(document.activeElement).toBe(document.body)
  })
})

describe('formatSeconds', () => {
  it('rounds up to whole seconds and never goes negative', () => {
    expect(formatSeconds(75_000)).toBe('1:15')
    expect(formatSeconds(4_100)).toBe('0:05')
    expect(formatSeconds(-10)).toBe('0:00')
  })
})
