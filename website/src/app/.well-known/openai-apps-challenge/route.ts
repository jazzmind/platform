import { NextResponse } from "next/server";

/**
 * Domain verification endpoint for OpenAI ChatGPT plugin submission.
 * The portal provides a token at submission time; set it as OPENAI_VERIFICATION_TOKEN
 * in your Vercel environment variables.
 * @see https://learn.chatgpt.com/docs/submit-plugins
 */
export async function GET() {
  const token = process.env.OPENAI_VERIFICATION_TOKEN || "";
  return new NextResponse(token, {
    headers: { "Content-Type": "text/plain" },
  });
}
