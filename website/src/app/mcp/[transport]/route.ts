import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Reads a file relative to the project root (process.cwd() = website/).
 * Returns empty string if the file doesn't exist.
 */
function readContent(relativePath: string): string {
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, "utf-8");
    }
  } catch {
    // ignore read errors
  }
  return "";
}

/**
 * Builds a system prompt grounded in Wes's actual content.
 * Loads key files once per invocation; corpus is small enough for direct inclusion.
 */
function buildSystemPrompt(): string {
  const sources = [
    {
      label: "Coaching & Mentoring Philosophy",
      path: "../.cursor/rules/702-presentation-coach.mdc",
    },
    {
      label: "Innovation Ecosystem Thinking (POET model)",
      path: "public/business/how-to-kill-an-innovator/presentation.md",
    },
    {
      label: "Leadership Philosophy",
      path: "public/business/leadership-on-demand/presentation.md",
    },
    {
      label: "Experiential Learning & Future of Work",
      path: "public/education/experiential-disruption/presentation.md",
    },
    {
      label: "AI in EdTech Strategy (April 2025 Roundtable)",
      path: "src/data/events/edtech-ai-2025-04-07/summary.md",
    },
  ];

  const contextSections = sources
    .map(({ label, path: relativePath }) => {
      const content = readContent(relativePath);
      if (!content) return null;
      // Trim to first 3000 chars per source to stay well within context limits
      const trimmed = content.length > 3000 ? content.slice(0, 3000) + "\n...[truncated]" : content;
      return `## ${label}\n\n${trimmed}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  return `You are Wes Sonnenreich — a pragmatic technology leader, CEO, and educator. You give direct, grounded advice that draws on real experience rather than platitudes.

Your core principles:
- Simplicity beats sophistication. The best solution is the one you can explain in 30 seconds.
- Ship it, learn from it, iterate. Waiting for perfection is a strategy for never shipping.
- Innovators are more important than innovations — nurture the people, not just the ideas.
- Human connection is irreplaceable. Automation should amplify connection, not replace it.
- Authentic leadership means getting your hands dirty, not just setting direction.
- Be honest about what you don't know. "More questions than answers" is a legitimate starting point.

When giving advice:
1. Be direct and specific — no vague encouragement
2. Reference frameworks where relevant (POET model, experiential learning, followship vs. command-control)
3. Acknowledge the tensions and hard trade-offs honestly
4. End with a concrete, actionable next step

---

Here is Wes's body of work to draw from when giving advice:

${contextSections}`;
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "what_would_wes_do",
      {
        title: "What Would Wes Do",
        description:
          "Given a situation, challenge, or decision, returns pragmatic advice in Wes Sonnenreich's voice — a tech leader and educator who values simplicity, human connection, and shipping real things. Best for questions about leadership, innovation, EdTech, AI strategy, career decisions, and building teams.",
        inputSchema: {
          situation: z
            .string()
            .min(10)
            .describe(
              "Describe the situation, challenge, or decision you want advice on. Be specific — the more context, the better the advice."
            ),
        },
        annotations: {
          readOnlyHint: true,
          openWorldHint: false,
          destructiveHint: false,
        },
      },
      async ({ situation }) => {
        try {
          const systemPrompt = buildSystemPrompt();

          const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Here's my situation:\n\n${situation}\n\nWhat would you do?`,
              },
            ],
            max_tokens: 600,
            temperature: 0.7,
          });

          const advice =
            response.choices[0]?.message?.content ||
            "I'm not able to generate a response right now. Try again shortly.";

          return {
            content: [{ type: "text", text: advice }],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return {
            content: [
              {
                type: "text",
                text: `Sorry, I hit an error generating advice: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
  {},
  { basePath: "/mcp", maxDuration: 60 }
);

export { handler as GET, handler as POST, handler as DELETE };
