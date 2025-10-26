import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Route to check if backend is alive
app.get("/", (req, res) => {
  res.send("✅ Ayurveda Bot Backend is running successfully!");
});

// Route to send messages to your OpenAI Assistant
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Create a thread if needed or use existing one (simplified single-turn)
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an Ayurveda expert helping users with holistic, herbal, and lifestyle-based health advice.",
        },
        { role: "user", content: message },
      ],
    });

    const botReply = response.choices[0].message.content;
    res.json({ reply: botReply });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to process the message." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
