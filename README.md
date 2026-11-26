# Text Display API

Anyone sends a text with the API and it shows up live on the web page.

## Send a text (POST JSON to /api/text)
    {
      "text": "Hello world",
      "sender": "rahul",
      "timestamp": "2026-11-26T10:21:00Z"
    }
Only `text` is required (max 500 characters). `sender` defaults to "anonymous".
`timestamp` is optional (server time is used if missing). `message` also works instead of `text`.
Success reply: {"ok":true,"id":1}

## Run locally
    node server.js        -> http://localhost:3000
    node send-test.js "Hello"

## Examples
Postman: POST the URL, Body > raw > JSON.

curl:
    curl -X POST http://localhost:3000/api/text -H "Content-Type: application/json" -d '{"sender":"me","text":"Hello world"}'

Python:
    import requests
    requests.post("http://localhost:3000/api/text", json={"sender": "me", "text": "Hello world"})

JavaScript:
    fetch("http://localhost:3000/api/text", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ sender: "me", text: "Hello world" }) })

## Deploy publicly on Render (free)
1. New GitHub repo, upload server.js, package.json, public/, send-test.js, README.md (public/index.html must be inside the public folder).
2. Render > New > Web Service > Public Git Repository > repo URL.
3. Language Node, Build `npm install`, Start `node server.js`, Instance Free.
Page: https://YOUR-APP.onrender.com   API: https://YOUR-APP.onrender.com/api/text

## Show messages on an LED board (ESP32 + MAX7219)
The ESP32 polls  GET /api/latest.txt  which returns  `<id>|<text>`  (example: `3|Hello world`) and scrolls the text on the LED matrix.
Everyone who runs the sketch in esp32-led-board/ sees the same latest message (broadcast).
See esp32-led-board/esp32-led-board.ino for wiring and libraries.

## API
- POST /api/text      send a message
- GET  /api/latest    latest message (JSON)
- GET  /api/latest.txt latest message as plain text: id|text (for ESP32 / LED boards)
- GET  /api/history   last messages (?limit=20, max 200)
Messages are kept in memory (last 200); they are lost when the server restarts.
