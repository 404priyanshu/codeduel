# CodeDuel

CodeDuel is a room-based collaborative coding app for technical interviews and pair-programming. It gives authenticated users a shared Monaco editor, fast real-time sync, and simple session links so two people can work in the same editor at the same time.

## What works today

- Email sign up and sign in with Amazon Cognito
- Optional Google sign-in through Cognito Hosted UI
- Protected dashboard for creating or joining interview rooms
- Server-backed room creation, join authorization, and signed room access tokens
- Shared Monaco editor powered by Yjs CRDT sync
- Synchronized language selection across connected editors
- Dedicated collaboration server with reconnect handling, persistence, health/readiness probes, and collaboration presence

## Repository layout

```text
codeduel/
├── frontend/        React + Vite application
├── collab-server/   Dedicated Yjs websocket server used by the live editor
├── infrastructure/  AWS CDK stack for Cognito auth resources
└── docs/            Project documentation and technical report
```

The active real-time editor path is `frontend/` + `collab-server/`.

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

## Production collab server

The collaboration server is ready for single-instance production deployments. It now includes:

- explicit room-token secret validation in production
- origin allowlists for HTTP and websocket traffic
- graceful shutdown and readiness draining
- periodic expired-room cleanup
- container packaging for deployment

Use the collab server env template as your starting point:

```bash
cd collab-server
cp .env.example .env
```

Important production settings:

- `NODE_ENV=production`
- `ROOM_TOKEN_SECRET` set to a long random secret
- `CORS_ALLOW_ORIGINS` set to your exact frontend origin or origins
- `COGNITO_USER_POOL_ID` and `COGNITO_USER_POOL_CLIENT_ID` matching the frontend
- `YDOCS_DIR` backed by durable storage if you want room recovery across restarts

### Docker example

```bash
cd collab-server
docker build -t codeduel-collab-server .
docker run --rm \
  -p 1234:1234 \
  --env-file .env \
  -v "$(pwd)/data:/data" \
  codeduel-collab-server
```

The container exposes:

- `GET /healthz` for liveness
- `GET /readyz` for readiness and draining during shutdown

Current scaling note:

- one instance works well with local or mounted persistence
- multiple instances still require sticky sessions or shared persistence/pub-sub to keep room state consistent

## Custom auth and Google sign-in

If you want to use your own Cognito setup instead of the default local values, set the frontend variables in `frontend/.env.local`:

```bash
VITE_USER_POOL_ID=
VITE_USER_POOL_CLIENT_ID=
VITE_COGNITO_DOMAIN=
VITE_AUTH_REDIRECT_SIGN_IN=http://localhost:5173/login
VITE_AUTH_REDIRECT_SIGN_OUT=http://localhost:5173/
```

If you use custom Cognito values, give the same pool/client to the collaboration server so it can verify room API requests and websocket access:

```bash
cd collab-server
COGNITO_USER_POOL_ID=your-user-pool-id \
COGNITO_USER_POOL_CLIENT_ID=your-user-pool-client-id \
NODE_ENV=production \
HOST=0.0.0.0 \
PORT=1234 \
CORS_ALLOW_ORIGINS=https://your-frontend.example.com \
ROOM_TOKEN_SECRET=replace-this-in-production \
npm start
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

For a detailed explanation of how the project works internally, including the frontend, Yjs collaboration flow, room authorization model, Cognito auth, AWS CDK resources, and dependency rationale, see:

- `docs/TECHNICAL_REPORT.md`

## Current scope

This repository currently delivers the authenticated collaborative editor experience.
Some features mentioned in the product vision, such as code execution, video calling, analytics, and problem-bank workflows, are not yet implemented end-to-end in the running app.
