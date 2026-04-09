# 🚀 MASTER SOP: Bulletproof Full-Stack JS/TS App Lifecycle

## 0. Mission & Principles

- **Mission:** Deliver production-grade, mobile-first, luxury-quality apps with zero tolerance for drift, errors, or bloat.
- **Single Source of Truth:** The latest PRD (Product Requirements Document) in `docs/PRD.yaml`. If missing, create it from chat or stakeholder input.
- **Zero Drift:** After every phase, typecheck, lint, test, and build. Fix all issues before advancing.
- **Security:** Never expose secrets. Use `.env.example` for templates.
- **No Bloat:** Remove dead/duplicate assets. No file >100 MB.
- **Documentation:** All results, logs, and reports go in `./.reports/` and are committed with signed, descriptive messages.

---

## 1. Project Initialization

- **Monorepo Structure:** Use a monorepo for shared packages/components.
- **Backend:**  
  - Create backend for all backend code/config.
  - Add package.json with scripts for install, build, start, and test.
  - Add `.env.example` and README.md with setup/deployment instructions.
- **Frontend:**  
  - Use Next.js 14 (App Router), React 18+, TypeScript, TailwindCSS, shadcn/ui, GSAP, Framer Motion, Lucide Icons, etc.
  - Add package.json, `.env.example`, and README.md.
- **.gitignore:** Exclude node_modules, `.env`, build outputs, and sensitive files.

---

## 2. Version Control & Branching

- **GitHub Setup:**  
  - Push all code (except secrets/build artifacts) to GitHub.
  - Enable GitHub Actions for CI (install, lint, test, build).
- **Branching:**  
  - Use feature branch workflow.
  - Enforce conventional commits and semantic versioning.
  - After merging, delete feature branches if no longer needed.

---

## 3. Merge Conflict Resolution

1. **Check for Conflicts:**  
   - Run `git status` and `git diff` to identify all files with conflicts.
   - List each conflicted file and the nature of the conflict.

2. **Resolve Each Conflict:**  
   - Open each conflicted file.
   - Review both sides (`<<<<<<<`, `=======`, `>>>>>>>`).
   - Decide which changes to keep or merge.
   - Remove all conflict markers and save.

3. **Document Each Resolution:**  
   - For each conflict, bullet-point:
     - File name.
     - Type of conflict (code, config, dependency).
     - Resolution decision (what was kept/merged and why).

4. **Test the Codebase:**  
   - Run `npm install` and `npm test` in both backend and frontend.
   - Run `npx eslint . --fix` in both.
   - Document and fix any errors/warnings before proceeding.

5. **Finalize the Merge:**  
   - Stage all resolved files: `git add .`
   - Commit:  
     `git commit -m "Resolve all merge conflicts, document resolutions, and ensure clean deploy"`
   - Push: `git push`

---

## 4. Stack & Architecture

- **Frontend:**  
  - Next.js 14, React 18+, TypeScript, TailwindCSS, shadcn/ui, Zustand/Jotai, TanStack Query, GSAP, Framer Motion, next-i18next, Zod, Lucide Icons.
- **Backend & API:**  
  - Node.js, Next.js API Routes, Prisma, PostgreSQL, Redis, BullMQ.
- **Authentication & Security:**  
  - Clerk, Helmet.js, rate limiting, OWASP ZAP, CSP.
- **Payments & Integrations:**  
  - Stripe, Vapi, Grok.
- **DevOps & Infrastructure:**  
  - Vercel (frontend), Railway/Coolify (backend/db), Docker, GitHub Actions, Terraform, Renovate, Semantic Release.
- **Monitoring & QA:**  
  - Sentry, Vercel Analytics, LogSnag/Better Stack, Lighthouse CI, Jest, React Testing Library, Cypress, Storybook, ESLint, Prettier, Husky, Lint-staged.
- **Docs & Collaboration:**  
  - Swagger/OpenAPI, TSDoc, Notion/Confluence.
- **Additional Services:**  
  - Cloudinary/AWS S3, Algolia/Elasticsearch, Socket.io/Ably, Vercel KV/Blob/Cron.

---

## 5. Deployment Automation

- **Backend (Railway):**  
  - Ensure Node.js deploy (not Docker unless required).
  - Use `npm install --legacy-peer-deps` and `npm start`.
  - Document backend as Railway root.
  - Provide CLI and web UI deployment instructions, including token-based CLI login.
- **Frontend (Vercel):**  
  - Deploy via GitHub integration or deploy hooks.
- **One-Command Deploy:**  
  - Provide a script (e.g., `deploy-all.ps1`) to:
    - Build, test, and push code to GitHub.
    - Trigger Railway deployment (CLI or web UI fallback).
    - Update Kanban/tracking system.

---

## 6. Testing, Verification, and Acceptance

- **After every change:**  
  - Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
  - Fix all issues before advancing.
- **Acceptance Criteria:**  
  - All tests pass, builds succeed, and acceptance bullets in PRD are met.
  - No console errors, dead links, or unhandled warnings.
  - Security headers and anti-crawl in non-prod.
  - Lighthouse mobile targets: Perf ≥90, A11y ≥95, Best-Practices ≥95, SEO ≥95.
  - Repo clean; no >100 MB assets.

---

## 7. Documentation & Handoff

- **.env.local.example:** All required keys from PRD.
- **README.md:** Local dev, Railway, Vercel, troubleshooting.
- **CHANGELOG.md:** Summarize changes, removed bloat, and final structure.
- **.reports/:** Recon, lighthouse, test logs, etc.
- **Push to GitHub:** Production-ready, with all docs and artifacts.

---

## 8. Final Deliverables & After-Action Report

- **Deliverables:**  
  - Production-ready repo on GitHub.
  - `docs/PRD.yaml`, `.reports/*`, Prisma schema/migrations/seed, README, env template, CHANGELOG.
- **After-Action Report:**  
  - List: repo URL, commit SHA, preview URL (if any), and verification of every acceptance bullet.

---

**Use this SOP for every project and deployment. Do not proceed to production until every step is complete, tested, and documented.**
