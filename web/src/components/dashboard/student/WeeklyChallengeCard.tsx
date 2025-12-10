"use client";

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
    <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-6 shadow-[0_20px_50px_rgba(147,118,255,0.2)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 inline-block rounded-full border-2 border-purple-200 bg-white px-3 py-1">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Weekly Challenge
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{challenge.icon}</span>
            <div>
              <h3 className="text-xl font-black text-purple-900">
                {challenge.title}
              </h3>
              <p className="text-sm text-purple-600">{challenge.description}</p>
            </div>
          </div>
        </div>
        {isCompleted && (
          <div className="flex-shrink-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 px-3 py-1 text-xs font-black text-white shadow-md">
            ✓ Done!
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-purple-700">
            {challenge.progress} / {challenge.goal}
          </span>
          <span className="font-semibold text-purple-500">
            +{challenge.xpReward} XP
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/80">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted
                ? "bg-gradient-to-r from-green-400 to-emerald-400"
                : "bg-gradient-to-r from-purple-400 to-fuchsia-400"
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {isCompleted && (
        <p className="mt-3 text-center text-xs font-semibold text-green-600">
          🎉 Challenge completed! XP awarded!
        </p>
      )}
    </div>
  );
}
