const defaultDevOrigins = [
  "http://localhost:5000",
  "https://localhost:5000",
  "http://127.0.0.1:5000",
  "https://127.0.0.1:5000",
];

const defaultHostedOrigins = [
  "https://thorx.pro",
  "https://www.thorx.pro",
  "https://api.thorx.pro",
];

function parseCsv(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const runtimeConfig = {
  isProd: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "5000", 10),
  frontendOrigins: [
    ...defaultDevOrigins,
    ...defaultHostedOrigins,
    ...parseCsv(process.env.FRONTEND_ORIGINS),
    ...(process.env.REPLIT_DEV_DOMAIN ? [
      `https://${process.env.REPLIT_DEV_DOMAIN}`,
      `http://${process.env.REPLIT_DEV_DOMAIN}`,
    ] : []),
    ...(process.env.REPL_SLUG && process.env.REPL_OWNER ? [
      `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`,
      `http://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`,
    ] : []),
  ],
  sessionSecret: process.env.SESSION_SECRET,
  sessionCookieSecure: process.env.SESSION_COOKIE_SECURE === "true",
  sessionCookieDomain: process.env.SESSION_COOKIE_DOMAIN || undefined,
  sessionCookieSameSite: (process.env.SESSION_COOKIE_SAME_SITE || "lax").toLowerCase() as "lax" | "strict" | "none",
  proxyAllowedHosts: parseCsv(process.env.PROXY_ALLOWED_HOSTS),
};

export function isOriginAllowed(origin: string): boolean {
  return runtimeConfig.frontendOrigins.includes(origin);
}
