import type { BaseRoomView } from './protocol'

export type Child = Node | string | null | false | undefined

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<Record<string, string>> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) if (value !== undefined) el.setAttribute(key, value)
  for (const child of children) if (child) el.append(child)
  return el
}

export function button(label: string, onClick: () => void, className = ''): HTMLButtonElement {
  const el = h('button', { type: 'button', class: className }, label)
  el.addEventListener('click', onClick)
  return el
}

export function nameOf(room: BaseRoomView, id: string): string {
  return room.players.find((p) => p.id === id)?.name ?? 'Someone'
}

export function isHost(room: BaseRoomView): boolean {
  return room.players.some((p) => p.id === room.youId && p.isHost)
}

export function formatSeconds(msLeft: number): string {
  const seconds = Math.max(0, Math.ceil(msLeft / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
