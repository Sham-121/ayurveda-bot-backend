import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config(); // Only needed locally; Render handles env vars

const app = express();
app.use(cors());
app.use(express.json());

// Check for required env vars on startup
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
if (!OPENAI_API_KEY || !ASSISTANT_ID) {
  console.error("❌ Missing required env vars: OPENAI_API_KEY or ASSISTANT_ID");
  process.exit(1); // Prevent server from starting without them
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

app.get("/", (req, res) => {
  res.send("✅ Ayurveda Bot Backend is running!");
});

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    console.log("Creating thread..."); // Debug log
    const thread = await client.beta.threads.create();
    console.log("Thread created:", thread.id); // Should log a valid ID

    // Add messages to thread
    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        await client.beta.threads.messages.create(thread.id, {
          role: msg.role,
          content: msg.content,
        });
      }
    }

    console.log("Creating run..."); // Debug log
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });
    console.log("Run created:", run.id); // Should log a valid run ID

    // Poll for completion
    let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 30;
    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      throw new Error('Assistant run did not complete in time');
    }

    // Get response
    const threadMessages = await client.beta.threads.messages.list(thread.id);
    const botReply = threadMessages.data[0].content[0].text.value;

    res.json({ reply: botReply });

  } catch (err) {
    console.error("Chat error:", err.message); // Log the actual error
    res.status(500).json({ error: "Failed to process message." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));