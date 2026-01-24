/**
 * SDK Documentation page.
 * Provides quick start guides and code examples for all supported languages.
 * @module app/dashboard/docs/page
 */
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CodeBlock } from "@/components/dashboard/docs/code-block";
import {
  LanguageTabs,
  LanguageTabContent,
  FrameworkTabs,
  FrameworkTabContent,
  FRAMEWORKS,
} from "@/components/dashboard/docs/language-tabs";

/** Code examples for each language */
const INSTALL_COMMANDS: Record<string, string> = {
  javascript: `# npm
npm install notifykitdev

# yarn
yarn add notifykitdev

# pnpm
pnpm add notifykitdev

# bun
bun add notifykitdev`,
  python: `# pip
pip install notifykitdev

# uv
uv add notifykitdev

# poetry
poetry add notifykitdev`,
  java: `<!-- Maven -->
<dependency>
    <groupId>dev.notifykit</groupId>
    <artifactId>notifykitdev</artifactId>
    <version>1.0.0</version>
</dependency>

// Gradle
implementation 'dev.notifykit:notifykitdev:1.0.0'`,
  curl: `# No installation needed
# cURL is available on most systems`,
};

const INIT_CODE: Record<string, string> = {
  javascript: `import NotifyKit from 'notifykitdev';

NotifyKit.init('nsk_your_api_key');`,
  python: `from notifykit import NotifyKit

NotifyKit.init("nsk_your_api_key")`,
  java: `import dev.notifykit.NotifyKit;

NotifyKit.init("nsk_your_api_key");`,
  curl: `# Set your API key as an environment variable
export NOTIFYKIT_API_KEY="nsk_your_api_key"`,
};

const NOTIFY_CODE: Record<string, string> = {
  javascript: `// Simple notification
NotifyKit.notify('User signed up!');

// With options
NotifyKit.notify('New order received', {
  topic: 'orders',
  idempotencyKey: 'order-123',
});`,
  python: `# Simple notification
NotifyKit.notify("User signed up!")

# With options
NotifyKit.notify(
    "New order received",
    topic="orders",
    idempotency_key="order-123",
)`,
  java: `// Simple notification
NotifyKit.notify("User signed up!");

// With options
NotifyKit.notify("New order received", NotifyOptions.builder()
    .topic("orders")
    .idempotencyKey("order-123")
    .build());`,
  curl: `curl -X POST https://api.notifykit.dev/v1/notify \\
  -H "X-API-Key: $NOTIFYKIT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "User signed up!"}'

# With options
curl -X POST https://api.notifykit.dev/v1/notify \\
  -H "X-API-Key: $NOTIFYKIT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-123" \\
  -d '{"message": "New order received", "topic": "orders"}'`,
};

/** Framework-specific examples */
const FRAMEWORK_EXAMPLES: Record<string, Record<string, string>> = {
  javascript: {
    express: `import express from 'express';
import NotifyKit from 'notifykitdev';

const app = express();

// Initialize once at startup
NotifyKit.init(process.env.NOTIFYKIT_API_KEY);

app.post('/api/orders', async (req, res) => {
  const order = await createOrder(req.body);

  // Fire-and-forget notification
  NotifyKit.notify(\`New order #\${order.id} for $\${order.total}\`, {
    topic: 'orders',
  });

  res.json(order);
});

app.listen(3000);`,
    nextjs: `// app/api/signup/route.ts
import NotifyKit from 'notifykitdev';

// Initialize (safe to call multiple times)
NotifyKit.init(process.env.NOTIFYKIT_API_KEY);

export async function POST(request: Request) {
  const { email } = await request.json();
  const user = await createUser(email);

  NotifyKit.notify(\`New signup: \${email}\`, {
    topic: 'signups',
    idempotencyKey: \`signup-\${user.id}\`,
  });

  return Response.json({ success: true });
}`,
    react: `import { useEffect } from 'react';
import NotifyKit from 'notifykitdev';

// Initialize outside component (runs once)
NotifyKit.init('nsk_your_api_key');

function FeedbackForm() {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const feedback = new FormData(e.target).get('feedback');

    // Safe to use in frontend (API key is write-only)
    NotifyKit.notify(\`New feedback: \${feedback}\`, {
      topic: 'feedback',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea name="feedback" required />
      <button type="submit">Send Feedback</button>
    </form>
  );
}`,
  },
  python: {
    fastapi: `from fastapi import FastAPI
from notifykit import NotifyKit
import os

app = FastAPI()

@app.on_event("startup")
def startup():
    NotifyKit.init(os.environ["NOTIFYKIT_API_KEY"])

@app.post("/api/orders")
async def create_order(order: dict):
    order_id = "12345"  # Your order creation logic

    # Fire-and-forget async notification
    await NotifyKit.notify_async(
        f"New order #{order_id}",
        topic="orders",
    )

    return {"id": order_id}`,
    flask: `from flask import Flask, request
from notifykit import NotifyKit
import os

app = Flask(__name__)

# Initialize at startup
NotifyKit.init(os.environ["NOTIFYKIT_API_KEY"])

@app.route("/api/signup", methods=["POST"])
def signup():
    email = request.json["email"]

    # Fire-and-forget notification (uses background thread)
    NotifyKit.notify(
        f"New signup: {email}",
        topic="signups",
    )

    return {"success": True}

if __name__ == "__main__":
    app.run()`,
    django: `# settings.py - Initialize at Django startup
import os
from notifykit import NotifyKit

NotifyKit.init(os.environ["NOTIFYKIT_API_KEY"])

# views.py
from django.http import JsonResponse
from notifykit import NotifyKit

def create_order(request):
    order_id = "12345"  # Your order creation logic

    # Fire-and-forget notification
    NotifyKit.notify(
        f"New order #{order_id}",
        topic="orders",
    )

    return JsonResponse({"id": order_id})`,
  },
  java: {
    spring: `// NotifyKitConfig.java
import dev.notifykit.NotifyKit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

@Configuration
public class NotifyKitConfig {
    @Value("\${notifykit.api-key}")
    private String apiKey;

    @PostConstruct
    public void init() {
        NotifyKit.init(apiKey);
    }
}

// OrderController.java
import dev.notifykit.NotifyKit;
import dev.notifykit.NotifyOptions;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @PostMapping
    public Order createOrder(@RequestBody CreateOrderRequest request) {
        Order order = orderService.create(request);

        // Fire-and-forget notification
        NotifyKit.notify("New order #" + order.getId(),
            NotifyOptions.builder()
                .topic("orders")
                .build());

        return order;
    }
}`,
    plain: `import dev.notifykit.NotifyKit;
import dev.notifykit.NotifyOptions;

public class Main {
    public static void main(String[] args) {
        // Initialize from environment variable
        NotifyKit.init(System.getenv("NOTIFYKIT_API_KEY"));

        // Send notification
        NotifyKit.notify("Application started", NotifyOptions.builder()
            .topic("system")
            .build());

        // Your application logic...
    }
}`,
  },
};

