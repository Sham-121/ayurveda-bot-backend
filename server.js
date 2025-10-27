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

// Log SDK version on startup
console.log("OpenAI SDK initialized");

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

    console.log("Creating and polling run...");
    
    // Use createAndPoll - simpler and more reliable
    const run = await client.beta.threads.runs.createAndPoll(
      threadId,
      { 
        assistant_id: ASSISTANT_ID 
      },
      { 
        pollIntervalMs: 1000 
      }
    );

    console.log("Run completed with status:", run.status);

    if (run.status === 'completed') {
      // Get response
      const threadMessages = await client.beta.threads.messages.list(threadId);
      
      if (!threadMessages.data || threadMessages.data.length === 0) {
        throw new Error('No messages returned from assistant');
      }

      const latestMessage = threadMessages.data[0];
      if (!latestMessage.content || latestMessage.content.length === 0) {
        throw new Error('Assistant message has no content');
      }

      const botReply = latestMessage.content[0].text.value;
      console.log("✅ Successfully got reply");
      return res.json({ reply: botReply });
    }

    if (run.status === 'failed') {
      throw new Error(`Run failed: ${run.last_error?.message || 'Unknown error'}`);
    }

    if (run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(`Run ${run.status}`);
    }

    if (run.status === 'requires_action') {
      throw new Error('Run requires action - function calling not implemented');
    }

    throw new Error(`Unexpected run status: ${run.status}`);

  } catch (err) {
    console.error("❌ Chat error:", err.message);
    console.error("Error stack:", err.stack);
    
    const errorMessage = err.message || "Failed to process message";
    res.status(500).json({ 
      error: errorMessage
    });
  } finally {
    // Clean up thread
    if (threadId) {
      try {
        await client.beta.threads.delete(threadId);
        console.log("Thread deleted:", threadId);
      } catch (delErr) {
        console.error("Failed to delete thread:", delErr.message);
      }
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));