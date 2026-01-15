/**
 * Weekly Challenges System
 *
 * Generates rotating weekly challenges based on the week number.
 * Challenges automatically rotate every Monday.
 */

import { queryWithContext } from "@/lib/db";

export type WeeklyChallengeType = {
  id: string;
  title: string;
  description: string;
  goal: number;
  xpReward: number;
  icon: string;
  type: "pages" | "books" | "quizzes" | "streak" | "perfect_quizzes";
};

// Define available challenges that rotate
const CHALLENGE_POOL: WeeklyChallengeType[] = [
  {
    id: "pages-100",
    title: "Page Turner",
    description: "Read 100 pages this week",
    goal: 100,
    xpReward: 200,
    icon: "📖",
    type: "pages",
  },
  {
    id: "pages-150",
    title: "Avid Reader",
    description: "Read 150 pages this week",
    goal: 150,
    xpReward: 300,
    icon: "📚",
    type: "pages",
  },
  {
    id: "books-2",
    title: "Book Worm",
    description: "Complete 2 books this week",
    goal: 2,
    xpReward: 250,
    icon: "🐛",
    type: "books",
  },
  {
    id: "quizzes-5",
    title: "Quiz Master",
    description: "Complete 5 quizzes this week",
    goal: 5,
    xpReward: 200,
    icon: "🎯",
    type: "quizzes",
  },
  {
    id: "streak-7",
    title: "Week Warrior",
    description: "Read every day this week",
    goal: 7,
    xpReward: 300,
    icon: "🔥",
    type: "streak",
  },
  {
    id: "perfect-3",
    title: "Perfect Scholar",
    description: "Get 3 perfect quiz scores (100%)",
    goal: 3,
    xpReward: 250,
    icon: "⭐",
    type: "perfect_quizzes",
  },
];

/**
 * Get the current week number of the year
 */
function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the start and end dates of the current week (Monday to Sunday)
 */
function getWeekBounds(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday

  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get the current week's challenge (rotates based on week number)
 */
export function getCurrentWeekChallenge(): WeeklyChallengeType {
  const weekNumber = getWeekNumber();
  const challengeIndex = weekNumber % CHALLENGE_POOL.length;
  return CHALLENGE_POOL[challengeIndex];
}

/**
 * Calculate progress for the current week's challenge
 */
export async function getWeeklyChallengeProgress(
  userId: string,
  studentId: string,
): Promise<{
  challenge: WeeklyChallengeType;
  progress: number;
  isCompleted: boolean;
}> {
  const challenge = getCurrentWeekChallenge();
  const { start, end } = getWeekBounds();

  let progress = 0;
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  switch (challenge.type) {
    case "pages": {
      // Count pages read this week from xp_transactions
      const result = await queryWithContext(
        userId,
        `SELECT SUM(amount) as total
         FROM xp_transactions
         WHERE student_id = $1
           AND source = 'page_read'
           AND created_at >= $2
           AND created_at <= $3`,
        [studentId, startIso, endIso],
      );

      progress = parseInt(result.rows[0]?.total || "0");
      break;
    }

    case "books": {
      // Count books completed this week
      const result = await queryWithContext(
        userId,
        `SELECT COUNT(*) as count
         FROM student_books
         WHERE student_id = $1
           AND completed_at IS NOT NULL
           AND completed_at >= $2
           AND completed_at <= $3`,
        [studentId, startIso, endIso],
      );

      progress = parseInt(result.rows[0]?.count || "0");
      break;
    }

    case "quizzes": {
      // Count quizzes completed this week
      const result = await queryWithContext(
        userId,
        `SELECT COUNT(*) as count
         FROM quiz_attempts
         WHERE student_id = $1
           AND submitted_at >= $2
           AND submitted_at <= $3`,
        [studentId, startIso, endIso],
      );

      progress = parseInt(result.rows[0]?.count || "0");
      break;
    }

    case "streak": {
      // Count unique days read this week
      const result = await queryWithContext(
        userId,
        `SELECT created_at
         FROM xp_transactions
         WHERE student_id = $1
           AND created_at >= $2
           AND created_at <= $3`,
        [studentId, startIso, endIso],
      );

      const uniqueDays = new Set(
        result.rows.map((tx: any) => new Date(tx.created_at).toDateString()),
      );
      progress = uniqueDays.size;
      break;
    }

    case "perfect_quizzes": {
      // Count perfect quiz scores this week
      const result = await queryWithContext(
        userId,
        `SELECT COUNT(*) as count
         FROM quiz_attempts
         WHERE student_id = $1
           AND score >= 100
           AND submitted_at >= $2
           AND submitted_at <= $3`,
        [studentId, startIso, endIso],
      );

      progress = parseInt(result.rows[0]?.count || "0");
      break;
    }
  }

  return {
    challenge,
    progress,
    isCompleted: progress >= challenge.goal,
  };
}
