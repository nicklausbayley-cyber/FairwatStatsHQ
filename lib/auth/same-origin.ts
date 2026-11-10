/**
 * Browser CSRF guard for state-changing app routes.
 * Next.js may normalize request.url to localhost behind a proxy, while the
 * Host header reflects the public name actually used by the browser.
 */
export function isSameOriginRequest(request: Request): boolean {
  const value = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!value || !host) return false;

  let origin: URL;
  let requestUrl: URL;
  try {
    origin = new URL(value);
    requestUrl = new URL(request.url);
  } catch {
    return false;
  }

  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    return false;
  }
  if (origin.protocol !== "https:" && origin.protocol !== "http:") return false;
  const publicProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    requestUrl.protocol.replace(/:$/, "");
  if (origin.protocol !== `${publicProtocol}:`) return false;
  if (origin.host.toLowerCase() !== host.trim().toLowerCase()) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}
