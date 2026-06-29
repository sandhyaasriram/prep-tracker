/**
 * Weekly Review domain types.
 */

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_number: number;
  biggest_win: string;
  bottleneck: string;
  lessons: string;
  focus_next: string;
  hours_worked: number;
  mood_rating: number | null;
  free_notes: string;
  created_at: string;
  updated_at: string;
}

export interface WeekDefinition {
  week_number: number;
  start_date: string;
  end_date: string;
}

export interface WeekAutoStats {
  dsaProblemsSolved: number;
  mocksDone: number;
  applicationsSent: number;
}

export interface WeeklyReviewViewData {
  weeks: WeekDefinition[];
  reviews: WeeklyReview[];
  currentWeekNumber: number;
}

export interface UpsertWeeklyReviewInput {
  weekNumber: number;
  biggestWin: string;
  bottleneck: string;
  lessons: string;
  focusNext: string;
  hoursWorked: number;
  moodRating: number | null;
  freeNotes: string;
}
