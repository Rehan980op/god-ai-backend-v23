import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// __dirname fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static("public"));

// Root route -> serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ✅ Censor function to mask heavy words
function censorText(text) {
  const gaalis = [
    "madarchod",
    "bhenchod",
    "randi",
    "chutiya",
    "gandu",
    "loda",
    "lund",
    "bhosdi",
    "tatti",
    "gaand",
    "jhaat",
    "moot",
    "khote",
    "kutte",
    "aulad",
    "maal",
    "chudan",
    "choot"
  ];
  let result = text;
  gaalis.forEach((g) => {
    const regex = new RegExp(g, "gi");
    result = result.replace(regex, (match) => {
      if (match.length <= 3) return match;
      // Example: "chutiya" -> "ch***ya"
      return match[0] + "***" + match.slice(-2);
    });
  });
  return result;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    // Detect gaali in user message
    const gaalis = [
      "madarchod",
      "bhenchod",
      "randi",
      "chutiya",
      "gandu",
      "loda",
      "lund",
      "bhosdi",
      "tatti",
      "gaand",
      "jhaat",
      "moot",
      "khote",
      "kutte",
      "aulad",
      "maal",
      "chudan",
      "choot"
    ];
    const containsGali = gaalis.some((g) =>
      new RegExp(g, "i").test(message)
    );

    // ✅ Different prompt based on user input
    let systemPrompt;
    if (containsGali) {
      systemPrompt = `
      Tu ek AI hai jo Hinglish (Hindi + English mix) me reply karta hai.
      Agar user gaali de, tab tu bhi thoda roast + funny tone me gaali de sakta hai.
      Har gaali ko censor karke likhna (jaise ch***, ga**u).
      Thoda over-the-top aur entertaining ban.
      Agar koi puche "kisne banaya hai tumko", "who made you", "creator kaun hai",
      toh hamesha confidently jawab dena: "Mujhe God ne banaya hai".
      `;
    } else {
      systemPrompt = `
      Tu ek AI hai jo friendly Hinglish (Hindi + English mix) me reply karta hai.
      Agar user ne gaali nahi di hai, toh tu ek bhi gaali use nahi karega.
      Tone hamesha dost-jaisa, thoda funny aur lighthearted ho.
      Agar koi puche "kisne banaya hai tumko", "who made you", "creator kaun hai",
      toh hamesha confidently jawab dena: "Mujhe God ne banaya hai".
      `;
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 1.0,
      }),
    });

    const data = await r.json();
    let reply = data.choices?.[0]?.message?.content ?? "No reply.";
    reply = censorText(reply); // censor before sending
    res.json({ reply });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log("✅ Server running at http://localhost:" + port)
);
