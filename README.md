# CoupleCinema

Realtime watch-party app for 2-4 users:
- Host creates a session and uploads a video
- Participants join with a short code
- Host controls synced playback for everyone
- Users can chat, share images, and communicate via webcam/audio (WebRTC)
- Includes a separate P2P encrypted chat page that works if the main server is down (uses public PeerJS relay)

## Stack

- Web: Next.js + React + TypeScript
- Server: Express + Socket.IO + TypeScript
- Database: PostgreSQL + Prisma
- Infra: PostgreSQL, Redis, Coturn (TURN server)

## Project Structure

```txt
apps/
  server/   # API + Socket.IO + Prisma
  web/      # Next.js client
```

## 1) Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+
- Redis 7+
- Coturn (TURN server)

## 2) Start Infra (Local)

Start your local services:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Coturn on `localhost:3478`

## 3) Environment

Create `.env` in project root:

```env
PORT=4000
WEB_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/couplecinema?schema=public
MAX_VIDEO_MB=2048
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

## 4) Install + Database

```bash
npm install
npm run db:generate
npm run db:migrate -- --name init
```

## 5) Run Dev

```bash
npm run dev
```

- Web app: `http://localhost:3000`
- API/Socket server: `http://localhost:4000`

## 6) Test Flow (Watch Party)

1. Open app in browser window A, create session, upload a video.
2. Copy session code.
3. Open window B (or another device), join with the code.
4. Grant camera/microphone permissions.
5. Verify:
   - video playback sync
   - text chat
   - image sharing
   - live webcam/audio

## 7) P2P Encrypted Chat (Server-Down Friendly)

- Route: `http://localhost:3000/p2p-chat`
- Create a room, copy the invite link, and open it from another device/browser.
- Messages are end-to-end encrypted with AES-GCM and stored locally in the browser.
- Signaling uses the public PeerJS relay; if that relay is down, peers cannot connect.

## 8) Production Publish Checklist

1. Use strong TURN credentials (Coturn).
2. Run app behind HTTPS (required for reliable WebRTC on non-localhost).
3. Set CORS and env values for your real domain.
4. Use object storage/CDN for video and image assets (S3-compatible).
5. Add auth/invite controls before public release.
6. Add rate limits and upload size limits based on your infra budget.

## 9) Deploy (Vercel for Web)

Vercel hosts the Next.js web app. The Express server must be deployed separately
(Render/Fly/Railway/your VPS) because it runs Socket.IO + uploads.

Vercel steps:

1. Create a new Vercel project from the repo.
2. Set Root Directory to `apps/web`.
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL=https://api.your-domain.com`
   - `NEXT_PUBLIC_WS_URL=https://api.your-domain.com`
4. Deploy.

Server environment example:

```env
WEB_ORIGIN=https://your-frontend-domain.com
PORT=4000
DATABASE_URL=postgresql://USER:PASS@HOST:5432/couplecinema?schema=public
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WS_URL=https://api.your-domain.com
TURN_REALM=your-domain.com
TURN_USER=turnuser
TURN_PASSWORD=turnpassword
```

## Notes

- Room size is enforced at maximum 4 live connections.
- Playback controls are host-only.
- Uploaded media is stored in `apps/server/uploads` in this scaffold.
- Large uploads are limited by `MAX_VIDEO_MB` and by your hosting provider's max request size.
