// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check
app.get("/", (req, res) => {
  res.send("✅ Ayurveda Bot Backend is running!");
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Call the assistant using both model and assistant ID
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",               // Recommended for custom assistants
      assistant: process.env.ASSISTANT_ID, // Your Assistant ID
      messages: [
        { role: "user", content: message }
      ],
    });

    // Get the assistant's reply
    const botReply = response.choices[0]?.message?.content || "No response from assistant.";

    res.json({ reply: botReply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to process message." });
  }
});

// Use Render's port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
