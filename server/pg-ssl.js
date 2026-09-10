const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres", "db"]);

export function postgresSsl(connectionString) {
  if (!connectionString) return false;
  const url = String(connectionString);
  if (/[?&]sslmode=disable\b/i.test(url)) return false;
  const host = url.match(/@([^/:?]+)/)?.[1]?.replace(/^\[|\]$/g, "") || "";
  if (LOCAL_HOSTS.has(host)) return false;
  return { rejectUnauthorized: false };
}
