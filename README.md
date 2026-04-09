# Metamorfosis™ — Wellness App for LATAM Women Entrepreneurs

> Chat-first · Voice-first · Invite-only · Sacred Earth design

A holistic wellness companion for women entrepreneurs in Latin America (18-40). Built on a Rust + TypeScript stack with a multi-model AI agent harness.

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- Rust (optional, for api-gateway)

### 1. Install dependencies

```bash
# Root (React + Vite frontend)
npm install --legacy-peer-deps

# Synthia Gateway (LLM proxy)
cd synthia-gateway-fresh && npm install
```

### 2. Configure environment

```bash
# .env is already set up for local development
# Edit .env to add your ElevenLabs key for voice TTS:
# VITE_ELEVENLABS_API_KEY=your_key
```

### 3. Start services

**Option A: One command (PowerShell)**
```powershell
powershell -ExecutionPolicy Bypass -File start-all.ps1
```

**Option B: Manual**
```bash
# Terminal 1 — LLM proxy (port 3000)
cd synthia-gateway-fresh && node src/index.js

# Terminal 2 — React frontend (port 8080)
npm run dev

# Terminal 3 — Design prototypes (port 4000)  [optional]
cd .superdesign/design_iterations && npx serve -l 4000 .
```

### 4. Open the app
- **React app**: http://localhost:8080
- **Design prototypes**: http://localhost:4000

---

## Architecture

```
Browser (React + TypeScript)
    ↓
src/agent/agent-loop.ts  ← Agent harness (copilot-sdk pattern)
    ↓
src/lib/gateway-client.ts
    ↓
synthia-gateway-fresh/   ← LLM proxy (Express, port 3000)
    ↓
OpenAI / Anthropic / OpenRouter
```

### Services

| Service | Port | Tech | Status |
|---------|------|------|--------|
| React frontend | 8080 | Vite + React 18 + TypeScript | Ready |
| Synthia Gateway | 3000 | Node.js / Express | Ready |
| Rust API Gateway | 3001 | Axum + Tokio | Needs compile |
| Design Prototypes | 4000 | Static HTML | Ready |

---

## Key Directories

```
src/
  agent/          — AI agent loop, tools, encryption
  context/        — LanguageContext (ES/EN), VoiceContext
  pages/          — Chat, Onboarding
  lib/            — GatewayClient

src-rust/
  crates/
    agent-core/   — Rust agent loop (AgentLoop, models, journal, memory)
    api-gateway/  — Axum HTTP server (auth, routes, SSE chat)
    crypto-lib/   — AES-256-GCM + Argon2id
    tools-server/ — Tool registry

synthia-gateway-fresh/  — OpenAI-compatible LLM proxy (BYOK or server keys)

.superdesign/design_iterations/
  metamorfosis_app_1.html       — Main app shell (working)
  metamorfosis_landing_1.html   — Cinematic landing page
  metamorfosis_onboarding_1.html — 6-step onboarding
  theme_1.css                   — Sacred Earth × Editorial Luxury theme
```

---

## Rust Build (Windows)

The Rust crates require a C linker. Options:

**Option A: MinGW (no Visual Studio needed)**
```powershell
scoop install mingw          # or: winget install LLVM.LLVM
rustup target add x86_64-pc-windows-gnu
cd src-rust && cargo build --release
```

**Option B: Visual Studio Developer Command Prompt**
```powershell
# Open "x64 Native Tools Command Prompt for VS 2022", then:
cd src-rust && cargo build --release
```

**Option C: Auto-fix script**
```powershell
cd src-rust && powershell -ExecutionPolicy Bypass -File fix-rust-build.ps1
```

---

## Features

- 🦋 **Chat-first** — AI wellness companion in Spanish/English
- 🎙 **Voice-first** — Whisper STT + ElevenLabs TTS
- 🔒 **Privacy** — AES-256-GCM local encryption, BYOK
- 🧠 **Second Brain** — Notes, journal, AI memory (SQLite FTS5)
- 🥗 **Meal Plans** — LATAM recipes, weekly planning
- 📈 **Progress** — Weight tracker, streaks, insights
- 🌍 **Intel** — Daily global wellness briefings
- 🎫 **Invite-only** — CODE: `META-XXXX-XXXX` format
- 💎 **Free / Premium** tiers with Stripe
- 🔌 **Multi-model** — OpenAI, Anthropic, OpenRouter, Ollama

---

## Welcome to your Lovable project

**URL**: https://lovable.dev/projects/0441337f-7c5d-4693-9fde-1df51c52feb5

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0441337f-7c5d-4693-9fde-1df51c52feb5) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
