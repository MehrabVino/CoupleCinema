# Together Space Developer Guide

## 1. Monorepo layout

This repository uses npm workspaces:

- root: Next.js frontend
- `server/`: Fastify + Socket.IO backend

Key areas:

- `app/`: route-level pages and root layout
- `components/`: module UIs and controller hooks
- `lib/client/*`: frontend layered architecture (repositories/services/adapters)
- `server/src/*`: backend MVC + realtime room managers

## 2. Development prerequisites

- Node.js 20+ (22 recommended)
- npm 10+
- Browser with WebRTC support

Optional:

- Docker + Docker Compose for self-hosting

## 3. Local setup

1. `npm install`
2. copy `.env.example` to `.env`
3. `npm run dev`

Web: `http://localhost:3000`  
API: `http://localhost:4000`

## 4. Scripts

Root scripts:

- `npm run dev` - run frontend + backend
- `npm run build` - next build + server build placeholder
- `npm run start` - production starts
- `npm run selfhost` - docker compose up
- `npm run selfhost:stop` - docker compose down

Server scripts:

- `npm run dev --workspace server`
- `npm run start --workspace server`

## 5. Frontend architecture details

### 5.1 Layered client design

The frontend intentionally separates concerns:

- Repositories: HTTP request transport and endpoint calls
- Services: use-case/business composition
- Adapters: realtime/socket integration
- Components/hooks: UI state and orchestration

Composition happens in:

- `lib/client/factories/createClientServices.js`

### 5.2 UI composition

- `app/layout.jsx` provides app shell and session gate
- `components/layout/AppChrome.jsx` provides global header/navigation
- module pages (`app/chat`, `app/meet`, `app/files`, `app/cinema`) mount module apps

## 6. Backend architecture details

Request flow:

1. route receives request
2. controller validates/parses input
3. service executes use-case
4. repository accesses DB/filesystem
5. response returned through controller

Realtime flow:

1. client emits socket event
2. `socketServer.js` validates room/user context
3. room manager updates in-memory room state
4. server emits updates/signals to room peers

## 7. Realtime modules

### Chat realtime

- typing status
- message CRUD
- reactions
- presence updates

### Meet realtime

- room join/leave
- media state updates
- WebRTC signaling (`offer`/`answer`/`candidate`)
- emoji events

### Watch realtime

- room join/leave
- playback state sync
- room chat
- WebRTC voice signaling/state

## 8. Data and storage

- chat/auth data: SQLite (`better-sqlite3`)
- drive files: repository-managed local storage paths
- realtime room state: in-memory maps

## 9. API evolution guidelines

- preserve existing endpoint/event names unless absolutely necessary
- document all API/event changes in `docs/API_AND_EVENTS.md`
- keep payloads backward-compatible where possible
- validate inputs before service/repository boundary

## 10. Coding conventions

- keep components and hooks focused
- avoid large implicit side effects
- prefer explicit, named functions
- keep room manager logic deterministic and testable
- use short but clear identifiers for events and DTO fields

## 11. Manual test matrix (minimum)

Before merging feature changes, verify:

- auth register/login/confirm
- chat send/edit/delete/reaction
- meet join with 2 browsers
- files upload/download/rename/delete
- watch sync play/pause/seek
- watch voice join/mute with 2 browsers

## 12. Common pitfalls

- local PowerShell policy can block npm scripts; run via `cmd /c` if needed
- WebRTC requires microphone/camera permissions in browser
- wrong `CLIENT_ORIGIN` can break socket connectivity

## 13. Release recommendations

- tag semantic versions
- update docs with user-visible changes
- include migration notes if API/events changed
