# Product Requirements Document: SimpleOtel
## A Developer-Friendly Observability Platform

## 1. Executive Summary

### 1.1 Problem Statement
Current observability solutions like Langfuse, while powerful, present significant complexity in setup and maintenance. Developers building small to medium applications or working in development environments face an unnecessarily high barrier to entry for implementing proper LLM and application observability.

### 1.2 Vision
Create a dead-simple, single-binary observability server that "just works" out of the box while maintaining compatibility with OpenTelemetry standards. The goal is to reduce setup time from hours to minutes without sacrificing essential observability features.

### 1.3 Target Audience
- Individual developers
- Small development teams
- Startup environments
- Development/staging environments
- Small to medium production applications

## 2. Product Overview

### 2.1 Core Value Proposition
**"Zero-config observability that grows with you."**

- Single binary deployment
- SQLite for instant start (Postgres for production scaling)
- Full OpenTelemetry compatibility
- Langfuse-like features without the complexity
- Bun runtime for exceptional performance

### 2.2 Key Differentiators
- **Simplicity First**: No Docker required, no orchestration, no complex configuration
- **Progressive Enhancement**: Start with SQLite, move to Postgres when needed
- **OTel Native**: Built on open standards, not proprietary protocols
- **Developer Experience**: Clear logs, helpful error messages, sensible defaults

## 3. Technical Architecture

### 3.1 Technology Stack
- **Runtime**: Bun (for speed and built-in tooling)
- **Database**: SQLite (default) / PostgreSQL (configurable)
- **ORM**: Drizzle (for type safety and migrations)
- **Protocols**: OTLP/gRPC, OTLP/HTTP
- **Language**: TypeScript

### 3.2 System Components

┌─────────────────┐
│ OTLP Receiver │ ← HTTP/gRPC endpoints
├─────────────────┤
│ Trace Processor│
├─────────────────┤
│ Storage Layer │ ← Drizzle ORM
├─────────────────┤
│ Query API │ ← REST endpoints
├─────────────────┤
│ Web UI │ ← Static assets
└─────────────────┘


### 3.3 Database Schema (Simplified)

```typescript
// Core tables
traces {
  id: string
  trace_id: string
  name: string
  start_time: timestamp
  end_time: timestamp
  attributes: json
  status: enum
}

spans {
  id: string
  trace_id: string
  parent_span_id: string?
  name: string
  span_kind: enum
  start_time: timestamp
  end_time: timestamp
  attributes: json
  events: json[]
  links: json[]
  status: enum
}

observations {
  id: string
  span_id: string
  model: string
  prompt: text
  completion: text
  tokens_input: integer
  tokens_output: integer
  cost: decimal
  metadata: json
}

metrics {
  id: string
  name: string
  timestamp: timestamp
  value: float
  attributes: json
}
```

## 4. Functional Requirements

### 4.1 Core Features (Must Have)

### 4.1.1 OTLP Ingestion

Accept OTLP/gRPC traces (port 4317)
Accept OTLP/HTTP traces (port 4318)
Support for both JSON and Protobuf formats
Automatic span-to-observation mapping for LLM spans
Batching and async processing for performance

### 4.1.2 Trace Storage & Querying

Store traces with full fidelity
Support for trace ID and span ID lookups
Time-based filtering
Attribute-based filtering
Full-text search in observations

### 4.1.3 Basic UI

Trace list view with filtering
Individual trace detail view with span timeline
LLM observation cards showing prompts/completions
Simple metrics dashboard (requests, latency, errors)
Dark mode (because every dev tool needs it)

### 4.1.4 LLM-Specific Features

Automatic cost calculation (configurable per model)
Prompt/completion visualization
Token usage tracking
Model performance metrics

### 4.2 Enhanced Features (Should Have)

### 4.2.1 Analytics

Aggregated metrics over time
Percentile latency calculations
Error rate tracking
Usage by model/application

### 4.2.2 Export Capabilities

Export traces to JSON
Integration with common logging tools
Webhook notifications for alerts

### 4.2.3 Multi-Environment Support

Basic API key authentication
Environment tagging (dev/staging/prod)
Data isolation per environment

### 4.3 Advanced Features (Nice to Have)

### 4.3.1 Sampling

Head-based sampling
Tail-based sampling rules
Dynamic sampling rates

### 4.3.2 Alerting

Basic alert configuration
Webhook integrations (Slack, Discord)
Email notifications

### 4.3.3 Advanced Querying

Trace comparison
Pattern detection
Anomaly detection basics

## 5. User Experience

### 5.1 Getting Started Flow

# Installation
curl -fsSL https://simpleotel.dev/install.sh | sh
# or
bunx create-simpleotel

# Start server
simpleotel start

# Output:
# ✅ SimpleOtel server running!
# 📡 OTLP/gRPC endpoint: localhost:4317
# 📡 OTLP/HTTP endpoint: localhost:4318
# 🌐 Web UI: http://localhost:3000
# 📊 Database: SQLite (./data/simpleotel.db)


