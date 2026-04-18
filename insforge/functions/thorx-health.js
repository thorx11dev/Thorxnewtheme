/**
 * First InsForge Edge Function — smoke test for Deployment + Functions pipeline.
 * Create in cloud: MCP `create-function` with codeFile pointing to this file.
 * Invoke: insforge.functions.invoke('thorx-health', { method: 'GET' }) or HTTPS per docs.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

module.exports = async function (request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const body = {
    ok: true,
    service: "thorx-health",
    method: request.method,
    time: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
};
