// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize OpenAI client with your API key
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health check endpoint
app.get("/", (req, res) => {
  res.send("✅ Ayurveda Bot Backend is running!");
});

// Chat endpoint using Assistants API
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    // Call OpenAI Assistants API with your ASSISTANT_ID
    const response = await client.assistants.chat({
      assistant: process.env.ASSISTANT_ID,
      input: message,
    });

    // The text reply is usually in response.output_text
    const botReply = response.output_text || "⚠️ No reply from assistant";

    res.json({ reply: botReply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to process message." });
  }
});

// Use the port from environment (Render sets it dynamically)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
