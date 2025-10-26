import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => {
  res.send("✅ Ayurveda Bot Backend is running!");
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const response = await client.chat.completions.create({
      assistant: process.env.ASSISTANT_ID,
      input: message,
    });

    const botReply = response.output[0].content[0].text;
    res.json({ reply: botReply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to process message." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
