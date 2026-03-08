# Together Space Architecture

## 1. Architecture goals

- Clear separation of concerns
- Fast feature iteration with low coupling
- Realtime collaboration support
- Easy onboarding for open-source contributors

## 2. System overview

Together Space uses a client-server architecture:

- Client: Next.js SPA-style app router frontend
- Server: Fastify REST API + Socket.IO realtime gateway
- Data: SQLite + file storage + in-memory room state

## 3. Frontend architecture

### 3.1 Layers

1. UI layer (`app/`, `components/`)
2. Application services (`lib/client/services/`)
3. Repositories (`lib/client/repositories/`)
4. Adapters (`lib/client/adapters/`)

### 3.2 Dependency direction

UI -> Service -> Repository -> HTTP Client

Realtime follows:

UI/Controller -> Socket Adapter -> Socket.IO server

### 3.3 Session boundary

`AppSessionProvider` centralizes:

- user state
- login/register/confirm/logout
- token-based API usage

## 4. Backend architecture

### 4.1 MVC and service-repository pattern

- routes: endpoint maps
- controllers: HTTP-specific input/output handling
- services: business rules
- repositories: persistence

### 4.2 Realtime sub-architecture

Socket server delegates state logic to room managers:

- `meetRoomManager`
- `cinemaRoomManager`

This keeps event handlers thin and focused on transport-level concerns.

## 5. Module architecture

## 5.1 Chat

- HTTP endpoints for loading chats/messages/members and metadata updates
- Socket events for realtime typing/messages/reactions/presence

## 5.2 Meet

- room membership and media flags in memory
- peer-to-peer media via WebRTC
- server only handles signaling and participant metadata

## 5.3 Files

- REST-first module
- user-scoped folder/file operations
- share token download path

## 5.4 Watch

- server-synced playback state
- room chat broadcast
- optional WebRTC voice channel with signaling relay

## 6. Security model (high level)

- JWT authentication for protected API routes and sockets
- room-scoped checks for realtime signaling
- server-side input validation and coercion
- CORS and origin controls through environment config

## 7. Scalability considerations

Current design assumptions:

- single backend instance for in-memory room state
- SQLite for simple deployment and local-first usage

To scale further:

- move room state to shared broker/store (Redis)
- move DB to managed relational store
- add horizontal socket session strategy

## 8. Tradeoffs

- In-memory room managers simplify implementation but reduce horizontal scalability.
- SQLite is easy for setup and demos but limited for very high concurrency.
- WebRTC P2P keeps infra simple but can degrade with many peers and restrictive networks.

## 9. Design principles in this codebase

- SRP: controllers/services/repositories each hold single concern
- DIP: service composition via factories and adapters
- Encapsulation: room manager state hidden behind explicit APIs
- Pragmatism: minimal abstractions that still support extension

## 10. Future architecture roadmap (recommended)

- add automated tests for realtime flows
- add API/event schemas shared between frontend and backend
- add structured logging and observability
- add role-based permission model for collaboration features