/**
 * Documentation page component.
 * Shows SDK installation, initialization, and usage examples.
 */
export default function DocsPage() {
  const [language, setLanguage] = useState("javascript");
  const [framework, setFramework] = useState<Record<string, string>>({
    javascript: "express",
    python: "fastapi",
    java: "spring",
  });

  /**
   * Handles framework tab change for a specific language.
   */
  const handleFrameworkChange = (lang: string, fw: string) => {
    setFramework((prev) => ({ ...prev, [lang]: fw }));
  };

  /**
   * Gets the current framework for the selected language.
   */
  const getCurrentFramework = () => {
    return framework[language] || FRAMEWORKS[language]?.[0]?.id || "";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Documentation</h1>
        <p className="text-muted-foreground">
          Get started with NotifyKit SDKs in your favorite language
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            Send your first notification in under a minute
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageTabs value={language} onValueChange={setLanguage}>
            {/* JavaScript */}
            <LanguageTabContent value="javascript">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">1. Install</h3>
                  <CodeBlock code={INSTALL_COMMANDS.javascript} language="bash" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">2. Initialize (once at startup)</h3>
                  <CodeBlock code={INIT_CODE.javascript} language="typescript" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">3. Send notifications</h3>
                  <CodeBlock code={NOTIFY_CODE.javascript} language="typescript" />
                </div>
              </div>
            </LanguageTabContent>

            {/* Python */}
            <LanguageTabContent value="python">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">1. Install</h3>
                  <CodeBlock code={INSTALL_COMMANDS.python} language="bash" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">2. Initialize (once at startup)</h3>
                  <CodeBlock code={INIT_CODE.python} language="python" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">3. Send notifications</h3>
                  <CodeBlock code={NOTIFY_CODE.python} language="python" />
                </div>
              </div>
            </LanguageTabContent>

            {/* Java */}
            <LanguageTabContent value="java">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">1. Install</h3>
                  <CodeBlock code={INSTALL_COMMANDS.java} language="xml" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">2. Initialize (once at startup)</h3>
                  <CodeBlock code={INIT_CODE.java} language="java" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">3. Send notifications</h3>
                  <CodeBlock code={NOTIFY_CODE.java} language="java" />
                </div>
              </div>
            </LanguageTabContent>

            {/* cURL */}
            <LanguageTabContent value="curl">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">1. Install</h3>
                  <CodeBlock code={INSTALL_COMMANDS.curl} language="bash" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">2. Set your API key</h3>
                  <CodeBlock code={INIT_CODE.curl} language="bash" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">3. Send notifications</h3>
                  <CodeBlock code={NOTIFY_CODE.curl} language="bash" />
                </div>
              </div>
            </LanguageTabContent>
          </LanguageTabs>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Framework Examples</CardTitle>
          <CardDescription>
            Copy-paste examples for popular frameworks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageTabs value={language} onValueChange={setLanguage}>
            {/* JavaScript Frameworks */}
            <LanguageTabContent value="javascript">
              <FrameworkTabs
                language="javascript"
                value={framework.javascript}
                onValueChange={(fw) => handleFrameworkChange("javascript", fw)}
              >
                <FrameworkTabContent value="express">
                  <CodeBlock
                    code={FRAMEWORK_EXAMPLES.javascript.express}
                    language="typescript"
                  />
                </FrameworkTabContent>
                <FrameworkTabContent value="nextjs">
                  <CodeBlock
                    code={FRAMEWORK_EXAMPLES.javascript.nextjs}
                    language="typescript"
                  />
                </FrameworkTabContent>
                <FrameworkTabContent value="react">
                  <CodeBlock
                    code={FRAMEWORK_EXAMPLES.javascript.react}
                    language="typescript"
                  />
                </FrameworkTabContent>
              </FrameworkTabs>
            </LanguageTabContent>

            {/* Python Frameworks */}
            <LanguageTabContent value="python">
              <FrameworkTabs
                language="python"
                value={framework.python}
                onValueChange={(fw) => handleFrameworkChange("python", fw)}
              >
                <FrameworkTabContent value="fastapi">
                  <CodeBlock
                    code={FRAMEWORK_EXAMPLES.python.fastapi}
                    language="python"
                  />
                </FrameworkTabContent>
                <FrameworkTabContent value="flask">
                  <CodeBlock
                    code={FRAMEWORK_EXAMPLES.python.flask}
                    language="python"
                  />
                </FrameworkTabContent>
                <FrameworkTabContent value="django">
                  <CodeBlock
                    code={FRAMEWORK_EXAMPLES.python.django}
                    language="python"
                  />
                </FrameworkTabContent>
              </FrameworkTabs>
            </LanguageTabContent>

            {/* Java Frameworks */}
            <LanguageTabContent value="java">
              <FrameworkTabs
                language="java"
                value={framework.java}
                onValueChange={(fw) => handleFrameworkChange("java", fw)}
              >
                <FrameworkTabContent value="spring">
                  <CodeBlock
                    code={FRAMEWORK_EXAMPLES.java.spring}
                    language="java"
                  />
                </FrameworkTabContent>
                <FrameworkTabContent value="plain">
                  <CodeBlock
                    code={FRAMEWORK_EXAMPLES.java.plain}
                    language="java"
                  />
                </FrameworkTabContent>
              </FrameworkTabs>
            </LanguageTabContent>

            {/* cURL */}
            <LanguageTabContent value="curl">
              <div className="rounded-none bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  cURL can be used directly from the command line or integrated
                  into any language using system calls or HTTP libraries.
                </p>
              </div>
            </LanguageTabContent>
          </LanguageTabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Reference</CardTitle>
          <CardDescription>
            Complete API documentation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Endpoint</h3>
            <CodeBlock
              code={`POST https://api.notifykit.dev/v1/notify`}
              language="http"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Headers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium">Header</th>
                    <th className="px-4 py-2 text-left font-medium">Required</th>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-2 font-mono">X-API-Key</td>
                    <td className="px-4 py-2">Yes</td>
                    <td className="px-4 py-2">Your NotifyKit API key</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2 font-mono">Content-Type</td>
                    <td className="px-4 py-2">Yes</td>
                    <td className="px-4 py-2">Must be application/json</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2 font-mono">Idempotency-Key</td>
                    <td className="px-4 py-2">No</td>
                    <td className="px-4 py-2">Unique key to prevent duplicate notifications</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Request Body</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium">Field</th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-left font-medium">Required</th>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-2 font-mono">message</td>
                    <td className="px-4 py-2">string</td>
                    <td className="px-4 py-2">Yes</td>
                    <td className="px-4 py-2">The notification message</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2 font-mono">topic</td>
                    <td className="px-4 py-2">string</td>
                    <td className="px-4 py-2">No</td>
                    <td className="px-4 py-2">Topic for categorization</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Response</h3>
            <CodeBlock
              code={`{
  "eventId": "evt_abc123",
  "status": "accepted"
}`}
              language="json"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Design Principles</CardTitle>
          <CardDescription>
            Why the SDKs work the way they do
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground">Async / Non-blocking</h3>
            <p>
              All SDK methods return immediately without waiting for the API
              response. Notifications are sent in background threads or using
              async HTTP clients.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Silent Failures</h3>
            <p>
              SDKs never throw errors or crash your application. All errors are
              logged to the console but won&apos;t interrupt your code flow.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Frontend-safe</h3>
            <p>
              API keys are write-only and can safely be used in frontend code.
              They can only send notifications, not read any data.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Zero/Minimal Dependencies</h3>
            <p>
              JavaScript SDK has zero dependencies. Python uses httpx. Java uses
              the built-in HttpClient. Keep your dependency tree clean.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
