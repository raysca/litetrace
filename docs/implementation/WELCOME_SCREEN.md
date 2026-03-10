# Welcome Screen Implementation

## Overview

Implemented a comprehensive welcome screen for LiteTrace that appears on first visit when no traces exist. The screen guides new users through a 3-step setup process to get their first trace running in 2 minutes.

## Design (from `.pen` file)

The welcome screen design is in `litetrace.pen` with node ID `71otU`:
- **Header** with LiteTrace branding
- **Three visible steps** (all at once):
  1. Language selection (Node.js, Python, Go)
  2. Copy OTLP endpoint (`localhost:4317`)
  3. Code snippet example
- **Real-time status indicator** showing server running and trace detection
- **Footer** with links to docs and settings
- **Color scheme**: Matches existing LiteTrace UI (white, gray accents, blue primary)

## Implementation

### Files Created

1. **`src/ui/components/WelcomeScreen.tsx`**
   - React functional component
   - Props:
     - `onDismiss: () => void` — called when welcome screen should close
     - `hasTraces: boolean` — triggers auto-dismiss when first trace arrives
   - Features:
     - Language selection with 3 buttons (Node.js, Python, Go)
     - Dynamic code snippet display based on selected language
     - One-click "Copy" button for endpoint
     - Real-time status indicator with pulsing dot
     - Auto-dismiss when `hasTraces` becomes true
     - Links to docs and settings

### Files Modified

1. **`src/ui/pages/Dashboard.tsx`**
   - Added `WelcomeScreen` import
   - Added `showWelcome` state to track welcome screen visibility
   - Modified `load()` function to hide welcome screen when `totalTraces > 0`
   - Added conditional rendering: shows `WelcomeScreen` when `showWelcome && !hasTraces`

### Test Files Created

1. **`__tests__/ui/WelcomeScreen.test.ts`**
   - Component existence and import tests
   - Props validation tests
   - Component type checking

2. **`__tests__/ui/Dashboard.integration.test.ts`**
   - Dashboard/WelcomeScreen integration tests
   - Code structure verification tests
   - Feature completeness checks

## Behavior

### On First Visit

1. User visits LiteTrace (Dashboard route)
2. Dashboard fetches stats from `/api/dashboard/stats`
3. If `totalTraces === 0`, welcome screen is shown
4. User sees setup instructions with their preferred language

### Language Selection

- Clicking a language button (Node.js, Python, Go) highlights it and updates the code snippet
- Defaults to Node.js on first load
- Persists in component state during session

### Copy Endpoint

- Clicking "Copy" button copies `localhost:4317` to clipboard
- Button shows confirmation state for 2 seconds ("Copied" + checkmark)
- Uses browser's Clipboard API with error handling

### Auto-Dismiss

- Once user sends first trace to the server
- Dashboard refetches stats and detects `totalTraces > 0`
- Passes `hasTraces={true}` to WelcomeScreen
- WelcomeScreen's `useEffect` calls `onDismiss()` automatically
- Dashboard hides welcome screen and shows normal dashboard

## Styling

Uses existing LiteTrace design system:
- **Typography**: System fonts (default), monospace for code
- **Colors**: Primary blue (#0066CC), muted grays, success green
- **Spacing**: Consistent padding and gaps with Tailwind
- **Components**: Buttons, code blocks, status indicators
- **Effects**: Pulsing animation on status dot, transition on button copy state

## Code Snippets Included

### Node.js
```javascript
import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('my-app');
tracer.startActiveSpan('hello', (span) => { /* your code */ });
```

### Python
```python
from opentelemetry import trace
tracer = trace.get_tracer('my-app')
with tracer.start_as_current_span('hello'):
    # your code here
```

### Go
```go
import "go.opentelemetry.io/otel"
tracer := otel.Tracer("my-app")
ctx, span := tracer.Start(ctx, "hello")
defer span.End()
```

## Testing

Run tests with:
```bash
bun test __tests__/ui/WelcomeScreen.test.ts
bun test __tests__/ui/Dashboard.integration.test.ts
```

## Future Enhancements

- [ ] Persist language preference in localStorage
- [ ] Add more language options (Java, Ruby, .NET, etc.)
- [ ] Show protocol selection (gRPC vs HTTP)
- [ ] Add copy-to-clipboard success toast notification
- [ ] Track welcome screen dismissal analytics
- [ ] Add video walkthrough or documentation links
- [ ] Implement polling to auto-dismiss when traces arrive
