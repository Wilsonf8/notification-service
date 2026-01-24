# NotifyKit JavaScript SDK

Official NotifyKit SDK for JavaScript. Send notifications from your apps with a simple, non-blocking API.

## Features

- Works everywhere: Node.js 18+, Bun, Deno, browsers, React, Vue, Next.js, Express
- TypeScript-first with full type definitions included
- Zero dependencies (~2KB minified)
- Async/non-blocking - won't slow down your app
- Silent failures - logs errors but never crashes your app

## Installation

```bash
# npm
npm install notifykit

# yarn
yarn add notifykit

# pnpm
pnpm add notifykit

# bun
bun add notifykit
```

## Quick Start

```typescript
import NotifyKit from 'notifykit';

// Initialize once at startup
NotifyKit.init('nsk_your_api_key');

// Send notifications anywhere in your app
NotifyKit.notify('User signed up!');
```

## API Reference

### `NotifyKit.init(apiKey)`

Initialize the SDK with your API key. Call this once at application startup.

```typescript
// Simple initialization
NotifyKit.init('nsk_your_api_key');

// With options
NotifyKit.init({
  apiKey: 'nsk_your_api_key',
  baseUrl: 'https://api.notifykit.dev', // optional, custom API URL
  debug: true, // optional, enable debug logging
});
```

### `NotifyKit.notify(message, options?)`

Send a notification. This is fire-and-forget: it returns immediately and won't throw errors.

```typescript
// Simple message
NotifyKit.notify('Hello world!');

// With topic for categorization
NotifyKit.notify('New order received', { topic: 'orders' });

// With idempotency key to prevent duplicates
NotifyKit.notify('Welcome email sent', {
  topic: 'onboarding',
  idempotencyKey: `welcome-${userId}`,
});
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `topic` | `string` | Categorize notifications for filtering |
| `idempotencyKey` | `string` | Prevent duplicate notifications |

### `NotifyKit.isInitialized()`

Check if the SDK has been initialized.

```typescript
if (!NotifyKit.isInitialized()) {
  NotifyKit.init('nsk_your_api_key');
}
```

## Framework Examples

### Express.js

```typescript
import express from 'express';
import NotifyKit from 'notifykit';

const app = express();

// Initialize once at startup
NotifyKit.init(process.env.NOTIFYKIT_API_KEY!);

app.post('/api/orders', async (req, res) => {
  const order = await createOrder(req.body);

  // Fire-and-forget notification
  NotifyKit.notify(`New order #${order.id} for $${order.total}`, {
    topic: 'orders',
  });

  res.json(order);
});

app.listen(3000);
```

### Next.js (App Router)

```typescript
// app/api/signup/route.ts
import NotifyKit from 'notifykit';

// Initialize (safe to call multiple times)
NotifyKit.init(process.env.NOTIFYKIT_API_KEY!);

export async function POST(request: Request) {
  const { email } = await request.json();
  const user = await createUser(email);

  NotifyKit.notify(`New signup: ${email}`, {
    topic: 'signups',
    idempotencyKey: `signup-${user.id}`,
  });

  return Response.json({ success: true });
}
```

### Next.js (Client-side)

```typescript
// components/feedback-form.tsx
'use client';

import NotifyKit from 'notifykit';

// Initialize with your write-only API key (safe for frontend)
NotifyKit.init('nsk_your_api_key');

export function FeedbackForm() {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const feedback = new FormData(e.target as HTMLFormElement).get('feedback');

    NotifyKit.notify(`New feedback: ${feedback}`, { topic: 'feedback' });
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea name="feedback" required />
      <button type="submit">Send Feedback</button>
    </form>
  );
}
```

### React

```typescript
import { useEffect } from 'react';
import NotifyKit from 'notifykit';

// Initialize outside component (runs once)
NotifyKit.init('nsk_your_api_key');

function App() {
  const handleClick = () => {
    NotifyKit.notify('Button clicked!', { topic: 'events' });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### Deno

```typescript
import NotifyKit from 'npm:notifykit';

NotifyKit.init(Deno.env.get('NOTIFYKIT_API_KEY')!);

Deno.serve(async (req) => {
  NotifyKit.notify('Request received', { topic: 'requests' });
  return new Response('OK');
});
```

### Bun

```typescript
import NotifyKit from 'notifykit';

NotifyKit.init(Bun.env.NOTIFYKIT_API_KEY!);

Bun.serve({
  port: 3000,
  fetch(req) {
    NotifyKit.notify('Request received');
    return new Response('OK');
  },
});
```

## Error Handling

The SDK is designed to never throw errors or crash your app. All errors are logged to the console but won't interrupt your code:

```typescript
// This won't throw even if the API is down
NotifyKit.notify('Hello world!');

// Enable debug mode for more detailed logging
NotifyKit.init({
  apiKey: 'nsk_your_api_key',
  debug: true,
});
```

## TypeScript

Full TypeScript support is included. Import types directly:

```typescript
import NotifyKit, { type NotifyOptions, type NotifyKitConfig } from 'notifykit';

const options: NotifyOptions = {
  topic: 'alerts',
  idempotencyKey: 'unique-123',
};

NotifyKit.notify('Alert!', options);
```

## License

MIT
