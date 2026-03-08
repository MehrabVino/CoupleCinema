# Together Space User Guide

## 1. What is Together Space?

Together Space is a multi-tool collaboration app with one login and four built-in modules:

- Chat
- Meet
- File Sharing
- Watch Together

It is designed for small teams, communities, and friend groups that need realtime communication and media collaboration in one place.

## 2. Sign in and account flow

1. Open the app in your browser.
2. Create an account with email, username, and password.
3. Confirm your email with verification code.
4. Sign in.

After authentication, you can access all modules from the top navigation.

## 3. Global navigation and header

The main header is available across pages and provides:

- route switching between apps
- dark/light mode toggle
- user profile summary menu
- logout
- Contact Together panel

Tip: click outside submenus or press `Esc` to close open menus.

## 4. Chat module

### 4.1 Chat types

- `PV`: private 1:1 chat
- `Group`: multi-user discussion
- `Channel`: broadcast-like stream

### 4.2 Chat actions

- create or join chats by public ID
- search chats and messages
- send text, emoji, and files
- react to messages
- edit/delete your own messages
- save messages

### 4.3 Attachments

Supported in chat messages:

- images
- videos
- generic files (downloadable)

Attachment size limit is controlled by server-side realtime validation.

## 5. Meet module

### 5.1 Room model

- create/join by room code
- maximum 8 users per room
- live participant tiles

### 5.2 Controls

- microphone toggle
- camera toggle
- leave room
- quick emoji reactions

## 6. File Sharing module

### 6.1 Drive features

- create folders
- upload files
- rename items
- delete items
- download files
- generate share links/tokens

### 6.2 Notes

- organization is path-based
- file operations are scoped per authenticated user context

## 7. Watch Together module

### 7.1 Core capabilities

- create/join room by code
- load remote video URL
- load local device video
- synchronized play/pause/seek
- room chat
- voice channel (join voice/mute voice)

### 7.2 Voice

- click `Join Voice` to enable microphone
- click `Mute Voice` to disable microphone stream
- participant list shows voice state where available

## 8. Dark mode

Dark mode is available globally and persisted in local storage.

If you notice contrast issues, report them with page name and screenshot in an issue.

## 9. Troubleshooting

### Camera/microphone denied

- check browser permissions for site
- re-enable media permissions and reload

### Cannot join room

- verify room code
- ensure room is not full (max 8 users)

### Realtime not updating

- verify API and socket URLs in `.env`
- check server process and browser console

## 10. Privacy and security basics

- use strong passwords
- avoid sharing sensitive files through temporary links without controls
- sign out on shared devices
