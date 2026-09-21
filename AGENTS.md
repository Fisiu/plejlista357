# Agent Guide

## Project

- This is a Vue 3 + TypeScript SPA built with Vite and Nuxt UI (via `@nuxt/ui` standalone/unplugin).
- The app shell and global navigation live in `src/App.vue`; bootstrap/plugin setup is in `src/main.ts`.
- Route-level views live in `src/pages/` and are registered in `src/router/index.ts`. Keep page imports lazy via dynamic `() => import(...)`.
- Reusable UI components belong in `src/components/`; stateful domain logic belongs in `src/composables/`; Pinia setup stores belong in `src/stores/`.
- Use `@/` alias for all internal imports from `src/`.
- `@unhead/vue` manages document metadata: install the head manager in `src/main.ts`, keep global metadata in `App.vue`, and set page titles in each page using `useHead()`.

## TypeScript & Vue Architecture Standards

- **Script Setup:** Always use `<script setup lang="ts">`. Avoid Options API and `defineComponent()` wrappers.
- **Props & Emits:**
  - Use pure type-based declarations: `defineProps<{ foo: string }>()` and `defineEmits<{ (e: 'update:modelValue', val: string): void }>()`.
  - For default props, use reactive destructuring (Vue 3.5+ native) or `withDefaults()`. Keep defaults explicit.
- **Reactivity Discipline:**
  - Avoid destructuring props, `reactive()` state, or composable returns directly if reactivity is required; use `toRefs()` or `toRef()` where necessary.
  - Prefer `ref()` and `computed()` over nested `reactive()` objects for easier ref-passing and composability.
  - Use `shallowRef()` for large, immutable API payloads, heavy third-party instances, or DOM nodes to avoid deep proxy overhead.
- **No `any` Escapes:** Strict typing is enabled. Always declare explicit interfaces for API payloads, composable options, and store states.

## Composable Standards (`src/composables/`)

- Composable function names must start with `use*` (e.g., `useUserQuery.ts`).
- **Input Flexibility:** Composable parameters that can be dynamic must accept `MaybeRefOrGetter<T>`. Always unwrap them using `toValue()` inside methods or effects.
- **Return Contract:** Always return a plain object containing individual `Ref` or `ComputedRef` instances so consumers can safely destructure without breaking reactivity.
- **Scope & Teardown:** Never register untracked listeners or intervals inside a composable without cleanup. Use `onScopeDispose()` or standard component lifecycle hooks (`onUnmounted`) to tear down event listeners, abort controllers, or timers.
- **Async Safety:** When writing data-fetching composables, handle race conditions and teardowns using `AbortController` bound to `onScopeDispose()`.

## State Management (`src/stores/`)

- Use Pinia setup stores syntax: `defineStore('id', () => { ... })`.
- Store properties must expose state as `ref()`/`computed()`, actions as plain functions, and asynchronous operations with explicit error/loading handling.
- When consuming stores in components, use `storeToRefs(store)` if destructuring state/getters to retain reactivity.

## UI and Styling

- Use Nuxt UI components and semantic Tailwind/Nuxt UI tokens rather than hardcoded colors or ad-hoc Tailwind color values (`bg-white`, `text-black`).
- Preserve light and dark mode support through Nuxt UI tokens and `useColorMode()`.
- Keep interactive controls accessible: retain meaningful `aria-label` values for icon-only buttons, action menus, and external links.
- Follow the existing two-space Vue formatting and ESLint/Prettier conventions. Run formatters instead of manually refactoring unrelated styles.
- Auto-generated `auto-imports.d.ts` and `components.d.ts` are build outputs; do not edit them manually.

## Tests and Validation

Run the narrowest relevant check first, then the full verification suite before committing:

```sh
pnpm test:unit
pnpm type-check
pnpm lint
pnpm format
pnpm build
```
