# NotifyKit Python SDK

Official NotifyKit SDK for Python. Send notifications from your apps with a simple, non-blocking API.

## Features

- Python 3.8+ support
- Works with FastAPI, Flask, Django, and any Python app
- Async support with `notify_async()` for async frameworks
- Fire-and-forget - notifications are sent in background threads
- Silent failures - logs errors but never crashes your app
- Type hints included (PEP 561 compatible)

## Installation

```bash
# pip
pip install notifykitdev

# uv
uv add notifykitdev

# poetry
poetry add notifykitdev

# pipenv
pipenv install notifykitdev
```

## Quick Start

```python
from notifykit import NotifyKit

# Initialize once at startup
NotifyKit.init("nsk_your_api_key")

# Send notifications anywhere in your app
NotifyKit.notify("User signed up!")
```

## API Reference

### `NotifyKit.init(api_key, **options)`

Initialize the SDK with your API key. Call this once at application startup.

```python
# Simple initialization
NotifyKit.init("nsk_your_api_key")

# With options
NotifyKit.init(
    "nsk_your_api_key",
    base_url="https://api.notifykit.dev",  # optional, custom API URL
    timeout=10.0,  # optional, request timeout in seconds
    debug=True,  # optional, enable debug logging
)
```

### `NotifyKit.notify(message, **options)`

Send a notification using a background thread. Returns immediately without blocking.

```python
# Simple message
NotifyKit.notify("Hello world!")

# With topic for categorization
NotifyKit.notify("New order received", topic="orders")

# With idempotency key to prevent duplicates
NotifyKit.notify(
    "Welcome email sent",
    topic="onboarding",
    idempotency_key=f"welcome-{user_id}",
)
```

### `NotifyKit.notify_async(message, **options)`

Send a notification using async/await. Use this in async frameworks like FastAPI.

```python
await NotifyKit.notify_async("Hello from async!")
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `topic` | `str` | Categorize notifications for filtering |
| `idempotency_key` | `str` | Prevent duplicate notifications |

### `NotifyKit.is_initialized()`

Check if the SDK has been initialized.

```python
if not NotifyKit.is_initialized():
    NotifyKit.init("nsk_your_api_key")
```

## Framework Examples

### FastAPI

```python
from fastapi import FastAPI
from notifykit import NotifyKit
import os

app = FastAPI()

# Initialize at startup
@app.on_event("startup")
def startup():
    NotifyKit.init(os.environ["NOTIFYKIT_API_KEY"])

@app.post("/api/orders")
async def create_order(order: dict):
    # Create order logic...
    order_id = "12345"

    # Fire-and-forget async notification
    await NotifyKit.notify_async(
        f"New order #{order_id}",
        topic="orders",
    )

    return {"id": order_id}
```

### Flask

```python
from flask import Flask, request
from notifykit import NotifyKit
import os

app = Flask(__name__)

# Initialize at startup
NotifyKit.init(os.environ["NOTIFYKIT_API_KEY"])

@app.route("/api/signup", methods=["POST"])
def signup():
    email = request.json["email"]
    # Create user logic...

    # Fire-and-forget notification (uses background thread)
    NotifyKit.notify(
        f"New signup: {email}",
        topic="signups",
    )

    return {"success": True}

if __name__ == "__main__":
    app.run()
```

### Django

```python
# settings.py - Initialize at Django startup
import os
from notifykit import NotifyKit

NotifyKit.init(os.environ["NOTIFYKIT_API_KEY"])

# views.py
from django.http import JsonResponse
from notifykit import NotifyKit

def create_order(request):
    # Create order logic...
    order_id = "12345"

    # Fire-and-forget notification
    NotifyKit.notify(
        f"New order #{order_id}",
        topic="orders",
    )

    return JsonResponse({"id": order_id})
```

### Django with Async Views

```python
# views.py
from django.http import JsonResponse
from notifykit import NotifyKit

async def create_order_async(request):
    # Create order logic...
    order_id = "12345"

    # Async notification
    await NotifyKit.notify_async(
        f"New order #{order_id}",
        topic="orders",
    )

    return JsonResponse({"id": order_id})
```

### Background Tasks (Celery, RQ, etc.)

```python
# tasks.py
from celery import Celery
from notifykit import NotifyKit
import os

app = Celery("tasks")

# Initialize in worker
NotifyKit.init(os.environ["NOTIFYKIT_API_KEY"])

@app.task
def process_payment(payment_id: str):
    # Process payment logic...

    NotifyKit.notify(
        f"Payment {payment_id} processed",
        topic="payments",
    )
```

### CLI Scripts

```python
#!/usr/bin/env python3
import os
from notifykit import NotifyKit
import time

NotifyKit.init(os.environ["NOTIFYKIT_API_KEY"])

def main():
    # Your script logic...
    NotifyKit.notify("Script completed!", topic="scripts")

    # Give background thread time to send before exit
    time.sleep(1)

if __name__ == "__main__":
    main()
```

## Error Handling

The SDK is designed to never throw errors or crash your app. All errors are logged but won't interrupt your code:

```python
# This won't throw even if the API is down
NotifyKit.notify("Hello world!")

# Enable debug mode for more detailed logging
NotifyKit.init(
    "nsk_your_api_key",
    debug=True,
)
```

## Type Hints

Full type hint support is included. The package is PEP 561 compatible with a `py.typed` marker.

```python
from notifykit import NotifyKit

# IDE will show correct types and autocomplete
NotifyKit.init("nsk_your_api_key")
NotifyKit.notify("Hello!", topic="greetings")
```

## License

MIT
