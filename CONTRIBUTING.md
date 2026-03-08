# Contributing to Together Space

Thanks for improving Together Space.

## Scope of contributions

We accept:

- bug fixes
- UX improvements
- performance and reliability changes
- new features aligned with the collaboration platform scope
- documentation and onboarding improvements

## First-time setup

1. Fork and clone the repository.
2. Create `.env` from `.env.example`.
3. Install deps: `npm install`
4. Run app: `npm run dev`

## Branch strategy

- Branch naming examples:
  - `fix/chat-scroll-bottom`
  - `feat/watch-voice-indicator`
  - `docs/api-events-update`

## Development guidelines

- Keep changes focused and small.
- Prefer composition over tightly-coupled code.
- Preserve existing architecture boundaries:
  - frontend: `components` + `lib/client/*`
  - backend: `routes -> controllers -> services -> repositories`
- Avoid mixing refactor and feature work in one PR unless required.
- Update docs when behavior or API/events change.

## Pull request checklist

- [ ] Feature/fix works locally
- [ ] No obvious regressions in chat/meet/files/watch flows
- [ ] Docs updated (README/docs files) if applicable
- [ ] PR description includes:
  - what changed
  - why it changed
  - how to test manually
  - screenshots (for UI changes)

## Commit style

Conventional commit style is recommended:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `chore: ...`

## Reporting bugs

Please include:

- expected behavior
- actual behavior
- reproduction steps
- environment (`OS`, browser, node version)
- logs/screenshots if possible

## Feature requests

When proposing a feature, include:

- user problem
- proposed UX/API behavior
- tradeoffs and alternatives

## Code of conduct

By contributing, you agree to follow `CODE_OF_CONDUCT.md`.
