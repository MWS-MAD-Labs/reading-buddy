"use client";

import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

type Challenge = {
  id: string;
  title: string;
  description: string;
  goal: number;
  progress: number;
  xpReward: number;
  icon: string;
};

type WeeklyChallengeCardProps = {
  challenge: Challenge;
};

export function WeeklyChallengeCard({ challenge }: WeeklyChallengeCardProps) {
  const progressPercentage = Math.min(
    (challenge.progress / challenge.goal) * 100,
    100,
  );
  const isCompleted = challenge.progress >= challenge.goal;

  return (
    <Card className="border-[#D6A13A]/35 bg-[#FBF2DF]/75" padding="cozy">
      <CardHeader className="flex items-start justify-between gap-3 sm:flex-row">
        <div className="flex-1">
          <Badge variant="amber" size="sm" className="mb-2 bg-white">
            Weekly Challenge
          </Badge>
          <CardTitle className="text-xl text-[#7E1518]">
            {challenge.title}
          </CardTitle>
          <CardDescription>{challenge.description}</CardDescription>
        </div>
        {isCompleted && (
          <Badge
            variant="lime"
            size="sm"
            className="shrink-0 bg-[#6F8B6A] text-white"
          >
            Done
          </Badge>
        )}
      </CardHeader>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="heading-font font-bold text-[#7a5311]">
            {challenge.progress} / {challenge.goal}
          </span>
          <span className="font-semibold text-[#7E1518]">
            +{challenge.xpReward} XP
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/80">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted ? "bg-[#6F8B6A]" : "bg-[#D6A13A]"
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {isCompleted && (
        <p className="mt-3 text-center text-xs font-semibold text-[#486142]">
          Challenge completed. XP awarded.
        </p>
      )}
    </Card>
  );
}
