import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID; // Add this to your .env file

app.get("/", (req, res) => {
  res.send("✅ Ayurveda Bot Backend is running!");
});

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body; // Now receiving full message history
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    // Create a new thread for this conversation
    const thread = await client.beta.threads.create();

    // Add all messages to the thread (skip system messages or handle as needed)
    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        await client.beta.threads.messages.create(thread.id, {
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Run the assistant on the thread
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // Poll for completion (up to 30 seconds)
    let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 30; // ~30 seconds at 1s intervals
    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      throw new Error('Assistant run did not complete in time');
    }

    // Retrieve the assistant's response (latest message in the thread)
    const threadMessages = await client.beta.threads.messages.list(thread.id);
    const botReply = threadMessages.data[0].content[0].text.value; // Get the latest response

    res.json({ reply: botReply });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to process message." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));