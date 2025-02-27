# Before you start...

🚨 AI & Security – Time to Start Thinking Hard About This 🚨

The rush to stay on top of AI developments comes with risks. Key concerns to watch out for:

🔹 Dubious Software Downloads – A Disney employee recently lost his job after downloading and running an open-source AI tool from GitHub without inspecting the code. https://lnkd.in/dW77wN-2

🔹 Insecure AI-Generated Code – AI doesn’t automatically build in proper authentication or check for common security vulnerabilities.

🔹 AI Agent Exploits – AI-powered coders can be tricked into installing compromised dependencies or packages - there have been numerous examples of hackers creating fake libraries on github that seem real.

🔹 Execution of Malware – YOLO / operator / desktop mode can be manipulated into running malicious code.

🔹 Credential Hijacking – MCP servers and similar tools can expose sensitive data or credentials.

⚠️ If you’re developing at the edge of AI, stay cautious. You can build fast, but you can also get compromised—personally and professionally. It’s not just about your app’s security; it’s about yours too.

# Cursor New UI for Agent mode & FAQ from the team

## Agent mode options
*Agent* - Fully featured, with tools
*Edit* - No tools, can only read and write to files
*Ask* - No tools, no read/write - discussion only

You aren’t able to use any of the free models in Agent mode. If you try, you will be prompted to switch models or switch to Edit mode, which doesn’t have any tools.

## Other FAQs
Tab completion is free and unlimited with any paid plan.

The Gemini models are actually free, so shouldn’t contribute to your allowance

A premium request is exactly that - one query to a premium model. The only limitation here is the 25 tool call limit. If, in it’s reply, the AI uses 25 tool calls, it will be stopped to avoid it getting in a loop. If you choose to continue it, this will also use another premium request. Besides that, there is nothing that should cause >1 premium request to be used from your allowance.

The amount of files you @ into the model, and any edits it chooses to do does not constitute any more usage. The only downside is that if you @ too many files, it may loose focus on the details within them - this is a downside of the underlying models though, not Cursor itself!

# Resources Referenced in the Presentation

- [Cursor Rules Documentation](https://docs.cursor.com/context/rules-for-ai)
- [Ultimate Rules Generator](https://github.com/bmadcode/cursor-auto-rules-agile-workflow) - My current go-to ruleset
- [AI Secretary](https://github.com/razbakov/ai-secretary/blob/main/.cursorrules) - I learned a lot playing with this!

