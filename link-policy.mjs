export function safeEvidenceUrl(value, allowedHosts = []) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const hosts = new Set(allowedHosts.map(host => String(host).toLowerCase()));
    if (url.protocol !== "https:" || !hosts.has(url.hostname.toLowerCase())) return null;
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return null;
  }
}
