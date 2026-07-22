/**
 * Triggers a file download without navigating away from the current page.
 * Uses a hidden anchor element instead of window.location.href so React Query
 * cache, active form state, and scroll position are preserved.
 */
export function downloadFromUrl(url: string, filename = "export"): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
