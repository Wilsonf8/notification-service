"""
NotifyKit SDK for Python.

Send notifications from your apps with a simple API.

Example:
    >>> from notifykit import NotifyKit
    >>> NotifyKit.init("nsk_your_api_key")
    >>> NotifyKit.notify("Hello world!")
"""

from __future__ import annotations

from typing import Optional

from .client import NotifyKitClient

__version__ = "1.0.0"
__all__ = ["NotifyKit", "__version__"]


class _NotifyKitSingleton:
    """
    NotifyKit SDK client singleton.

    Initialize once with your API key, then send notifications from anywhere.
    """

    _client: Optional[NotifyKitClient] = None
    _initialized: bool = False

    @classmethod
    def init(
        cls,
        api_key: str,
        *,
        base_url: str = "https://api.notifykit.dev",
        timeout: float = 10.0,
        debug: bool = False,
    ) -> None:
        """
        Initialize the NotifyKit SDK with your API key.

        Call this once at application startup.

        Args:
            api_key: Your NotifyKit API key (starts with 'nsk_').
            base_url: Custom API base URL. Defaults to 'https://api.notifykit.dev'.
            timeout: Request timeout in seconds. Defaults to 10.0.
            debug: Enable debug logging. Defaults to False.

        Example:
            >>> NotifyKit.init("nsk_your_api_key")

            # With options
            >>> NotifyKit.init(
            ...     "nsk_your_api_key",
            ...     debug=True,
            ... )
        """
        cls._client = NotifyKitClient(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            debug=debug,
        )
        cls._initialized = True

    @classmethod
    def notify(
        cls,
        message: str,
        *,
        topic: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> None:
        """
        Send a notification asynchronously.

        This method is fire-and-forget: it returns immediately and won't throw errors.
        Errors are logged to the console but won't crash your application.

        Args:
            message: The notification message to send.
            topic: Optional topic for categorization and filtering.
            idempotency_key: Optional key to prevent duplicate notifications.

        Example:
            >>> NotifyKit.notify("Hello world!")

            # With topic
            >>> NotifyKit.notify("New order received", topic="orders")

            # With idempotency key
            >>> NotifyKit.notify(
            ...     "Welcome!",
            ...     topic="onboarding",
            ...     idempotency_key=f"welcome-{user_id}",
            ... )
        """
        if not cls._initialized or cls._client is None:
            import logging

            logging.error(
                "[NotifyKit] Not initialized. Call NotifyKit.init() with your API key first."
            )
            return

        cls._client.send(message, topic=topic, idempotency_key=idempotency_key)

    @classmethod
    async def notify_async(
        cls,
        message: str,
        *,
        topic: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> None:
        """
        Send a notification using async/await.

        Use this method in async contexts like FastAPI or asyncio applications.
        Errors are logged but never raised.

        Args:
            message: The notification message to send.
            topic: Optional topic for categorization and filtering.
            idempotency_key: Optional key to prevent duplicate notifications.

        Example:
            >>> await NotifyKit.notify_async("Hello from async!")

            # In FastAPI
            >>> @app.post("/orders")
            ... async def create_order(order: Order):
            ...     await NotifyKit.notify_async(
            ...         f"New order #{order.id}",
            ...         topic="orders",
            ...     )
        """
        if not cls._initialized or cls._client is None:
            import logging

            logging.error(
                "[NotifyKit] Not initialized. Call NotifyKit.init() with your API key first."
            )
            return

        await cls._client.send_async(message, topic=topic, idempotency_key=idempotency_key)

    @classmethod
    def is_initialized(cls) -> bool:
        """
        Check if the SDK has been initialized.

        Returns:
            True if init() has been called with an API key.
        """
        return cls._initialized and cls._client is not None

    @classmethod
    def reset(cls) -> None:
        """
        Reset the SDK state.

        Useful for testing.
        """
        cls._client = None
        cls._initialized = False


# Export the singleton class directly
NotifyKit = _NotifyKitSingleton
