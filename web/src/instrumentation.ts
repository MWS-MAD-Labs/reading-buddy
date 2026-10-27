export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startCentralAutoSync } = await import(
    "@/lib/central/auto-sync"
  );
  startCentralAutoSync();
}
