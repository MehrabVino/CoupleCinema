# Together Space

Together Space is an open-source collaboration platform that combines:

- real-time chat (groups, channels, private messages, reactions, attachments)
- video meeting rooms (up to 8 users)
- personal file sharing/drive
- synchronized watch rooms with room chat and voice

The repository is structured for maintainability and onboarding: layered frontend services, MVC-style backend, and isolated realtime room managers.

## Why this project exists

Most teams switch between many tools to chat, call, share files, and watch content together. Together Space provides one developer-friendly platform where those flows live in one app and one auth/session model.

## Main features

- Unified authentication and session flow
- Global app shell with shared navigation and profile controls
- Chat module with:
  - channels/groups/PV
  - emoji reactions
  - attachment messages (image/video/file)
  - saved messages
- Meet module with:
  - realtime room presence
  - WebRTC media + signaling
  - emoji bursts
  - max 8 participants per room
- Files module with:
  - folder creation
  - upload/download
  - rename/delete
  - share tokens
- Watch module with:
  - synced playback state (URL/time/play-pause)
  - room chat
  - local video loading
  - voice channel (WebRTC audio)
  - max 8 participants per room

## Quick start (local)

1. Copy env file:
   - `cp .env.example .env` (Linux/macOS)
   - `copy .env.example .env` (Windows)
2. Install dependencies:
   - `npm install`
3. Run both frontend and backend:
   - `npm run dev`
4. Open:
   - web: `http://localhost:3000`
   - health: `http://localhost:4000/api/health`

## Docker

- Start: `npm run selfhost`
- Stop: `npm run selfhost:stop`

## Project structure

### Frontend

- `app/`: Next.js App Router pages/layout
- `components/`: module UIs + controller hooks
- `lib/client/repositories/`: API adapters
- `lib/client/services/`: business logic layer
- `lib/client/adapters/`: transport adapters (Socket.IO)
- `lib/client/factories/createClientServices.js`: dependency composition root

### Backend

- `server/src/routes/`: HTTP route definitions
- `server/src/controllers/`: controller handlers
- `server/src/services/`: application services
- `server/src/repositories/`: data access layer
- `server/src/realtime/`: room managers + Socket.IO handlers
- `server/src/app.js`: app assembly/composition
- `server/src/server.js`: process bootstrap

## Documentation map

- User guide: `docs/USER_GUIDE.md`
- Developer setup and workflow: `docs/DEVELOPER_GUIDE.md`
- Architecture and design decisions: `docs/ARCHITECTURE.md`
- HTTP + realtime reference: `docs/API_AND_EVENTS.md`
- Open-source contribution process: `CONTRIBUTING.md`
- Security reporting: `SECURITY.md`
- Community rules: `CODE_OF_CONDUCT.md`

## Environment variables

See `.env.example` for defaults:

- `PORT`
- `CLIENT_ORIGIN`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Open-source expectations

- Small, reviewable PRs
- Clear commit messages and test notes
- Backward-compatible API/realtime changes where possible
- Documentation update in same PR for behavior changes

## License

MIT (see `LICENSE`).
