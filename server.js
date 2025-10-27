import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Check for required env vars on startup
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
if (!OPENAI_API_KEY || !ASSISTANT_ID) {
  console.error("❌ Missing required env vars: OPENAI_API_KEY or ASSISTANT_ID");
  process.exit(1);
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

app.get("/", (req, res) => {
  res.send("✅ Ayurveda Bot Backend is running!");
});

app.post("/chat", async (req, res) => {
  let threadId = null;
  
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    console.log("Creating thread...");
    const thread = await client.beta.threads.create();
    threadId = thread.id;
    console.log("Thread created:", threadId);

    // Add messages to thread
    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        await client.beta.threads.messages.create(threadId, {
          role: msg.role,
          content: msg.content,
        });
      }
    }

    console.log("Creating run...");
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });
    console.log("Run created:", run.id);

    // Poll for completion with better error handling
    let runStatus = await client.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    const maxAttempts = 60; // Increased timeout
    const pollInterval = 1000; // 1 second

    while (attempts < maxAttempts) {
      runStatus = await client.beta.threads.runs.retrieve(threadId, run.id);
      console.log(`Poll attempt ${attempts + 1}: status = ${runStatus.status}`);

      if (runStatus.status === 'completed') {
        break;
      }

      if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
        throw new Error(`Run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
      }

      if (runStatus.status === 'requires_action') {
        throw new Error('Run requires action - function calling not implemented');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Assistant run timed out after ${maxAttempts} attempts. Status: ${runStatus.status}`);
    }

    // Get response with validation
    const threadMessages = await client.beta.threads.messages.list(threadId);
    
    if (!threadMessages.data || threadMessages.data.length === 0) {
      throw new Error('No messages returned from assistant');
    }

    const latestMessage = threadMessages.data[0];
    if (!latestMessage.content || latestMessage.content.length === 0) {
      throw new Error('Assistant message has no content');
    }

    const botReply = latestMessage.content[0].text.value;

    res.json({ reply: botReply });

  } catch (err) {
    console.error("Chat error:", err.message, err.stack);
    
    // Return more specific error messages
    const errorMessage = err.message || "Failed to process message";
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    // Optional: Clean up thread (OpenAI has limits on thread count)
    // Uncomment if you want to delete threads after each conversation
    if (threadId) {
      try {
        await client.beta.threads.del(threadId);
        console.log("Thread deleted:", threadId);
      } catch (delErr) {
        console.error("Failed to delete thread:", delErr.message);
      }
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));