# CodeDuel

CodeDuel is a room-based collaborative coding app for technical interviews and pair-programming. It gives authenticated users a shared Monaco editor, fast real-time sync, and simple session links so two people can work in the same editor at the same time.

## What works today

- Email sign up and sign in with Amazon Cognito
- Optional Google sign-in through Cognito Hosted UI
- Protected dashboard for creating or joining interview rooms
- Shared Monaco editor powered by Yjs CRDT sync
- Synchronized language selection across connected editors
- Dedicated collaboration server with reconnect handling, persistence, and health checks

## Repository layout

```text
codeduel/
├── frontend/        React + Vite application
├── collab-server/   Dedicated Yjs websocket server used by the live editor
├── infrastructure/  AWS CDK stack for Cognito and supporting backend resources
└── docs/            Project documentation and technical report
```

The active real-time editor path is `frontend/` + `collab-server/`.
The AWS WebSocket handlers inside `infrastructure/` are still in the repo, but they are not the current live editor transport.

## Quick start

### 1. Start the collaboration server

```bash
cd collab-server
npm install
npm start
```

By default it runs on `ws://localhost:1234`.

Useful endpoints:

- Health: `http://localhost:1234/healthz`
- Readiness: `http://localhost:1234/readyz`

The server stores room snapshots in `collab-server/data/` unless you use:

```bash
npm run start:memory
```

### 2. Start the frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:5173`.

The default `.env.example` points the editor at the local collaboration server:

```bash
VITE_COLLAB_WS_URL=ws://localhost:1234
```

## Custom auth and Google sign-in

If you want to use your own Cognito setup instead of the default local values, set the frontend variables in `frontend/.env.local`:

```bash
VITE_USER_POOL_ID=
VITE_USER_POOL_CLIENT_ID=
VITE_COGNITO_DOMAIN=
VITE_AUTH_REDIRECT_SIGN_IN=http://localhost:5173/login
VITE_AUTH_REDIRECT_SIGN_OUT=http://localhost:5173/
```

To provision Google sign-in in the CDK stack, export these before `cd infrastructure && npx cdk deploy`:

```bash
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret
export COGNITO_DOMAIN_PREFIX=your-cognito-domain-prefix
export AUTH_CALLBACK_URLS=http://localhost:5173/login
export AUTH_LOGOUT_URLS=http://localhost:5173/
```

## Technical documentation

For a detailed explanation of how the project works internally, including the frontend, Yjs collaboration flow, Cognito auth, AWS CDK resources, legacy pieces still in the repo, and dependency rationale, see:

- `docs/TECHNICAL_REPORT.md`

## Current scope

This repository currently delivers the authenticated collaborative editor experience.
Some features mentioned in the product vision, such as code execution, video calling, analytics, and problem-bank workflows, are not yet implemented end-to-end in the running app.
