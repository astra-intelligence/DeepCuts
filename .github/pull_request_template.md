## What & why

## Checklists

**Testing**

- [ ] New logic has tests; `npm run verify` passes locally

**Security** (ADR-0008)

- [ ] No secrets or `VITE_*` secret-like vars; no `dangerouslySetInnerHTML`
- [ ] External data validated with Zod at the boundary
- [ ] Attack-surface changes flagged for the threat model (docs repo)

**Accessibility** (ADR-0009)

- [ ] Keyboard and screen-reader paths checked; focus visible
- [ ] Semantic tokens only; contrast check passes; reduced motion respected
