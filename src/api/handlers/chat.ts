import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { trace } from "@opentelemetry/api";
import { northwindTools } from "../../tools/northwind-tools";

const tracer = trace.getTracer("litetrace-assistant", "0.1.0");

const SYSTEM = `\
You are a helpful assistant for the Northwind trading company.
You have access to tools to query customers, orders, products, categories, employees, and sales data.

Guidelines:
- Always use the available tools to look up real data — never make up values.
- For complex questions, break the work into multiple tool calls (e.g. list customers first, then fetch their orders).
- When presenting results, format them clearly with totals, names, and dates where relevant.
- If a tool returns an error, tell the user and suggest alternatives.

Example questions you can answer:
- "Show me all orders for customer ALFKI"
- "Which product category has the highest sales?"
- "List products running low on stock"
- "Who are our top employees by sales?"
- "Give me the full details of order 10248"
`;

export async function handleChat(req: Request) {
    try {
        const { messages } = await req.json();
        console.log("Chat request:", JSON.stringify(messages));
        const modelName = process.env.AI_MODEL || "gpt-4o-mini";

        const aiProvider = createOpenAICompatible({
            name: "custom-provider",
            baseURL: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
            apiKey: process.env.LLM_KEY || "dummy",
        });

        const result = streamText({
            model: aiProvider(modelName),
            messages: await convertToModelMessages(messages),
            system: SYSTEM,
            tools: northwindTools,
            stopWhen: stepCountIs(10), // allow multi-step tool chains
            experimental_telemetry: {
                isEnabled: true,
                functionId: "chat.completion",
                tracer,
                metadata: {
                    model: modelName,
                    messageCount: messages.length,
                },
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (err) {
        console.error("Chat error:", err);
        return new Response(JSON.stringify({ error: "Failed to handle chat" }), { status: 500 });
    }
}
