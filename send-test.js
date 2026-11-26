// Sends a test message. Usage: node send-test.js "Hello world" [url]
const text = process.argv[2] || "Hello from the test script!";
const URL = process.argv[3] || "http://localhost:3000/api/text";
fetch(URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sender: "test-script", text, timestamp: new Date().toISOString() }),
}).then(async (r) => console.log(r.status, await r.text())).catch((e) => console.log("failed:", e.message));
