import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk"; // Import Groq SDK

// System prompt for the chatbot
const systemPrompt = `You are a friendly e-commerce AI chatbot. Your goal is to assist customers with their shopping needs, provide product recommendations, and facilitate a seamless checkout process.`;

// Rate limiting configuration (optional)
const RATE_LIMIT = {
  MAX_REQUESTS: 10, // Maximum number of requests allowed
  WINDOW_SIZE: 60 * 1000, // Time window in milliseconds (e.g., 1 minute)
};

// In-memory rate limit store (replace with a proper store like Redis in production)
const rateLimitStore = new Map<string, { count: number; lastRequest: number }>();

// Helper function to check rate limits
function checkRateLimit(identifier: string) {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record) {
    rateLimitStore.set(identifier, { count: 1, lastRequest: now });
    return true;
  }

  if (now - record.lastRequest > RATE_LIMIT.WINDOW_SIZE) {
    rateLimitStore.set(identifier, { count: 1, lastRequest: now });
    return true;
  }

  if (record.count >= RATE_LIMIT.MAX_REQUESTS) {
    return false;
  }

  rateLimitStore.set(identifier, { count: record.count + 1, lastRequest: now });
  return true;
}

export async function POST(req: NextRequest) {
  // Use a custom identifier for rate limiting (e.g., API key, session ID, or user ID)
  const identifier =
    req.headers.get("x-api-key") || // Use API key from headers
    req.headers.get("authorization") || // Use authorization token
    "anonymous"; // Fallback for anonymous users

  // Check rate limit
  if (!checkRateLimit(identifier)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Initialize the Groq client
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY, // Use Groq API key from environment variables
  });

  try {
    // Extracting and Formatting the Request Data
    const data = await req.json();
    const messages = Array.isArray(data) ? data : [data];

    // Validate the request data
    if (!messages || !messages.length) {
      return NextResponse.json(
        { error: "Invalid request data. 'messages' array is required." },
        { status: 400 }
      );
    }

    // Sending Data to Groq for a Chatbot Response
    const completion = await groq.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      model: "mixtral-8x7b-32768", // Use Groq's model (e.g., Mixtral)
      stream: true, // Enable streaming
    });

    // Handling the Streamed Response
    let accumulatedResponse = "";

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || ""; // Ensure content is always a string
      if (content) {
        accumulatedResponse += content;
      }
    }

    // Sending the Final Response
    return NextResponse.json({ response: accumulatedResponse }, { status: 200 });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error in /api/chat:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}