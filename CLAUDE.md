# Project Rules for Claude Code

## Color System

Source of truth: `src/style.css` — variables in `@theme inline`, `:root`, `.dark`. Colors use oklch.

**Hard rules:**
- Never use hardcoded colors (hex, rgb, hsl, oklch).
- Use semantic Tailwind tokens only.
- Inline styles must use `var(--token)`.

**Available semantic tokens:**
`background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring` + `*-foreground` variants + sidebar tokens + `success`, `warning`

**Status color mapping (mandatory):**
- Success → `bg-success`
- Warning → `bg-warning`
- Error → `bg-destructive`
- In progress → `bg-chart-3`
- Finished → `bg-success`

Never use `gray-*`, `blue-*`, `red-*`, `green-*`, etc.

---

## UI Context Color Usage

- Page layout → `bg-background text-foreground`
- Cards → `bg-card text-card-foreground`
- Descriptions → `text-muted-foreground`
- Table header → `bg-muted text-foreground`
- Primary button → `bg-primary text-primary-foreground`
- Destructive actions → `variant="destructive"`
- Sidebar → always use `bg-sidebar-*` tokens
- Modal overlay → `bg-black/80` is allowed

Contrast must always follow semantic foreground pairing.

---

## Core Modularity

Every feature in `src/components/core/` must:
- Live in its own kebab-case folder
- Components must use PascalCase prefix matching the folder name
- Shared logic must live in `use*.ts` composables
- Optional `config.ts` for static definitions

Example structure:
```
activities-history-list/
  ActivitiesHistoryList.vue
  ActivitiesHistoryListTable.vue
  useActivitiesTable.ts
  config.ts
```

---

## Naming Conventions

- Components → PascalCase
- Core components → prefixed by folder name
- Folders → kebab-case
- Composables → `useCamelCase.ts`
- Stores → `camelCaseStore` (e.g. `activitiesStore`)
- Pages → `*Page.vue`
- Exports must be centralized in `index` files

---

## State Management

Use only the Pinia Setup Store pattern:

```ts
defineStore('id', () => {
  const state = ref(...)
  const computedValue = computed(...)
  function action() {}
  return { state, computedValue, action }
})
```

Option Stores are forbidden.

---

## Tools & Utils

- Dynamic Tailwind classes → always use `cn()` from `@/lib/utils`
- Before adding new helpers, check `src/utils/` first
- Do not duplicate logic from `src/lib/utils.ts`
- Reuse existing utilities: `@/utils/time`, `@/utils/string`

---

## i18n

No hardcoded UI strings in templates or components.

Use `$t('key')` in templates or `t('key')` in script.

Key format:
- `app.core.*`
- `app.module.<module>.*`
- `app.toast_notification.*`
- `app.api_error.*`

Every new key must be added to both:
- `en-US.json`
- `pl-PL.json`

---

## Git

### Branch Naming

- Feature → `feat-name-of-what-you-did`
- Fix → `fix-name-of-what-you-did`
- Chore → `chore-name-of-what-you-did`

Rules: kebab-case, no uppercase, no spaces. Name must clearly describe the change.

Examples: `feat-login-system`, `fix-timer-memory-leak`, `chore-refactor-utils`

### Commit Messages — Conventional Commits

Format: `type(scope): short-description`

Examples:
```
feat(auth): add login validation
fix(timer): resolve interval duplication
chore(utils): refactor date helpers
```

**Allowed types:**
- `feat` — new feature
- `fix` — bug fix
- `chore` — maintenance
- `refactor` — internal restructuring
- `docs` — documentation only
- `style` — formatting only (no logic changes)
- `test` — tests added/updated
- `perf` — performance improvements
- `build` — build/dependency changes
- `ci` — CI configuration changes

**Rules:**
- Subject must be lowercase
- Use imperative mood (add, fix, update — not added, fixed)
- No trailing period
- Keep subject under 72 characters
- One logical change per commit

**Breaking changes:**
```
feat(auth)!: change login response format
```
or with footer:
```
feat(auth): change login response format

BREAKING CHANGE: login now returns user object instead of token
```
