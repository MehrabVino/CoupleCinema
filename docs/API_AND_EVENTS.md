# API and Realtime Events Reference

## Base URLs

- API base: `/api`
- Socket namespace: default namespace on same host

## Authentication

Protected routes require JWT auth (`preHandler: app.auth`).
Socket connection requires `auth.token`.

---

## REST API

## Health

- `GET /api/health`
  - auth: no
  - response: `{ ok: true }`

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/confirm-email`
- `POST /api/auth/resend-confirm`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## User

- `GET /api/me` (auth)
- `PATCH /api/me/profile` (auth)
- `GET /api/users/search` (auth)

## Chat

- `GET /api/chats` (auth)
- `POST /api/chats/pv/start` (auth)
- `POST /api/chats` (auth)
- `POST /api/chats/:chatId/join` (auth)
- `POST /api/chats/public/:publicId/join` (auth)
- `POST /api/chats/join-public` (auth)
- `PATCH /api/chats/:chatId/public-id` (auth)
- `PATCH /api/chats/:chatId/name` (auth)
- `GET /api/chats/:chatId/members` (auth)
- `PATCH /api/chats/:chatId/members/:memberId/access` (auth)
- `GET /api/chats/:chatId/messages` (auth)

## Drive

- `GET /api/drive/items` (auth)
- `POST /api/drive/folders` (auth)
- `POST /api/drive/upload` (auth)
- `PATCH /api/drive/items/rename` (auth)
- `DELETE /api/drive/items` (auth)
- `GET /api/drive/download` (auth)
- `POST /api/drive/share` (auth)
- `GET /api/drive/shared/:token` (public)

---

## Socket events

## Presence and chat

Client emits:

- `chat:join` `{ chatId }`
- `typing:set` `{ chatId, isTyping }`
- `message:send` `{ chatId, content }`
- `message:edit` `{ messageId, content }`
- `message:delete` `{ messageId }`
- `reaction:toggle` `{ messageId, emoji, chatId }`

Server emits:

- `presence:update` `{ onlineUsers }`
- `typing:update` `{ chatId, userId, username, isTyping }`
- `message:new` `message`
- `message:updated` `message`
- `message:deleted` `{ id, chat_id }`
- `reaction:updated` `{ message_id, reactions, my_reactions }`

## Meet events

Client emits:

- `meet:join` `{ roomId }` + ack
- `meet:leave`
- `meet:media-state` `{ audioEnabled?, videoEnabled? }`
- `meet:signal` `{ toPeerId, data }`
- `meet:emoji` `{ emoji }`

Server emits:

- `meet:error` `{ error }`
- `meet:user-joined` `{ participant }`
- `meet:user-left` `{ peerId, userId }`
- `meet:user-updated` `{ participant }`
- `meet:signal` `{ fromPeerId, fromUserId, fromUsername, data }`
- `meet:emoji` `{ emoji, userId, username, id }`

## Watch (cinema) events

Client emits:

- `cinema:join` `{ roomId }` + ack
- `cinema:leave`
- `cinema:state:set` `{ videoUrl?, paused?, currentTime? }`
- `cinema:chat:send` `{ content }`
- `cinema:voice-state` `{ audioEnabled }`
- `cinema:signal` `{ toPeerId, data }`

Server emits:

- `cinema:error` `{ error }`
- `cinema:user-joined` `{ participant }`
- `cinema:user-left` `{ peerId, userId }`
- `cinema:user-updated` `{ participant }`
- `cinema:state:update` `{ state, actor }`
- `cinema:chat:new` `message`
- `cinema:signal` `{ fromPeerId, fromUserId, fromUsername, data }`

---

## Realtime payload notes

- `data` in signal events contains WebRTC signaling payload:
  - `{ type: "offer", sdp }`
  - `{ type: "answer", sdp }`
  - `{ type: "candidate", candidate }`

## Error codes observed

- `room_full`
- `invalid_room`
- generic join/connect failures returned by ack `ok: false`

## Compatibility guidance

- Keep event names stable.
- Add new optional fields instead of replacing required ones.
- Version-breaking changes should include migration notes in docs and PR.
