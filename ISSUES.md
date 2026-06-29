# Open issues & improvements

Tracked follow-ups that are not blockers but worth doing later.

---

## AI Coach — improve prompt quality

**Status:** Open  
**Phase:** 9 (AI Coach)  
**Priority:** Medium

The daily brief works (Groq + rules fallback), but the prompt can still be iterated for sharper output.

**Where to change:**
- **Groq prompt:** `supabase/functions/gemini-proxy/index.ts` → `buildPrompt()`
- **Rules fallback copy:** `src/utils/coachPrompt.ts` → `generateCoachFallbackBrief()`

**Acceptance:** Regenerated briefs feel specific to live data, not boilerplate; tasks are prioritized and time-estimated realistically.

---

## Resolved in Phase 12

### Progress bar / mutation UX
- **Was:** Full-page reloads and hard refresh needed after checkbox ticks and form saves.
- **Fixed:** Optimistic local-state mutations app-wide; top nav bar is now a scroll indicator (not weekly goal %).

### Dark mode clutter
- **Was:** Too dark and visually noisy.
- **Fixed (Phase 12):** Softer surfaces (`#101216` / `#161A20`), desaturated badges, borderless cards, fixed primary button color in dark mode, improved line-height and focus rings.
