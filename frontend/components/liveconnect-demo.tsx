"use client";

import Script from "next/script";

/**
 * Renders the LiveConnect widget script on all pages for demo purposes.
 */
export function LiveConnectDemo() {
  return (
    <Script
      src="https://hooman.live/sdk/liveconnect.js"
      data-key="lck_1GALKoQhjpNQg9uqUCLdKZ7eegLVipNUQQPy2iQ-Msw"
      strategy="afterInteractive"
    />
  );
}
