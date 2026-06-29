/**
 * Shared AI Coach prompt template and fallback brief builder.
 * Kept in sync with supabase/functions/gemini-proxy buildPrompt().
 */

import { getTimeOfDayGreetingPhrase } from '@/utils';
import type { CoachContext } from '@/types/coach';

export function buildCoachPromptInstructions(context: CoachContext, greetingPhrase: string): string {
  const appsByStage =
    context.applicationsByStage
      .map((entry) => `${entry.stage}: ${entry.count}${entry.companies.length ? ` (${entry.companies.join(', ')})` : ''}`)
      .join('; ') || 'none';

  const weeklyGoalsLines =
    context.weeklyGoals.length > 0
      ? context.weeklyGoals.map((goal) => `- [${goal.completed ? 'x' : ' '}] ${goal.category}: ${goal.goalText}`).join('\n')
      : '- none';

  const projectGaps = context.projectGaps.length > 0 ? context.projectGaps.join('; ') : 'none';
  const untouchedTopics = context.untouchedDsaTopics.length > 0 ? context.untouchedDsaTopics.join(', ') : 'none';
  const revisionTopics = context.topicsDueForRevision.length > 0 ? context.topicsDueForRevision.join(', ') : 'none';
  const deadlines =
    context.upcomingDeadlines.map((d) => `${d.title} (${d.daysUntil}d, ${d.type})`).join('; ') || 'none';
  const certs =
    context.certificationsBehind.map((c) => `${c.name} ${c.progress}%${c.daysUntilTarget !== null ? `, ${c.daysUntilTarget}d left` : ''}`).join('; ') || 'none';

  return `You are a direct, honest placement preparation coach for ${context.firstName}. No motivational fluff. No markdown. No extra sections.

LIVE DATA — use specific names from this data in every task:
- DSA solved this week: ${context.dsaSolvedThisWeek}/${context.dsaWeeklyTarget} (streak: ${context.currentStreak} days)
- DSA topics untouched (0 solved): ${untouchedTopics}
- DSA topics due for revision (7+ days): ${revisionTopics}
- Applications by stage: ${appsByStage}
- Upcoming deadlines (14d): ${deadlines}
- Weekly goals (${context.weeklyGoalsCompleted}/${context.weeklyGoalsTotal} done):
${weeklyGoalsLines}
- Project/resume gaps: ${projectGaps}
- Top OA topics: ${context.topOaTopics.join(', ') || 'none'}
- Certs behind: ${certs}
- Mocks this week: ${context.mocksThisWeek}
- Days until peak season (Sep 15 2026): ${context.daysUntilPeakSeason}

RULES:
- Every task MUST cite a specific company, topic, cert, project gap, or weekly goal from the data above.
- If any deadline is within 7 days, at least one task MUST name that company or cert explicitly.
- If any DSA topic has 0 solved, at least one task MUST name that exact topic.
- Time estimates must use formats like "45 min" or "1h 30m".
- Do NOT add headings beyond the template below.
- Do NOT use bullets except the numbered tasks 1–4.
- Output MUST match the template EXACTLY — no preamble, no closing remark, no markdown.

Return ONLY this brief:

${greetingPhrase}, ${context.firstName}.

Today's highest ROI tasks:
1. [Specific task] — [time estimate]
2. [Specific task] — [time estimate]
3. [Specific task] — [time estimate]
4. [Specific task] — [time estimate]

Estimated focus time: Xh Ym

Why these:
[2–3 sentences of honest reasoning tied to the data above]

Watch out for:
[1 honest warning referencing specific data]`;
}

/**
 * Rules-based brief matching the Groq template structure and tone.
 */
