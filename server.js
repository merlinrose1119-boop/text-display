// Text Display API - zero-dependency Node.js server
// Anyone POSTs a text to /api/text and it shows up live on the web page.
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 3000;
const MAX_MESSAGES = 200;
const MAX_TEXT = 500;

const messages = []; // oldest -> newest
let nextId = 1;

function send(res, code, body, type = "application/json") {
  res.writeHead(code, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return send(res, 204, "");

  // POST /api/text   { "text": "Hello", "sender": "rahul", "timestamp": "..." }
  if (url.pathname === "/api/text" && req.method === "POST") {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 10000) req.destroy();
    });
    req.on("end", () => {
      let data;
      try { data = JSON.parse(raw); } catch { return send(res, 400, { ok: false, error: "Invalid JSON" }); }
      if (!data || typeof data !== "object" || Array.isArray(data))
        return send(res, 400, { ok: false, error: "Send one message as a JSON object" });

      const textRaw = data.text ?? data.message;
      if (typeof textRaw !== "string" || !textRaw.trim())
        return send(res, 400, { ok: false, error: "text must be a non-empty string" });
      if (textRaw.length > MAX_TEXT)
        return send(res, 400, { ok: false, error: `text is too long (max ${MAX_TEXT} characters)` });

      const entry = {
        id: nextId++,
        sender: String(data.sender || data.device_id || "anonymous").slice(0, 50),
        text: textRaw.trim(),
        timestamp: Number.isNaN(Date.parse(data.timestamp)) ? new Date().toISOString() : data.timestamp,
        receivedAt: Date.now(),
      };
      messages.push(entry);
      if (messages.length > MAX_MESSAGES) messages.shift();

      console.log(`[${new Date().toLocaleTimeString()}] ${entry.sender}: ${entry.text}`);
      send(res, 200, { ok: true, id: entry.id });
    });
    return;
  }

  // GET /api/latest.txt  ->  "<id>|<text>"  (plain text, easy for ESP32 / LED boards). "0|" when empty.
  if (url.pathname === "/api/latest.txt" && req.method === "GET") {
    const m = messages.length ? messages[messages.length - 1] : null;
    const line = m ? `${m.id}|${m.text.replace(/[\r\n]+/g, " ")}` : "0|";
    return send(res, 200, line, "text/plain; charset=utf-8");
  }

  if (url.pathname === "/api/latest" && req.method === "GET") {
    return send(res, 200, messages.length ? messages[messages.length - 1] : { empty: true });
  }

  if (url.pathname === "/api/history" && req.method === "GET") {
    const limit = Math.min(Number(url.searchParams.get("limit")) || 20, MAX_MESSAGES);
    return send(res, 200, messages.slice(-limit));
  }

  send(res, 404, { error: "Not found. Use POST /api/text to send a message." });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);

  const file = url.pathname === "/" ? "/index.html" : url.pathname;
  const full = path.join(__dirname, "public", path.normalize(file));
  if (!full.startsWith(path.join(__dirname, "public"))) return send(res, 403, "Forbidden", "text/plain");
  fs.readFile(full, (err, buf) => {
    if (err) return send(res, 404, "Not found", "text/plain");
    send(res, 200, buf, full.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream");
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("\nText Display API running!\n");
  console.log(`  Open page : http://localhost:${PORT}`);
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list)
      if (i.family === "IPv4" && !i.internal) console.log(`  POST URL  : http://${i.address}:${PORT}/api/text`);
  console.log("");
});

// Safety net: log unexpected errors instead of crashing the server
process.on("uncaughtException", (e) => console.error("Unhandled error:", e));
