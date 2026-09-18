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

// Swaps a container's content without dropping the player's place: if the focused element (a
// kept answer box, say) is still in the new content, it gets focus and its cursor back.
export function replaceKeepingFocus(container: HTMLElement, ...content: Node[]): void {
  const active = document.activeElement
  const input = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null
  const selection = input ? [input.selectionStart, input.selectionEnd] : null
  container.replaceChildren(...content)
  if (!(active instanceof HTMLElement) || active === document.body || !container.contains(active)) return
  active.focus()
  if (input && selection) input.setSelectionRange(selection[0], selection[1])
}