export function generateCoachFallbackBrief(context: CoachContext): string {
  const greetingPhrase = getTimeOfDayGreetingPhrase();
  const tasks: string[] = [];

  const nearestDeadline = context.upcomingDeadlines[0];
  if (nearestDeadline && nearestDeadline.daysUntil <= 7) {
    const company = nearestDeadline.title.split(' · ')[0] ?? nearestDeadline.title;
    tasks.push(
      `Prep for ${company} (${nearestDeadline.title}) — OA/deadline in ${nearestDeadline.daysUntil} day${nearestDeadline.daysUntil === 1 ? '' : 's'} — 1h`
    );
  }

  if (context.dsaSolvedThisWeek < context.dsaWeeklyTarget) {
    const remaining = context.dsaWeeklyTarget - context.dsaSolvedThisWeek;
    const topic = context.untouchedDsaTopics[0] ?? context.topicsDueForRevision[0];
    if (topic) {
      tasks.push(
        `Solve ${Math.min(remaining, 3)} ${topic} problems — ${context.dsaSolvedThisWeek}/${context.dsaWeeklyTarget} this week, topic still untouched or stale — 1h`
      );
    } else {
      tasks.push(
        `Solve ${Math.min(remaining, 3)} DSA problems — ${context.dsaSolvedThisWeek}/${context.dsaWeeklyTarget} done this week (${context.currentStreak}d streak) — 1h`
      );
    }
  } else if (context.topicsDueForRevision.length > 0) {
    tasks.push(`Revise ${context.topicsDueForRevision[0]} — flagged or untouched for 7+ days — 45 min`);
  }

  const incompleteGoal = context.weeklyGoals.find((goal) => !goal.completed);
  if (incompleteGoal) {
    tasks.push(`Finish weekly goal: ${incompleteGoal.goalText} (${incompleteGoal.category}) — 45 min`);
  }

  if (context.projectGaps.length > 0 && tasks.length < 4) {
    tasks.push(`Close project gap: ${context.projectGaps[0]} — 45 min`);
  }

  if (context.mocksThisWeek === 0 && tasks.length < 4) {
    tasks.push('Schedule one mock interview or OA-style timed set — none logged this week — 1h');
  }

  if (context.certificationsBehind.length > 0 && tasks.length < 4) {
    const cert = context.certificationsBehind[0];
    tasks.push(`Push ${cert.name} to ${Math.min(cert.progress + 10, 100)}% — currently ${cert.progress}% — 45 min`);
  }

  if (nearestDeadline && nearestDeadline.daysUntil > 7 && tasks.length < 4) {
    tasks.push(
      `Follow up on ${nearestDeadline.title} — ${nearestDeadline.daysUntil} days until deadline — 30 min`
    );
  }

  while (tasks.length < 4) {
    const filler =
      tasks.length === 0
        ? 'Review application pipeline and update stages for stale processes — 30 min'
        : "Log today's progress in the journal before end of day — 15 min";
    if (!tasks.includes(filler)) {
      tasks.push(filler);
    } else {
      break;
    }
  }

  const focusMinutes = Math.min(90 + tasks.length * 30, 300);
  const focusHours = Math.floor(focusMinutes / 60);
  const focusMins = focusMinutes % 60;

  const whyParts: string[] = [];
  if (context.topOaTopics.length > 0) {
    whyParts.push(
      `OA history shows ${context.topOaTopics.slice(0, 2).join(' and ')} appearing often — closing gaps there has high ROI.`
    );
  }
  if (context.dsaSolvedThisWeek < context.dsaWeeklyTarget) {
    whyParts.push(`You are behind the weekly DSA target; catching up now protects your ${context.currentStreak}-day streak.`);
  }
  if (context.daysUntilPeakSeason <= 30 && context.daysUntilPeakSeason > 0) {
    whyParts.push(`Peak season starts in ${context.daysUntilPeakSeason} days — weekly goals at ${context.weeklyGoalsCompleted}/${context.weeklyGoalsTotal} need attention now.`);
  }
  if (whyParts.length === 0) {
    whyParts.push('Maintaining momentum across DSA, applications, and certifications compounds through peak season.');
  }

  let watchOut = 'Keep an eye on upcoming deadlines — check every morning.';
  if (context.certificationsBehind.length > 0) {
    const cert = context.certificationsBehind[0];
    if (cert.daysUntilTarget !== null && cert.daysUntilTarget <= 14) {
      watchOut = `${cert.name} is ${cert.progress}% complete with ${cert.daysUntilTarget} days to target — one module today keeps it recoverable.`;
    }
  } else if (nearestDeadline && nearestDeadline.daysUntil <= 3) {
    watchOut = `${nearestDeadline.title} is due in ${nearestDeadline.daysUntil} day${nearestDeadline.daysUntil === 1 ? '' : 's'} — deprioritize everything else until this is handled.`;
  } else if (context.untouchedDsaTopics.length > 0) {
    watchOut = `${context.untouchedDsaTopics[0]} still has zero problems solved — this gap will show up in OAs if ignored.`;
  }

  return `${greetingPhrase}, ${context.firstName}.

Today's highest ROI tasks:
${tasks.slice(0, 4).map((task, index) => `${index + 1}. ${task}`).join('\n')}

Estimated focus time: ${focusHours}h ${focusMins}m

Why these:
${whyParts.join(' ')}

Watch out for:
${watchOut}`;
}