# config.yaml (optional)
```yaml
server:
  port: 3000
  grpc_port: 4317
  http_port: 4318

database:
  type: sqlite  # or postgres
  connection: "./data/simpleotel.db"
  # postgres: postgresql://user:pass@localhost/db

storage:
  retention_days: 30
  max_traces: 1000000

observability:
  service_name: simpleotel
  sample_rate: 1.0  # 1.0 = 100%

llm:
  models:
    gpt-4:
      cost_per_input_token: 0.00003
      cost_per_output_token: 0.00006
    gpt-3.5-turbo:
      cost_per_input_token: 0.0000015
      cost_per_output_token: 0.000002
```


### 5.2 SDK Integration Example

```typescript
// Your app - just change the endpoint
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app');
// Point to SimpleOtel instead of Langfuse
// That's it!
```

## 6. Technical Requirements

### 6.1 Performance Targets

Trace ingestion: 10,000 spans/second (SQLite), 50,000+ (Postgres)
Query latency: < 100ms for recent traces
UI load time: < 2 seconds
Memory usage: < 500MB baseline
Disk usage: Optimized storage format

### 6.2 Scalability

SQLite: Up to 100GB, suitable for development/small production
Postgres: Horizontal scaling, replication support
Read replicas for query heavy workloads

### 6.3 Security

TLS support for all endpoints
Basic authentication options
CORS configuration
Rate limiting capabilities

## 7. Implementation Phases

### 7.1 Phase 1: MVP (Week 1-2)

Basic Bun server setup
OTLP/gRPC receiver
SQLite storage with Drizzle
Basic trace storage and retrieval
Simple REST API for traces
Minimal UI showing traces

### 7.2 Phase 2: LLM Features (Week 3-4)

LLM span detection
Token usage tracking
Cost calculation
Enhanced UI with observation view
Search functionality

### 7.3 Phase 3: Production Ready (Week 5-6)

Postgres support
Authentication
Export capabilities
Performance optimizations
Documentation website

### 7.4 Phase 4: Advanced Features (Week 7-8)

Analytics dashboard
Sampling strategies
Alerting basics
Plugin system

## 8. Success Metrics

### 8.1 Technical Metrics

Time to first trace: < 2 minutes from download
Zero configuration required for basic use
99.9% compatibility with OTLP standard
< 1% CPU overhead on ingestion

### 8.2 User Metrics

Developer satisfaction score > 4.5/5
GitHub stars > 1000 in first month
Active installations > 500 in first quarter
Community contributions > 10 in first quarter


## 9. Open Questions

Naming: SimpleOtel, DevOtel, TraceSimple, OTel-Lite?
License: MIT vs Apache 2.0?
Plugin Architecture: WASM vs JavaScript plugins?
Commercial Model: Free forever vs paid enterprise features?
Migration Tool: From Langfuse to SimpleOtel?


10. Risks and Mitigations

Risk	Impact	Mitigation
Performance at scale	High	Progressive DB options, sampling
OTLP spec changes	Medium	Version pinning, regular updates
Bun runtime stability	Low	Fallback to Node.js if needed
Feature gap with Langfuse	Medium	Focus on 80% use case, plugins

## 11. Appendix

### 11.1 Comparison with Alternatives

Feature	SimpleOtel	Langfuse	Grafana Tempo	SigNoz
Setup Time	1 min	30+ min	60+ min	30+ min
Single Binary	✅	❌	❌	❌
SQLite Option	✅	❌	❌	❌
LLM Features	✅	✅	❌	⚠️
OTLP Native	✅	⚠️	✅	✅
Free Tier	✅	⚠️	✅	✅

### 11.2 Example Use Cases

Development Environment

```bash
# Developer wants to debug LLM calls
cd simpleotel
bun run dev
```

# Update OTEL_EXPORTER_OTLP_ENDPOINT to localhost:4317
bunx simpleotel start

# Open localhost:3000 to see traces
Small Production App

```bash
# Deploy single binary to VM
simpleotel start --config prod.yaml

# Scale with Postgres when needed
simpleotel migrate postgres
```
This PRD outlines a focused, practical approach to building a developer-friendly observability platform that fills the gap between "too complex" and "just works."


## 12. Testing Strategy

### 12.1 Testing Philosophy

**"Test the developer experience as much as the code."** Since SimpleOtel's core value proposition is simplicity and reliability, our testing strategy focuses on ensuring the system "just works" across different scenarios while maintaining performance and correctness.

### 12.2 Test Pyramid

╱╲
╱│╲ E2E Tests (10%)
╱ │ ╲ - Integration scenarios
╱ │ ╲ - Developer workflow tests
╱ │ ╲ - Upgrade paths
──────────
╲ │ ╱ Integration Tests (30%)
╲ │ ╱ - API contracts
╲ │ ╱ - Database compatibility
╲│╱ - OTLP protocol compliance
╲╱
╱╲ Unit Tests (60%)
╱ ╲ - Core logic
╱ ╲ - Span processing
╱ ╲ - Cost calculations
╱ ╲


