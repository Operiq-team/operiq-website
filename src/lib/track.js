/**
 * Privacy-friendly event hook. It records nothing and sets no cookie.
 * Listen for `operiq:track` when an analytics script is approved.
 * See README, "Måling".
 */
export function track(event, props = {}) {
  if (typeof window === "undefined" || !event) return;
  window.dispatchEvent(
    new CustomEvent("operiq:track", {
      detail: { event, props },
    }),
  );
}
