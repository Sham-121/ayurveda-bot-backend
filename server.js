// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health check
app.get("/", (req, res) => {
  res.send("✅ Ayurveda Bot Backend is running!");
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Send message to OpenAI
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",              // or any supported model
      assistant: process.env.ASSISTANT_ID,
      messages: [{ role: "user", content: message }],
    });

    // Extract bot reply
    const botReply = response.choices[0]?.message?.content || "⚠️ No reply from bot.";

    res.json({ reply: botReply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to process message." });
  }
});

// Port for Render free tier
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
