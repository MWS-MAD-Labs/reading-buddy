"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { onQuizCompleted } from "@/lib/gamification";
import { getCurrentUser } from "@/lib/auth/server";
import type { Badge } from "@/types/database";

type StoredQuizQuestion = {
  options: string[];
  answerIndex: number;
};

type StoredQuizPayload = {
  questions?: StoredQuizQuestion[];
};

export const submitQuizAttempt = async (input: {
  quizId: number;
  answers: number[];
  preview?: boolean;
}): Promise<{
  success: boolean;
  newBadges: Badge[];
  xpAwarded: number;
  scorePercent: number;
}> => {
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    throw new Error("You must be signed in to submit a quiz.");
  }

  if (!Number.isInteger(input.quizId) || input.quizId < 1) {
    throw new Error("Quiz not found.");
  }

  const quizResult = await query<{ questions: StoredQuizPayload }>(
    `SELECT questions
     FROM quizzes
     WHERE id = $1`,
    [input.quizId],
  );
  const questions = quizResult.rows[0]?.questions?.questions;

  if (!questions?.length) {
    throw new Error("Quiz not found or has no questions.");
  }

  if (!Array.isArray(input.answers) || input.answers.length !== questions.length) {
    throw new Error("Answer every question before submitting.");
  }

  const answersAreValid = input.answers.every((answer, index) => {
    const question = questions[index];
    return (
      Number.isInteger(answer) &&
      answer >= 0 &&
      Array.isArray(question.options) &&
      answer < question.options.length &&
      Number.isInteger(question.answerIndex) &&
      question.answerIndex >= 0 &&
      question.answerIndex < question.options.length
    );
  });

  if (!answersAreValid) {
    throw new Error("One or more quiz answers are invalid.");
  }

  const score = questions.reduce(
    (total, question, index) =>
      total + (question.answerIndex === input.answers[index] ? 1 : 0),
    0,
  );
  const totalQuestions = questions.length;
  const scorePercent = Math.round((score / totalQuestions) * 100);

  if (input.preview) {
    if (user.role !== "ADMIN" && user.role !== "LIBRARIAN") {
      throw new Error("Only librarians can preview quizzes.");
    }

    return {
      success: true,
      newBadges: [],
      xpAwarded: 0,
      scorePercent,
    };
  }

  const profileId = user.profileId;

  const insertResult = await query(
    `INSERT INTO quiz_attempts (quiz_id, student_id, answers, score)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.quizId, profileId, JSON.stringify(input.answers), score],
  );

  if (insertResult.rows.length === 0) {
    throw new Error("Failed to save quiz attempt.");
  }

  // Award XP and evaluate badges using only the server-calculated score.
  const result = await onQuizCompleted(
    user.userId,
    profileId,
    input.quizId,
    score,
    totalQuestions,
  );

  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/badges");

  return {
    success: true,
    newBadges: result.newBadges,
    xpAwarded: result.totalXpAwarded,
    scorePercent,
  };
};
