/**
 * Gamification Utilities (Client-Safe)
 *
 * Pure utility functions that don't require database access.
 * Safe to import in client components.
 */

// ============================================================================
// XP Constants
// ============================================================================

export const XP_REWARDS = {
  PAGE_READ: 1,
  BOOK_COMPLETED: 100,
  QUIZ_COMPLETED: 50,
  QUIZ_PERFECT: 100, // Bonus for 100% score
  QUIZ_HIGH_SCORE: 25, // Bonus for 90%+ score
  STREAK_DAILY: 10, // Daily streak bonus
  STREAK_WEEKLY: 50, // 7-day streak bonus
  STREAK_MONTHLY: 200, // 30-day streak bonus
} as const;

// ============================================================================
// Level Calculation
// ============================================================================

/**
 * Calculate level from XP using a square root formula
 * Level thresholds: 0-49=1, 50-199=2, 200-449=3, 450-799=4, etc.
 */
export function calculateLevel(xp: number): number {
  return Math.min(Math.floor(Math.sqrt(xp / 50)) + 1, 100);
}

/**
 * Calculate XP required to reach a specific level
 */
export function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 50;
}

/**
 * Get XP needed for next level
 */
export function xpToNextLevel(currentXp: number): number {
  const currentLevel = calculateLevel(currentXp);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  return nextLevelXp - currentXp;
}

/**
 * Get progress percentage to next level
 */
export function levelProgressPercent(currentXp: number): number {
  const currentLevel = calculateLevel(currentXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const progressInLevel = currentXp - currentLevelXp;
  const levelRange = nextLevelXp - currentLevelXp;
  return Math.round((progressInLevel / levelRange) * 100);
}

/**
 * Get title/rank based on level
 */
export function getLevelTitle(level: number): string {
  if (level >= 50) return "Reading Legend";
  if (level >= 40) return "Master Reader";
  if (level >= 30) return "Expert Reader";
  if (level >= 20) return "Avid Reader";
  if (level >= 10) return "Book Explorer";
  if (level >= 5) return "Rising Reader";
  return "Beginner Reader";
}
