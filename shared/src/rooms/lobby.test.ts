// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { h } from './dom'
import { homeView, lobbyView, playerList } from './lobby'
import { previewBar, withSampleTimer } from './preview'
import type { BaseRoomView } from './protocol'

const room = (extra: Partial<BaseRoomView> = {}): BaseRoomView => ({
  code: 'ABCD',
  youId: 'a',
  phase: 'lobby',
  players: [
    { id: 'a', name: 'Ana', connected: true, isHost: true },
    { id: 'b', name: 'Ben', connected: false, isHost: false },
  ],
  ...extra,
})

const click = (el: HTMLElement, label: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === label)!.click()
const home = { name: 'Ana', code: '', busy: false, online: true, playerRange: '2 to 8 players' }

describe('homeView', () => {
  it('creates or joins with the typed name and an upper-cased code', () => {
    const actions = { create: vi.fn(), join: vi.fn(), preview: vi.fn() }
    const view = homeView(home, actions)
    view.querySelector<HTMLInputElement>('#code')!.value = ' wxyz '
    click(view, 'Create a room')
    click(view, 'Join')
    expect(actions.create).toHaveBeenCalledWith('Ana')
    expect(actions.join).toHaveBeenCalledWith('Ana', 'WXYZ')
  })

  it('disables both buttons while busy and pre-fills an invite code', () => {
    const view = homeView({ ...home, busy: true, code: 'WXYZ' }, { create: vi.fn(), join: vi.fn(), preview: vi.fn() })
    expect([...view.querySelectorAll('button')].every((b) => b.disabled)).toBe(true)
    expect(view.querySelector<HTMLInputElement>('#code')!.value).toBe('WXYZ')
  })

  it('offers the preview instead while the server is not live', () => {
    const actions = { create: vi.fn(), join: vi.fn(), preview: vi.fn() }
    const view = homeView({ ...home, online: false }, actions)
    expect(view.querySelector('input')).toBeNull()
    expect(view.textContent).toContain('2 to 8 players')
    click(view, 'Open the preview')
    expect(actions.preview).toHaveBeenCalled()
  })
})

describe('playerList', () => {
  it('tags you, the host, and anyone away, plus any extra badge', () => {
    const list = playerList(room(), (p) => (p.id === 'a' ? h('span', { class: 'score' }, '12') : null))
    const items = [...list.querySelectorAll('li')]
    expect(items[0].textContent).toBe('Anayouhost12')
    expect(items[1].className).toBe('away')
    expect(items[1].textContent).toBe('Benaway')
  })
})

describe('lobbyView', () => {
  it('shows the code and head-count, and lets the host start and copy the link', () => {
    const actions = { start: vi.fn(), copyLink: vi.fn() }
    const view = lobbyView(room({ players: [...room().players.slice(0, 1), { id: 'b', name: 'Ben', connected: true, isHost: false }] }), { min: 2, max: 8 }, actions)
    expect(view.querySelector('.room-code')!.textContent).toBe('ABCD')
    expect(view.querySelector('h2')!.textContent).toBe('Players (2/8)')
    click(view, 'Start game')
    click(view, 'Copy invite link')
    expect(actions.start).toHaveBeenCalled()
    expect(actions.copyLink).toHaveBeenCalled()
  })

  it('counts only connected players towards the minimum', () => {
    const view = lobbyView(room(), { min: 2, max: 8 }, { start: vi.fn(), copyLink: vi.fn() })
    expect(view.querySelector<HTMLButtonElement>('.primary')!.disabled).toBe(true)
    expect(view.textContent).toContain('Need at least 2 players.')
  })

  it('tells everyone else to wait for the host', () => {
    const view = lobbyView(room({ youId: 'b' }), { min: 2, max: 8 }, { start: vi.fn(), copyLink: vi.fn() })
    expect(view.textContent).toContain('Waiting for the host')
    expect(view.querySelector('.primary')).toBeNull()
  })
})

describe('previewBar', () => {
  it('shows the first step, switches steps, and exits', () => {
    const show = vi.fn()
    const exit = vi.fn()
    const one = h('p', {}, 'one')
    const two = h('p', {}, 'two')
    const bar = previewBar(
      [
        { label: 'One', render: () => one },
        { label: 'Two', render: () => two },
      ],
      show,
      exit,
    )
    expect(show).toHaveBeenLastCalledWith(one)
    click(bar, 'Two')
    expect(show).toHaveBeenLastCalledWith(two)
    expect([...bar.querySelectorAll('button[aria-pressed]')].map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true'])
    click(bar, 'Exit preview')
    expect(exit).toHaveBeenCalled()
  })

  it('copes with no steps', () => {
    const show = vi.fn()
    previewBar([], show, vi.fn())
    expect(show).not.toHaveBeenCalled()
  })
})

describe('withSampleTimer', () => {
  it('fills a countdown if the screen has one', () => {
    const screen = h('div', {}, h('span', { id: 'timer' }))
    expect(withSampleTimer(screen).querySelector('#timer')!.textContent).toBe('0:42')
    expect(withSampleTimer(h('div'), '1:00').textContent).toBe('')
  })
})

describe('previewBar start step', () => {
  it('opens at the requested step, clamped to the steps there are', () => {
    const show = vi.fn()
    const steps = ['a', 'b', 'c'].map((label) => ({ label, render: () => h('p', {}, label) }))
    previewBar(steps, show, vi.fn(), 2)
    expect(show.mock.lastCall![0].textContent).toBe('c')
    previewBar(steps, show, vi.fn(), 99)
    expect(show.mock.lastCall![0].textContent).toBe('c')
    previewBar(steps, show, vi.fn(), -4)
    expect(show.mock.lastCall![0].textContent).toBe('a')
  })
})
