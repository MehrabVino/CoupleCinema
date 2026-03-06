# CoupleCinema Platform

Minimal, responsive platform with a Next.js frontend and Fastify + Socket.IO API.

## Stack

- Frontend: Next.js (App Router), React 19
- API: Fastify + Socket.IO
- Database: SQLite (`better-sqlite3`)
- Auth: JWT

## Modules

- Open Chat: current realtime chat app
- Open Meet: Jitsi Meet launcher
- Open File Sharing: PairDrop launcher
- Couple Cinema: Syncplay launcher

## Local Development

1. `npm run setup`
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:3000`

API health: `http://localhost:4000/api/health`

## Docker

1. `npm run selfhost`
2. Open `http://localhost:3000`
3. Stop with `npm run selfhost:stop`

## Environment

Copy `.env.example` to `.env` and adjust:

- `PORT` default: `4000`
- `CLIENT_ORIGIN` default: `http://localhost:3000`
- `JWT_SECRET` strong random value
- `NEXT_PUBLIC_API_URL` default: `http://localhost:4000`
- `NEXT_PUBLIC_SOCKET_URL` default: `http://localhost:4000`

## License

MIT
