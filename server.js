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

// Endpoint for chatting with your Ayurveda assistant
app.post("/chat", async (req, res) => {
  try {
    const { message, threadId } = req.body;

    let thread;
    // If frontend has no existing thread, create one
    if (!threadId) {
      thread = await client.beta.threads.create();
    } else {
      thread = { id: threadId };
    }

    // Add user message
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    // Run assistant
    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    // Fetch messages
    const messages = await client.beta.threads.messages.list(thread.id);

    // Get latest message (assistant’s reply)
    const reply = messages.data[0].content[0].text.value;

    res.json({
      reply,
      threadId: thread.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