### 12.3 Unit Testing

#### 12.3.1 Core Components

```typescript
// Example unit test structure
__tests__/
  ├── processor/
  │   ├── span-processor.test.ts
  │   ├── trace-builder.test.ts
  │   └── llm-detector.test.ts
  ├── storage/
  │   ├── trace-repository.test.ts
  │   ├── query-builder.test.ts
  │   └── migration.test.ts
  ├── api/
  │   ├── trace-api.test.ts
  │   └── validation.test.ts
  └── utils/
      ├── cost-calculator.test.ts
      └── otlp-converter.test.ts


### 12.3.2 Key Unit Test Scenarios

#### Span Processing

Correct span hierarchy building
Parent-child relationship validation
Timestamp ordering and duration calculation
Attribute sanitization and type coercion
LLM Detection

Identify LLM spans from semantic conventions
Extract prompt/completion from attributes
Handle different LLM provider formats (OpenAI, Anthropic, etc.)
Fallback behavior when attributes are missing

#### Cost Calculation

Token counting accuracy
Model-specific pricing application
Edge cases (zero tokens, negative values)
Custom model pricing configuration

#### Storage Layer

CRUD operations on traces/spans
JSON field querying
Transaction rollback on error
Connection pooling behavior

### 12.4 Integration Testing

#### 12.4.1 Database Compatibility Matrix

Database	Version	Test Coverage	CI Run
SQLite	3.x	✅ Full	Every PR
PostgreSQL	14, 15, 16	✅ Full	Nightly
PostgreSQL	13 (EOL)	⚠️ Critical	Release

#### 12.4.2 OTLP Protocol Compliance

```javascript      
// Protocol test scenarios
interface OTLPComplianceTest {
  name: "OTLP/gRPC" | "OTLP/HTTP";
  formats: ["protobuf", "json"];
  scenarios: [
    "single span",
    "batch spans",
    "with events",
    "with links",
    "malformed data",
    "large payloads"
  ];
}
```

#### 12.4.3 API Contract Tests

```typescript
describe('Trace API Contract', () => {
  test('GET /api/traces returns paginated results', async () => {
    const response = await request(app)
      .get('/api/traces')
      .query({ limit: 10, offset: 0 });
    
    expect(response.status).toBe(200);
    expect(response.body).toMatchSchema(traceListSchema);
  });

  test('GET /api/traces/:id returns full trace with spans', async () => {
    // Verify trace expansion includes all spans
  });

  test('Filtering by attributes works across DB backends', async () => {
    // Test same query on SQLite and Postgres returns same results
  });
});
```

### 12.5 End-to-End Testing

#### 12.5.1 Developer Workflow Tests

```bash
# Test scenario: Fresh install to first trace
test/fixtures/developer-workflow/
├── 01-fresh-install.test.sh
├── 02-first-trace.test.js
├── 03-ui-navigation.test.js
└── 04-config-changes.test.sh
```

#### 12.5.2 Scenario 1: First-Time User Experience

```bash
#!/bin/bash
# test/e2e/01-fresh-install.test.sh

# Test installation
curl -fsSL https://simpleotel.dev/install.sh | sh
assert_command_exists simpleotel

# Test startup
simpleotel start --test-mode
assert_port_listening 3000
assert_port_listening 4317
assert_port_listening 4318

# Test sample app integration
cd test/fixtures/sample-app
npm install
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 npm start
assert_trace_received "sample-app" "GET /"
```


#### 12.5.3 Scenario 2: LLM Tracing

```javascript
// test/e2e/02-llm-tracing.test.js
describe('LLM Tracing E2E', () => {
  test('OpenAI SDK integration', async () => {
    // Start SimpleOtel
    const server = await startSimpleOtel();
    
    // Run sample app with OpenAI
    const result = await runScript('./fixtures/openai-example.js');
    
    // Verify trace in UI
    const trace = await server.getTraceByFilter({
      'llm.model': 'gpt-4'
    });
    
    expect(trace.observations[0].prompt).toBeDefined();
    expect(trace.observations[0].tokens_total).toBeGreaterThan(0);
  });
});
```

#### 12.5.2 Upgrade Path Testing

```javascript
// test/e2e/upgrade-paths.test.ts
describe('Version Upgrades', () => {
  test('SQLite schema migrations', async () => {
    // Start with v0.1.0
    const oldVersion = await startVersion('0.1.0');
    await oldVersion.ingestTestData();
    
    // Upgrade to v0.2.0
    const newVersion = await upgrade(oldVersion, '0.2.0');
    
    // Verify data integrity
    const traces = await newVersion.getTraces();
    expect(traces.length).toBe(previousTraceCount);
    expect(traces[0].spans).toBeDefined(); // New feature
  });

  test('Postgres migration from SQLite', async () => {
    const sqlite = await startSQLite();
    await sqlite.ingestTestData();
    
    await sqlite.migrateToPostgres('postgresql://localhost/test');
    
    const postgres = await connectPostgres();
    assertDataMatches(sqlite, postgres);
  });
});
```

