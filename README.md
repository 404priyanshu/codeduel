<div align="center">

# ⚔️ CodeDuel

**Real-time collaborative technical interview platform.**

Replace CoderPad. Live code editor · sandboxed execution · video chat — all in the browser.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![AWS CDK](https://img.shields.io/badge/AWS_CDK-2.x-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com/cdk/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [What is CodeDuel?](#-what-is-codeduel)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Roadmap](#-roadmap)
- [Revenue Model](#-revenue-model)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 What is CodeDuel?

CodeDuel is a real-time collaborative technical interview platform where interviewers and candidates share a **live Monaco editor** (VS Code's engine), run code in a **sandboxed environment**, and **video chat** — all in the browser.

**Target market:** Bootcamps, small agencies, and university career centers that can't afford enterprise-grade solutions like CoderPad.

### Key Features

| Feature | Description |
|---|---|
| 🖥️ **Live Collaborative Editor** | Monaco Editor with Yjs CRDT — Google Docs-style real-time sync with automatic conflict resolution |
| ⚡ **Sandboxed Code Execution** | Run JS, Python, Ruby via Lambda (<500ms cold start) and Java, Go, Rust via ECS Fargate — fully isolated, no network access, 256MB RAM cap, 10s timeout |
| 📹 **In-Browser Video Chat** | WebRTC-powered video via Twilio (dev) / Amazon Chime SDK (production) |
| 🔐 **Auth & Sessions** | AWS Cognito — JWTs, social login, zero custom auth code |
| 📊 **Interview Dashboard** | Create sessions, manage problem banks, review past interviews |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│  React 19 · Monaco Editor · Yjs · Tailwind CSS · Vite  │
└──────────────┬──────────────────────┬───────────────────┘
               │ REST / WS            │ WebRTC
               ▼                      ▼
┌──────────────────────────┐  ┌──────────────────────┐
│    API Gateway           │  │  Twilio / Chime SDK  │
│  REST API + WebSocket    │  │  (Video & Audio)     │
└──────────┬───────────────┘  └──────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│                  AWS Lambda                          │
│  Session management · WebSocket handlers · Auth      │
└──────┬────────────────────┬──────────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐  ┌────────────────────────────────────┐
│  DynamoDB    │  │  Code Execution Sandbox            │
│  (Sessions,  │  │  Lambda  → JS, Python, Ruby        │
│   Problems,  │  │  Fargate → Java, Go, Rust          │
│   Users)     │  │  No network · 256MB · 10s timeout  │
└──────────────┘  └────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Redis (ElastiCache)  ·  S3          │
│  Cursor positions,      Replay       │
│  connection IDs,        files        │
│  real-time buffers                   │
└──────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| [React 19](https://react.dev) | UI framework |
| [TypeScript 5.9](https://www.typescriptlang.org) | Type safety |
| [Vite 8](https://vite.dev) | Build tooling & dev server |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | Code editor (VS Code engine) |
| [Yjs](https://yjs.dev) | CRDT for real-time collaborative editing |
| [y-websocket](https://github.com/yjs/y-websocket) | WebSocket transport for Yjs |
| [Tailwind CSS 4](https://tailwindcss.com) | Utility-first CSS |
| [Zustand](https://zustand.docs.pmnd.rs) | Lightweight state management |
| [React Router 7](https://reactrouter.com) | Client-side routing |
| [TanStack Query](https://tanstack.com/query) | Async state & data fetching |
| [Axios](https://axios-http.com) | HTTP client |

### Infrastructure
| Technology | Purpose |
|---|---|
| [AWS CDK 2](https://aws.amazon.com/cdk/) | Infrastructure as Code |
| [AWS Lambda](https://aws.amazon.com/lambda/) | Serverless compute (API + code execution) |
| [API Gateway](https://aws.amazon.com/api-gateway/) | REST & WebSocket APIs |
| [DynamoDB](https://aws.amazon.com/dynamodb/) | Single-table NoSQL database |
| [ElastiCache (Redis)](https://aws.amazon.com/elasticache/) | Real-time ephemeral state |
| [ECS Fargate](https://aws.amazon.com/fargate/) | Container-based code runner (heavy runtimes) |
| [S3](https://aws.amazon.com/s3/) | Session replay storage |
| [Cognito](https://aws.amazon.com/cognito/) | Authentication & user management |
| [Twilio](https://www.twilio.com/video) / [Chime SDK](https://aws.amazon.com/chime/chime-sdk/) | WebRTC video |

---

## 📁 Project Structure

```
codeduel/
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   └── Editor.tsx      # Monaco editor wrapper
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx   # Authentication page
│   │   │   ├── DashboardPage.tsx # Session management
│   │   │   └── SessionPage.tsx # Live interview session
│   │   ├── App.tsx             # Router & app shell
│   │   ├── main.tsx            # Entry point
│   │   ├── index.css           # Global styles
│   │   └── App.css             # App-level styles
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── infrastructure/             # AWS CDK IaC
│   ├── bin/                    # CDK app entry point
│   ├── lib/
│   │   └── infrastructure-stack.ts  # Main stack definition
│   ├── test/                   # Stack tests
│   ├── cdk.json
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **AWS CLI** configured (for infrastructure)
- **AWS CDK CLI** (`npm i -g aws-cdk`)

### Frontend

```bash
# Install dependencies
cd frontend
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Infrastructure

```bash
# Install dependencies
cd infrastructure
npm install

# Synthesize CloudFormation template
npx cdk synth

# Deploy to AWS (requires configured credentials)
npx cdk deploy
```

---

## 🗺 Roadmap

| Week | Focus | Status |
|:---:|---|---|
| **1–2** | CDK infra, Cognito auth, DynamoDB schema, React shell, Monaco editor | 🟡 In Progress |
| **3** | WebSocket API, Yjs collaborative sync, cursor presence | ⬜ Planned |
| **4** | Sandboxed Lambda/Fargate code runner | ⬜ Planned |
| **5–6** | Chime SDK video, problem bank, dashboard, deploy | ⬜ Planned |

---

## 💰 Revenue Model

Targeting the underserved mid-market — bootcamps and agencies priced out of enterprise solutions.

| Tier | Price | Includes |
|---|---|---|
| **Free** | ₹0/mo | 5 sessions/month, JS only |
| **Pro** | ₹999/mo | 50 sessions, all languages |
| **Agency** | ₹2,499/mo | 100 sessions, all languages, video, analytics |
| **Enterprise** | Custom | Unlimited, SSO, dedicated support |

---

## 🤝 Contributing

This project is in early development. Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with ☕ and ambition.**

</div>
