import type { Request, Response } from "express";
import { runtimeConfig } from "../../config/runtime";
import dns from "dns/promises";
import net from "net";

const BLOCKED_PRIVATE_CIDR = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80/i,
];

function isPrivateIp(ip: string): boolean {
  return BLOCKED_PRIVATE_CIDR.some((pattern) => pattern.test(ip));
}

async function isPublicHost(hostname: string): Promise<boolean> {
  try {
    if (net.isIP(hostname)) {
      return !isPrivateIp(hostname);
    }
    const records = await dns.lookup(hostname, { all: true });
    return records.every((record) => !isPrivateIp(record.address));
  } catch {
    return false;
  }
}

export async function handleProxyRequest(req: Request, res: Response) {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("Missing url parameter");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).send("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).send("Unsupported protocol");
  }

  if (runtimeConfig.isProd && runtimeConfig.proxyAllowedHosts.length > 0) {
    if (!runtimeConfig.proxyAllowedHosts.includes(parsedUrl.hostname)) {
      return res.status(403).send("Host not allowed");
    }
  }

  const publicHost = await isPublicHost(parsedUrl.hostname);
  if (!publicHost) {
    return res.status(403).send("Private or invalid host");
  }

  const client = parsedUrl.protocol === "https:" ? await import("https") : await import("http");
  const proxyReq = client.get(targetUrl, {
    headers: {
      "User-Agent": "THORX-Proxy/1.0",
    },
  }, (proxyRes) => {
    res.status(proxyRes.statusCode || 200);
    const headersToCopy = ["content-type", "content-length", "cache-control", "expires", "date", "etag", "last-modified"];

    Object.keys(proxyRes.headers).forEach((key) => {
      if (headersToCopy.includes(key.toLowerCase()) && proxyRes.headers[key]) {
        res.setHeader(key, proxyRes.headers[key]!);
      }
    });

    const contentType = proxyRes.headers["content-type"] || "";
    if (typeof contentType === "string" && contentType.includes("text/html")) {
      let data = "";
      proxyRes.on("data", (chunk) => data += chunk);
      proxyRes.on("end", () => {
        const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
        if (!data.includes("<base")) {
          data = data.replace(/<head>/i, `<head><base href="${baseUrl}/">`);
        }
        res.send(data);
      });
      return;
    }

    proxyRes.pipe(res);
  });

  proxyReq.on("error", () => {
    res.status(500).send("Proxy Error");
  });
}
