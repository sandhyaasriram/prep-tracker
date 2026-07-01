# Open issues & improvements

Tracked follow-ups that are not blockers but worth doing later.

---

## AI Coach — iterate chat prompt quality

**Status:** Open  
**Phase:** 9 (AI Coach)  
**Priority:** Low

Conversational coach chat is live (`coach_messages` + Groq). Prompt can still be tuned for sharper, more specific replies.

**Where to change:**
- **Groq system prompt:** `supabase/functions/gemini-proxy/index.ts` → `buildSystemPrompt()`
- **Live context assembly:** `src/utils/coachContext.ts` → `buildCoachChatContext()`

**Acceptance:** Replies feel specific to live data; opening brief and follow-ups prioritize realistically.

---

## Resolved in Phase 12

### Progress bar / mutation UX
- **Was:** Full-page reloads and hard refresh needed after checkbox ticks and form saves.
- **Fixed:** Optimistic local-state mutations app-wide; top nav bar is now a scroll indicator (not weekly goal %).

### Dark mode clutter
- **Was:** Too dark and visually noisy.
- **Fixed (Phase 12):** Softer surfaces (`#101216` / `#161A20`), desaturated badges, borderless cards, fixed primary button color in dark mode, improved line-height and focus rings.
