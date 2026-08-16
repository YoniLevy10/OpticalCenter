## Summary

<!-- What changed and why -->

## Checklist

- [ ] Visual regression pack green (`e2e/visual-pack.spec.ts`, `maxDiffPixelRatio: 0.03`)
- [ ] Storybook story updated if UI primitives changed
- [ ] Unit / e2e tests pass
- [ ] No orphan components left behind
- [ ] Phone / RTL sanity checked when UI changed

## Test plan

- [ ] `npm run lint && npm run typecheck && npm test`
- [ ] `npx playwright test --project=chromium` (FORCE_MEMORY + ALLOW_TEST_AUTH)
