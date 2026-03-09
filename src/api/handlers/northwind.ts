import { trace } from "@opentelemetry/api";
import {
    categories, suppliers, products,
    employees, customers, orders, orderDetails,
} from "../../tools/northwind-data";

const tracer = trace.getTracer("northwind-api", "0.1.0");

const db: Record<string, any[]> = {
    categories,
    suppliers,
    products,
    employees,
    customers,
    orders,
    orderDetails
};

export async function handleNorthwindQuery(req: Request, entity: string) {
    return tracer.startActiveSpan("handleNorthwindQuery", async (span) => {
        try {
            span.setAttribute("app.northwind.entity", entity);

            const data = db[entity];

            if (!data) {
                span.setStatus({ code: 2, message: `Entity ${entity} not found` }); // Error
                return new Response(JSON.stringify({ error: `Entity ${entity} not found` }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // Optional query parameters for filtering
            const url = new URL(req.url);
            const limitStr = url.searchParams.get("limit");
            const limit = limitStr ? parseInt(limitStr, 10) : 50;

            span.setAttribute("app.northwind.limit", limit);

            let resultInfo = data;

            // Limit the results
            if (limit > 0 && limit < resultInfo.length) {
                resultInfo = resultInfo.slice(0, limit);
            }

            span.setAttribute("app.northwind.returned_count", resultInfo.length);
            span.setStatus({ code: 1 }); // OK

            return new Response(JSON.stringify({
                entity,
                count: resultInfo.length,
                data: resultInfo
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } catch (err: any) {
            console.error("Northwind query error:", err);
            span.recordException(err);
            span.setStatus({ code: 2, message: err.message }); // Error
            return new Response(JSON.stringify({ error: "Failed to handle query", details: err.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        } finally {
            span.end();
        }
    });
}
