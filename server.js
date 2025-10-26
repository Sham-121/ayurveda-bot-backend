// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Validate API key
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing in your environment variables");
  process.exit(1);
}

// Validate Assistant ID
if (!process.env.ASSISTANT_ID) {
  console.error("❌ ASSISTANT_ID is missing in your environment variables");
  process.exit(1);
}

// Initialize OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => {
  res.send("✅ Ayurveda Bot Backend is running!");
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "Message is required and must be a non-empty string" });
    }

    // Send request to your trained Ayurveda assistant
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // base model that supports assistants
      assistant: process.env.ASSISTANT_ID,
      input: message,
    });

    // Safely extract assistant reply
    const botReply =
      response?.output?.[0]?.content?.[0]?.text ||
      "⚠️ The assistant did not return a valid response.";

    res.json({ reply: botReply });

  } catch (err) {
    console.error("Chat error:", err);

    // Differentiate between API errors and unexpected errors
    const errorMessage =
      err?.message ||
      "An unexpected error occurred while processing the request.";

    res.status(500).json({ error: errorMessage });
  }
});

// Use Render-assigned port if available
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
