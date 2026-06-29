# Open issues & improvements

Tracked follow-ups that are not blockers but worth doing later.

---

## AI Coach — improve prompt quality

**Status:** Open  
**Phase:** 9 (AI Coach)  
**Priority:** Medium

The daily brief works (Gemini + rules fallback), but the prompt needs iteration for better, more useful output.

**Where to change:**
- **Gemini prompt:** `supabase/functions/gemini-proxy/index.ts` → `buildPrompt()`
- **Rules fallback copy:** `src/utils/coachContext.ts` → `generateCoachFallbackBrief()`

**Ideas to explore:**
- Richer context (applications by stage, recent journal, weekly goals, project gaps)
- Sharper task wording — company/role-specific, not generic
- Time-of-day greeting (morning vs evening)
- Tone calibration (direct but actionable vs too sparse)
- Stronger output format constraints so Gemini stays on-template
- Align fallback brief structure with Gemini brief so both feel consistent

**Acceptance:** Regenerated briefs feel specific to live data, not boilerplate; tasks are prioritized and time-estimated realistically.

---

## Dark Mode 

Too dark - feels too cluttered
dark mode supposed to make you feel relaxed, feels like overwhelming noise