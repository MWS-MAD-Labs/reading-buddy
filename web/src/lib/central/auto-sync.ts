import { syncUsersIfChanged } from "@/lib/central/central-user-sync";
import { isHubAuthEnabled } from "@/lib/central/hub-session";

const DEFAULT_SECONDS = 60;
const MIN_SECONDS = 15;

function intervalMs(): number {
  const raw = process.env.READING_BUDDY_AUTO_SYNC_SECONDS?.trim();
  if (!raw) return DEFAULT_SECONDS * 1000;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds < 0) return DEFAULT_SECONDS * 1000;
  if (seconds === 0) return 0;
  return Math.max(seconds, MIN_SECONDS) * 1000;
}

const state = globalThis as unknown as {
  __readingBuddyCentralSync?: { stop: () => void };
};

export function startCentralAutoSync(): () => void {
  if (!isHubAuthEnabled()) return () => undefined;
  if (state.__readingBuddyCentralSync) {
    return state.__readingBuddyCentralSync.stop;
  }
  const everyMs = intervalMs();
  if (everyMs === 0) return () => undefined;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await syncUsersIfChanged();
      if (result.status === "synced") {
        console.info(
          `[central-sync] ${result.summary.projected} users projected, ${result.summary.revoked} revoked`,
        );
      }
    } catch (error) {
      console.error(
        "[central-sync] Automatic user sync failed",
        error instanceof Error ? error.message : error,
      );
    } finally {
      running = false;
    }
  };

  const first = setTimeout(tick, 5_000);
  const every = setInterval(tick, everyMs);
  first.unref?.();
  every.unref?.();
  const stop = () => {
    clearTimeout(first);
    clearInterval(every);
    delete state.__readingBuddyCentralSync;
  };
  state.__readingBuddyCentralSync = { stop };
  return stop;
}
