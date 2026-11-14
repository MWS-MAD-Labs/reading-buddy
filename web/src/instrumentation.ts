export async function register() {
  // Keep the import inside a literal NEXT_RUNTIME check so webpack can drop it
  // from the edge bundle (pg needs Node built-ins like `fs`).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCentralAutoSync } = await import("@/lib/central/auto-sync");
    startCentralAutoSync();
  }
}
