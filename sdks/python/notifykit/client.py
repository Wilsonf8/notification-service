"""
NotifyKit HTTP client implementation.

Handles async HTTP communication with the NotifyKit API.
"""

from __future__ import annotations

import logging
import threading
from typing import Optional

import httpx

logger = logging.getLogger("notifykit")

DEFAULT_BASE_URL = "https://api.notifykit.dev"
DEFAULT_TIMEOUT = 10.0


class NotifyKitClient:
    """
    HTTP client for NotifyKit API.

    Handles sending notifications asynchronously using a background thread
    to avoid blocking the main application.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        debug: bool = False,
    ) -> None:
        """
        Initialize the NotifyKit HTTP client.

        Args:
            api_key: Your NotifyKit API key (starts with 'nsk_').
            base_url: Custom API base URL. Defaults to 'https://api.notifykit.dev'.
            timeout: Request timeout in seconds. Defaults to 10.0.
            debug: Enable debug logging. Defaults to False.
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.debug = debug

        if debug:
            logging.basicConfig(level=logging.DEBUG)
            logger.setLevel(logging.DEBUG)

    def _log_debug(self, message: str, *args: object) -> None:
        """Log a debug message if debug mode is enabled."""
        if self.debug:
            logger.debug(message, *args)

    def _log_error(self, message: str, *args: object) -> None:
        """Log an error message."""
        logger.error(message, *args)

    def _send_sync(
        self,
        message: str,
        topic: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> None:
        """
        Send a notification synchronously.

        This method is called from a background thread to avoid blocking.

        Args:
            message: The notification message to send.
            topic: Optional topic for categorization.
            idempotency_key: Optional key to prevent duplicate notifications.
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "X-API-Key": self.api_key,
            }

            if idempotency_key:
                headers["Idempotency-Key"] = idempotency_key

            payload: dict[str, str] = {"message": message}
            if topic:
                payload["topic"] = topic

            self._log_debug("Sending notification: %s", message)

            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    f"{self.base_url}/v1/notify",
                    headers=headers,
                    json=payload,
                )

                if response.status_code >= 400:
                    error_data = response.json() if response.content else {}
                    self._log_error(
                        "Failed to send notification: %s %s",
                        response.status_code,
                        error_data.get("error", response.reason_phrase),
                    )
                    return

                data = response.json()
                self._log_debug("Notification sent successfully: %s", data.get("eventId"))

        except Exception as e:
            self._log_error("Failed to send notification: %s", str(e))

    def send(
        self,
        message: str,
        topic: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> None:
        """
        Send a notification asynchronously using a background thread.

        This method returns immediately and won't block your application.
        Errors are logged but never raised.

        Args:
            message: The notification message to send.
            topic: Optional topic for categorization.
            idempotency_key: Optional key to prevent duplicate notifications.
        """
        thread = threading.Thread(
            target=self._send_sync,
            args=(message, topic, idempotency_key),
            daemon=True,
        )
        thread.start()

    async def send_async(
        self,
        message: str,
        topic: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> None:
        """
        Send a notification using async/await.

        Use this method in async contexts like FastAPI or asyncio applications.
        Errors are logged but never raised.

        Args:
            message: The notification message to send.
            topic: Optional topic for categorization.
            idempotency_key: Optional key to prevent duplicate notifications.
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "X-API-Key": self.api_key,
            }

            if idempotency_key:
                headers["Idempotency-Key"] = idempotency_key

            payload: dict[str, str] = {"message": message}
            if topic:
                payload["topic"] = topic

            self._log_debug("Sending notification (async): %s", message)

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/v1/notify",
                    headers=headers,
                    json=payload,
                )

                if response.status_code >= 400:
                    error_data = response.json() if response.content else {}
                    self._log_error(
                        "Failed to send notification: %s %s",
                        response.status_code,
                        error_data.get("error", response.reason_phrase),
                    )
                    return

                data = response.json()
                self._log_debug("Notification sent successfully: %s", data.get("eventId"))

        except Exception as e:
            self._log_error("Failed to send notification: %s", str(e))
