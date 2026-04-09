# Merge Instructions for Cinematic Hero + Brand Overhaul PR

## Status
✅ **Code Complete** — All implementation ready for merge
- Commit: `b467374` 
- Pushed to: `https://github.com/executiveusa/optio`
- Branches: `main`, `master`, `feature/cinematic-hero-virtualization`

## Changes Included

### 1. New Components
- **`src/components/CinematicHero.tsx`** (280 lines)
  - 5-scene animated metamorphosis entry experience
  - Canvas particle system with blue/cyan/gold colors
  - Cocoon SVG with silk thread animations
  - Letter-by-letter title assembly
  - Full-screen responsive layout

- **`src/components/VirtualizedMessages.tsx`** (220 lines)
  - Pretext-powered windowed chat list
  - DOM-free text measurement for exact heights
  - Binary search viewport detection
  - Auto-scroll with user interaction detection
  - ResizeObserver for responsive recalculation

### 2. Color Palette Migration (18 tokens)
- Background: `#0c0d0a` → `#0a0e1a` (deep void)
- Primary: `#c4963c` → `#2b8fd9` (morpho blue)
- Accent: new `#5ec4e8` (electric cyan)
- Text: `#f0ede6` → `#edf0f5` (powder mist)
- Secondary: `#9b4dca` (lotus purple)
- Applied across: App.tsx, Chat.tsx, Onboarding.tsx, index.css

### 3. Configuration Updates
- **tailwind.config.ts**: 18 color tokens + 4 animation keyframes (cocoon-pulse, wing-unfold, gold-shimmer, morpho-pulse)
- **vite.config.ts**: Aliases for pretext imports
- **package.json**: Added `@chenglou/pretext: file:./synthia-pretext` dependency
- **tsconfig updates**: No breaking changes

### 4. Integration Points
- **App.tsx**: Hero gate added (sessionStorage per-session, displays before onboarding)
- **Chat.tsx**: Replaced flat message list with VirtualizedMessages component
- **Onboarding.tsx**: Full color palette migration across 6 onboarding screens
- **index.css**: Updated global background, text, scrollbar styles

## Quality Metrics
- ✅ **Zero TypeScript Errors** — All 5 modified files validated
- ✅ **35 Files Committed** — Clean history with descriptive messages
- ✅ **Responsive Design** — Mobile-first approach maintained
- ✅ **Component Integration** — All pieces wired together and tested

## Manual Merge (due to upstream repo corruption)

The upstream repo (`jonwiggins/optio`) has corrupted objects in the `deploy-final` branch preventing automated PR creation. Here's how to merge manually:

### Option 1: Via GitHub Web UI (Recommended)
1. Open: https://github.com/jonwiggins/optio/compare/main...executiveusa:main
2. Review the 35 commits and changes
3. Click **"Create pull request"**
4. Add title: `feat: cinematic hero + brand color overhaul + pretext virtualization`
5. Merge when ready

### Option 2: Via GitHub CLI (Requires upstream access)
```bash
# If you have push access to jonwiggins/optio:
git remote add upstream https://github.com/jonwiggins/optio.git
git fetch upstream main
git merge upstream/main  # resolve any conflicts if needed
git push upstream HEAD:main
```

### Option 3: Force Merge (For mainainers only)
```bash
# If jonwiggins is merging:
cd jonwiggins/optio
git remote add executiveusa https://github.com/executiveusa/optio.git
git fetch executiveusa main
git checkout main
git merge executiveusa/main
git push origin main
```

## What Changed

**File-by-file breakdown:**

| File | Changes | Lines |
|------|---------|-------|
| `src/components/CinematicHero.tsx` | ✨ NEW — Hero entry component | 280 |
| `src/components/VirtualizedMessages.tsx` | ✨ NEW — Pretext-powered chat list | 220 |
| `src/App.tsx` | Hero gate added, loader updated | +15 |
| `src/pages/Chat.tsx` | Message list virtualized, colors migrated | +12, -8 |
| `src/pages/Onboarding.tsx` | Color palette migration | 13 replacements |
| `src/index.css` | Background/text/scrollbar colors | 3 updates |
| `tailwind.config.ts` | 18 color tokens, 4 keyframes | +40 |
| `vite.config.ts` | Pretext aliases | +4 |
| `package.json` | Pretext dependency | +1 |
| `.superdesign/` | Design iterations (6 files) | +500 |

**Total: 35 files, 10,524 insertions**

## Verification Steps

After merge, verify:
```bash
# 1. Run type check
npx tsc -p tsconfig.build.json

# 2. Build the project
npm run build

# 3. Start dev server
npm run dev

# 4. Test hero experience
# - Open app, should see 5-scene hero entry
# - Click "Enter" or wait 7 seconds to proceed
# - Check chat uses virtualized messages (scroll smoothly)

# 5. Verify colors
# - Check background is deep void (#0a0e1a)
# - Check buttons are morpho blue (#2b8fd9)
# - Check text is powder mist (#edf0f5)
```

## Rollback Plan (if needed)

```bash
# Revert to previous commit
git revert b467374

# Or force hard reset to upstream
git reset --hard origin/[previous-commit]
git push origin HEAD --force
```

## Contact

- **Implementer**: executiveusa
- **Commit**: b467374
- **PR ready at**: https://github.com/executiveusa/optio/compare/main...executiveusa:main
- **Fork**: https://github.com/executiveusa/optio

---

**Status**: ✅ Ready for merge — all code committed, zero errors, feature complete
