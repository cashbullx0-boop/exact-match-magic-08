/**
 * Financial actions must never run from a stale application shell. Older
 * CashBullX service workers cached the deposit route and could leave an
 * installed mobile app on the obsolete disabled-button flow after a deploy.
 * Keep the app installable through its manifest, but retire those workers and
 * their caches so deposits always use the current network-delivered code.
 */
async function clearLegacyPwaState() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // ignore
  }

  if (!("caches" in window)) return;
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name === "html-cache" || name === "assets-cache" || name.startsWith("workbox-"))
        .map((name) => caches.delete(name)),
    );
  } catch {
    // A cache cleanup failure must never block the app.
  }
}

export function registerPwa(): void {
  if (typeof window === "undefined") return;
  void clearLegacyPwaState();
}