import { tool, zodSchema } from "ai";
import { z } from "zod";
import {
  categories, suppliers, products,
  employees, customers, orders, orderDetails,
} from "./northwind-data";

// ── Customers ──────────────────────────────────────────────────────────────

export const listCustomers = tool({
  description: "List customers, optionally filtered by country or partial company/contact name.",
  inputSchema: zodSchema(z.object({
    country: z.string().optional().describe("Filter by country (case-insensitive)"),
    search:  z.string().optional().describe("Partial match on company name or contact"),
    limit:   z.number().int().min(1).max(50).default(10),
  })),
  execute: async ({ country, search, limit }) => {
    let result = customers;
    if (country) result = result.filter(c => c.country.toLowerCase() === country.toLowerCase());
    if (search)  result = result.filter(c =>
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase())
    );
    return result.slice(0, limit);
  },
});

export const getCustomer = tool({
  description: "Get full details for a single customer by their ID (e.g. ALFKI).",
  inputSchema: zodSchema(z.object({
    customerId: z.string().describe("The 5-character customer ID"),
  })),
  execute: async ({ customerId }) => {
    const customer = customers.find(c => c.id === customerId.toUpperCase());
    if (!customer) return { error: `Customer ${customerId} not found` };
    const customerOrders = orders.filter(o => o.customerId === customer.id);
    return { ...customer, orderCount: customerOrders.length };
  },
});

// ── Orders ─────────────────────────────────────────────────────────────────

export const listOrders = tool({
  description: "List orders, optionally filtered by customer, employee, or date range.",
  inputSchema: zodSchema(z.object({
    customerId: z.string().optional().describe("Filter by customer ID"),
    employeeId: z.number().int().optional().describe("Filter by employee ID"),
    fromDate:   z.string().optional().describe("ISO date string, inclusive lower bound"),
    toDate:     z.string().optional().describe("ISO date string, inclusive upper bound"),
    limit:      z.number().int().min(1).max(50).default(10),
  })),
  execute: async ({ customerId, employeeId, fromDate, toDate, limit }) => {
    let result = orders;
    if (customerId) result = result.filter(o => o.customerId === customerId.toUpperCase());
    if (employeeId) result = result.filter(o => o.employeeId === employeeId);
    if (fromDate)   result = result.filter(o => o.orderDate >= fromDate);
    if (toDate)     result = result.filter(o => o.orderDate <= toDate);
    return result.slice(0, limit).map(o => ({
      ...o,
      customer: customers.find(c => c.id === o.customerId)?.company,
      employee: employees.find(e => e.id === o.employeeId),
    }));
  },
});

export const getOrder = tool({
  description: "Get a specific order with full line items, product names, and totals.",
  inputSchema: zodSchema(z.object({
    orderId: z.number().int().describe("The numeric order ID"),
  })),
  execute: async ({ orderId }) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return { error: `Order ${orderId} not found` };

    const lines = orderDetails
      .filter(d => d.orderId === orderId)
      .map(d => {
        const product = products.find(p => p.id === d.productId);
        const lineTotal = d.unitPrice * d.quantity * (1 - d.discount);
        return {
          productId:   d.productId,
          productName: product?.name ?? "Unknown",
          unitPrice:   d.unitPrice,
          quantity:    d.quantity,
          discount:    d.discount,
          lineTotal:   Math.round(lineTotal * 100) / 100,
        };
      });

    const orderTotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    return {
      ...order,
      customer:   customers.find(c => c.id === order.customerId),
      employee:   employees.find(e => e.id === order.employeeId),
      lines,
      orderTotal: Math.round((orderTotal + order.freight) * 100) / 100,
    };
  },
});

// ── Products ───────────────────────────────────────────────────────────────

export const listProducts = tool({
  description: "List products, optionally filtered by category, supplier, or stock status.",
  inputSchema: zodSchema(z.object({
    categoryId:          z.number().int().optional().describe("Filter by category ID"),
    supplierId:          z.number().int().optional().describe("Filter by supplier ID"),
    inStockOnly:         z.boolean().default(false).describe("Only return products with stock > 0"),
    includeDiscontinued: z.boolean().default(false),
    limit:               z.number().int().min(1).max(50).default(10),
  })),
  execute: async ({ categoryId, supplierId, inStockOnly, includeDiscontinued, limit }) => {
    let result = products;
    if (!includeDiscontinued) result = result.filter(p => !p.discontinued);
    if (categoryId)  result = result.filter(p => p.categoryId === categoryId);
    if (supplierId)  result = result.filter(p => p.supplierId === supplierId);
    if (inStockOnly) result = result.filter(p => p.unitsInStock > 0);
    return result.slice(0, limit).map(p => ({
      ...p,
      category: categories.find(c => c.id === p.categoryId)?.name,
      supplier: suppliers.find(s => s.id === p.supplierId)?.name,
    }));
  },
});

export const getProduct = tool({
  description: "Get full details for a single product by ID.",
  inputSchema: zodSchema(z.object({
    productId: z.number().int(),
  })),
  execute: async ({ productId }) => {
    const product = products.find(p => p.id === productId);
    if (!product) return { error: `Product ${productId} not found` };
    return {
      ...product,
      category: categories.find(c => c.id === product.categoryId),
      supplier: suppliers.find(s => s.id === product.supplierId),
    };
  },
});

// ── Categories & Employees ─────────────────────────────────────────────────

export const listCategories = tool({
  description: "List all product categories.",
  inputSchema: zodSchema(z.object({})),
  execute: async () => categories,
});

export const listEmployees = tool({
  description: "List all sales employees.",
  inputSchema: zodSchema(z.object({})),
  execute: async () => employees,
});

// ── Analytics ──────────────────────────────────────────────────────────────

export const getSalesSummary = tool({
  description: "Aggregate sales totals grouped by category or by employee. Good for 'which category sells most' or 'who is the top salesperson'.",
  inputSchema: zodSchema(z.object({
    groupBy: z.enum(["category", "employee"]).describe("Dimension to group totals by"),
  })),
  execute: async ({ groupBy }) => {
    const totals: Record<string, number> = {};

    for (const detail of orderDetails) {
      const order = orders.find(o => o.id === detail.orderId);
      if (!order) continue;
      const product = products.find(p => p.id === detail.productId);
      if (!product) continue;

      let key: string;
      if (groupBy === "category") {
        key = categories.find(c => c.id === product.categoryId)?.name ?? "Unknown";
      } else {
        const emp = employees.find(e => e.id === order.employeeId);
        key = emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
      }

      const lineTotal = detail.unitPrice * detail.quantity * (1 - detail.discount);
      totals[key] = (totals[key] ?? 0) + lineTotal;
    }

    return Object.entries(totals)
      .map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  },
});

export const getLowStockProducts = tool({
  description: "Find products running low on stock (below a given threshold).",
  inputSchema: zodSchema(z.object({
    threshold: z.number().int().default(20).describe("Units-in-stock threshold"),
  })),
  execute: async ({ threshold }) =>
    products
      .filter(p => !p.discontinued && p.unitsInStock < threshold)
      .map(p => ({
        ...p,
        category: categories.find(c => c.id === p.categoryId)?.name,
      }))
      .sort((a, b) => a.unitsInStock - b.unitsInStock),
});

// ── Exported toolset ───────────────────────────────────────────────────────

export const northwindTools = {
  listCustomers,
  getCustomer,
  listOrders,
  getOrder,
  listProducts,
  getProduct,
  listCategories,
  listEmployees,
  getSalesSummary,
  getLowStockProducts,
};
