// Where the room server lives, and whether it is live at all. Until it is deployed, pages show a
// preview of their screens instead of letting players create or join rooms that go nowhere.
export const ROOMS_API: string = import.meta.env.VITE_ROOMS_URL ?? 'https://rooms.sbdevworks.com'
export const ONLINE: boolean = import.meta.env.VITE_ROOMS_ONLINE === 'true'
