/**
 * API Reference documentation page.
 * Widget events, methods, and programmatic control.
 * @module app/docs/api-reference/page
 */

/**
 * API Reference page for LiveConnect widget documentation.
 * Documents widget events and methods.
 */
export default function ApiReferencePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Reference</h1>
        <p className="mt-2 text-muted-foreground">
          Events, methods, and programmatic control for the LiveConnect widget.
        </p>
      </div>

      {/* Widget States */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Widget States</h2>
        <p className="text-muted-foreground">
          The LiveConnect widget transitions through several states during its lifecycle.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border border-border text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">State</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">COLLAPSED</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Small floating button - the default idle state
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">EXPANDED</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Panel with action buttons visible
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">WAITING</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Connecting to a rep with countdown timer
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">INCOMING_PING</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Rep is reaching out - shows Accept/Decline popup
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">IN_CALL</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Active video call with controls
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">POPPED_OUT</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Call has been moved to a separate browser window
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* WebSocket Events */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">WebSocket Events</h2>
        <p className="text-muted-foreground">
          The widget uses WebSocket for real-time communication with the server.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border border-border text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Event</th>
                <th className="px-4 py-3 text-left font-medium">Direction</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">presence</code>
                </td>
                <td className="px-4 py-3 text-blue-500">Server → Client</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Notifies about rep availability status
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">call_starting</code>
                </td>
                <td className="px-4 py-3 text-blue-500">Server → Client</td>
                <td className="px-4 py-3 text-muted-foreground">
                  A call is being initiated with connection details
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">ping</code>
                </td>
                <td className="px-4 py-3 text-blue-500">Server → Client</td>
                <td className="px-4 py-3 text-muted-foreground">
                  A rep is reaching out to the visitor
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">call_ended</code>
                </td>
                <td className="px-4 py-3 text-blue-500">Server → Client</td>
                <td className="px-4 py-3 text-muted-foreground">
                  The call has been terminated
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">JavaScript API</h2>
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-12">
          <div className="text-4xl">🚧</div>
          <h3 className="mt-4 text-lg font-medium">Coming Soon</h3>
          <p className="mt-2 text-center text-muted-foreground">
            Programmatic JavaScript API for controlling the widget,
            listening to events, and customizing behavior is coming soon.
          </p>
        </div>
      </section>

      {/* REST API */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">REST API</h2>
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-12">
          <div className="text-4xl">🚧</div>
          <h3 className="mt-4 text-lg font-medium">Coming Soon</h3>
          <p className="mt-2 text-center text-muted-foreground">
            REST API documentation for server-side integration is coming soon.
          </p>
        </div>
      </section>
    </div>
  );
}
