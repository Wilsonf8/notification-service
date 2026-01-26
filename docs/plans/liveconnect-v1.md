# Plan: LiveConnect - Live Video Sales Engagement Feature

## Overview

Add a new project type "LiveConnect" alongside existing "NotifyKit" notifications. LiveConnect enables real-time video/voice chat between website visitors and sales reps.

**Tech Stack:** LiveKit Cloud (now) → LiveKit Self-Hosted (future)

---

## Architecture

```
Organization
├── Subscription (plan, limits, billing)
└── Projects
    ├── type: 'notifykit' → existing notification behavior
    └── type: 'liveconnect' → NEW video sales engagement
        ├── Embed Keys
        ├── Conversations (with messages)
        ├── Presence tracking (users + reps)
        └── LiveKit integration
```

---

## Project Type Selection

When creating a project:
1. User clicks "Create Project"
2. Chooses type: **NotifyKit** (notifications) or **LiveConnect** (video chat)
3. Type-specific configuration page loads

---

## Widget Distribution

**Approach:** Script tag (works everywhere including React/Next.js)

**Hosting:** Vercel (via Next.js frontend `/public/sdk/` folder)

```html
<!-- Basic embed -->
<script
  src="https://notifykit.dev/sdk/liveconnect@1.js"
  data-key="lck_xxx"
></script>

<!-- With identified user -->
<script
  src="https://notifykit.dev/sdk/liveconnect@1.js"
  data-key="lck_xxx"
  data-user-id="user_123"
  data-user-name="John Smith"
  data-user-email="john@acme.com"
></script>
```

See **Widget Build & Distribution** section for full details on build pipeline, versioning, and CDN setup.

**JavaScript API:**
```js
LiveConnect.identify({
  userId: 'user_123',
  name: 'John Smith',
  email: 'john@acme.com',
  company: 'Acme Corp'
})
```

**Idempotent loading (prevents double-embed issues):**
```js
// At the very start of liveconnect.js
(function() {
  // Already loaded? Skip duplicate initialization
  if (window.LiveConnect) {
    console.warn('LiveConnect already loaded');
    return;
  }

  // Mark as loaded immediately
  window.LiveConnect = {};

  // ... rest of initialization
  window.LiveConnect.identify = function(userData) { /* ... */ };
  window.LiveConnect.open = function() { /* ... */ };
  window.LiveConnect.close = function() { /* ... */ };
})();
```

If developer accidentally includes `<script>` twice:
- First load: initializes normally
- Second load: detects `window.LiveConnect` exists, skips
- Result: one widget, no duplicate connections

**Widget behavior:**
- Floating widget (bottom-right)
- Low-profile, non-intrusive
- Shows rep availability status (green/yellow/gray dot)
- **Call-first design:** No pre-call text messaging (this is NOT a chatbot)

**Widget states:**

```
1. COLLAPSED (default)
   └─ Small button: "💬 Talk to Sales" with availability dot

2. EXPANDED (user clicks button)
   ├─ If reps available (green):
   │    "Sales team is online"
   │    [ Request to Talk ]  ← Primary action
   │    [ Leave Your Info ]  ← Secondary
   │
   └─ If reps offline (gray):
        "Sales team is offline"
        [ Leave Your Info ]  ← Only option

3. WAITING (after Request to Talk)
   └─ "Connecting you with a rep..."
      Countdown timer: 0:28
      [ Cancel ]

4. IN-CALL (call connected)
   ├─ Video feeds (popup window)
   ├─ Mute/camera controls
   └─ Chat panel (NOW enabled for sharing links, info)
```

**Key difference from chat widgets:**
- NO text input before a call is connected
- Users either request a call OR leave contact info
- Chat is only available DURING an active video call (for sharing links, details)

**Controls:**
- ✕ Close → collapse to button
- □ Maximize → full-screen overlay (during call)

**Incoming ping notification:**
- Popup appears above widget (even when collapsed)
- Button pulses
- Sound chime plays
- Shows countdown timer + Accept/Decline buttons

**Sound notifications:**
- Rep pings user → attention chime
- Call connected/ended → connect/disconnect tone
- In-call message → soft ping
- User can mute via widget settings

**Browser autoplay policy (sound permissions):**

Browsers block autoplaying audio until user interacts with the page. Sounds only work after user has interacted with the widget.

```js
let audioUnlocked = false;

// Check if previously unlocked this session
if (sessionStorage.getItem('lc_audio_unlocked')) {
  audioUnlocked = true;
}

// On ANY widget interaction (click, expand, send message)
widget.addEventListener('click', () => {
  if (!audioUnlocked) {
    // Play silent sound to unlock AudioContext
    const silence = new Audio('data:audio/wav;base64,...');
    silence.play().then(() => {
      audioUnlocked = true;
      sessionStorage.setItem('lc_audio_unlocked', 'true');
    }).catch(() => {});
  }
});

// When playing notification sounds
function playChime(soundUrl) {
  if (!audioUnlocked) {
    // Can't play yet - visual notification still shows
    return;
  }
  new Audio(soundUrl).play().catch(() => {});
}
```

| Scenario | Sound | Visual |
|----------|-------|--------|
| User hasn't interacted with widget | ❌ Blocked by browser | ✅ Popup + pulse works |
| User clicked widget at least once | ✅ Plays | ✅ Popup + pulse works |

**Key:** Visual notifications (popup, red pulse, badge) always work. Sound is a bonus after first interaction.

---

## User Tracking

### Anonymous Users (Default)
```js
// Simple random UUID - no fingerprinting
visitor_id = localStorage.getItem('lc_visitor_id')
           || crypto.randomUUID();
localStorage.setItem('lc_visitor_id', visitor_id);
```
- Works out of the box - no developer setup required
- Stored in localStorage (first-party, no consent needed)
- No fingerprinting → no privacy/GDPR issues
- Sales rep sees: "Anonymous User" or "Visitor #a8f3k"
- Trade-off: Cleared storage or incognito = new visitor ID (acceptable for sales chat)

### Identified Users (Optional)
- **Completely optional** - developers can skip this entirely
- If provided, developer passes user info via data attributes or `LiveConnect.identify()`
- Sales rep sees: "John Smith (john@acme.com) from Acme Corp"
- Enables: returning user recognition, CRM integration, richer context

```html
<!-- Minimal embed (anonymous only) -->
<script src="https://cdn.notifykit.dev/liveconnect.js" data-key="lck_xxx"></script>

<!-- With optional user identification -->
<script
  src="https://cdn.notifykit.dev/liveconnect.js"
  data-key="lck_xxx"
  data-user-id="user_123"
  data-user-name="John Smith"
  data-user-email="john@acme.com"
></script>
```

---

## Video/Voice Features (V1)

| Feature | V1 | Future |
|---------|-----|--------|
| 1:1 calls only | ✓ | Group calls |
| Web only | ✓ | iOS/Android |
| Camera on/off | ✓ | |
| Mute/unmute | ✓ | |
| Voice isolation (Krisp) | ✓ | |
| Screen share | | Future |

---

## Presence System

### Three-State Rep Presence

```
OFFLINE    → Toggle set to unavailable, or no active session
AVAILABLE  → Toggle on + active session (heartbeat)
IN_CALL    → Currently in video call
```

### User Widget Shows

| Rep State | User Sees |
|-----------|-----------|
| AVAILABLE | Green "Rep available" - can request talk |
| IN_CALL | Yellow "Rep busy" - can wait or leave contact |
| OFFLINE | Gray "No reps online" - leave contact form |

### Availability Toggle + Heartbeat

- **Availability:** Explicit toggle (rep sets "available" or "unavailable")
- **Presence:** Automatic heartbeat (detects active session)
- **Combined:** Must be "available" AND have active session to appear online
- **Future iOS:** If available + no web session → push notification

**Heartbeat timing:**
- **Interval:** 15 seconds (client sends heartbeat every 15s)
- **Offline threshold:** 30 seconds (2 missed heartbeats)
- **Check query:** `last_heartbeat > NOW() - INTERVAL '30 seconds'`

```sql
-- Client sends heartbeat every 15s
UPDATE liveconnect_reps
SET last_heartbeat = NOW(),
    presence = 'online'
WHERE project_id = :projectId AND user_id = :userId;

-- Server checks for stale reps (run every 10s)
UPDATE liveconnect_reps
SET presence = 'offline'
WHERE presence = 'online'
  AND last_heartbeat < NOW() - INTERVAL '30 seconds';
```

### Multiple Browser Tabs

**Problem:** Rep opens dashboard in multiple tabs.

**Solution:** Track connections, sync state via BroadcastChannel.

**Server-side:**
```sql
-- Track active connections per rep
ALTER TABLE liveconnect_reps ADD COLUMN
    active_connections INT DEFAULT 0;

-- On WebSocket connect
UPDATE liveconnect_reps
SET active_connections = active_connections + 1,
    last_heartbeat = NOW(),
    presence = 'online'
WHERE project_id = :projectId AND user_id = :userId;

-- On WebSocket disconnect
UPDATE liveconnect_reps
SET active_connections = GREATEST(active_connections - 1, 0),
    last_heartbeat = NOW()
WHERE project_id = :projectId AND user_id = :userId;

-- Offline only when NO connections AND heartbeat stale
UPDATE liveconnect_reps
SET presence = 'offline'
WHERE presence = 'online'
  AND active_connections = 0
  AND last_heartbeat < NOW() - INTERVAL '30 seconds';
```

**Client-side (BroadcastChannel API):**
```js
// Sync state across tabs
const channel = new BroadcastChannel('liveconnect_rep');

// When availability changes in one tab
channel.postMessage({ type: 'availability_changed', value: 'available' });

// Other tabs listen
channel.onmessage = (e) => {
  if (e.data.type === 'availability_changed') {
    updateLocalState(e.data.value);
  }
};
```

**Prevent double calls:**
```js
// Before joining call, check if already in call in another tab
channel.postMessage({ type: 'call_check' });

// If another tab responds with 'in_call', block
channel.onmessage = (e) => {
  if (e.data.type === 'call_active') {
    showError("You're already in a call in another tab");
  }
};
```

**Behavior:**
- Any tab can send heartbeat (keeps rep online)
- Closing one tab doesn't make rep offline (other tabs still connected)
- Availability toggle syncs across all tabs instantly
- Only one tab can be in a call at a time
- Incoming requests appear in all tabs, first to accept wins

### Visitor Multiple Tabs

**Scenario:** User has website open in multiple tabs, widget loads in each.

Since `visitor_id` is in localStorage, all tabs share the same ID → **rep sees 1 user** (correct).

**Server-side tracking:**
```sql
-- Track connections per visitor (same pattern as reps)
ALTER TABLE liveconnect_visitors ADD COLUMN
    active_connections INT DEFAULT 0;

-- On widget WebSocket connect
UPDATE liveconnect_visitors
SET active_connections = active_connections + 1,
    last_seen_at = NOW()
WHERE id = :visitorId;

-- On widget WebSocket disconnect
UPDATE liveconnect_visitors
SET active_connections = GREATEST(active_connections - 1, 0),
    last_seen_at = NOW()
WHERE id = :visitorId;

-- Visitor "left" only when all tabs closed
-- (no connections for 30+ seconds)
```

**Client-side (BroadcastChannel):**
```js
const channel = new BroadcastChannel('liveconnect_visitor');

// Incoming ping → show in all tabs
channel.onmessage = (e) => {
  if (e.data.type === 'incoming_ping') {
    showPingPopup(e.data);
  }
  if (e.data.type === 'ping_accepted') {
    // Another tab accepted, hide popup in this tab
    hidePingPopup();
  }
  if (e.data.type === 'call_started') {
    // Call is in another tab
    showMessage("Call active in another tab");
  }
  if (e.data.type === 'message_received') {
    // Sync in-call chat across tabs (only during active call)
    addMessageToChat(e.data.message);
  }
};
```

**Behavior:**
- Rep sees 1 user (correct, same visitor_id)
- Incoming ping popup appears in ALL tabs
- First tab to accept gets the call
- Other tabs see "Call active in another tab"
- In-call chat messages sync across tabs (chat only available during calls)
- Visitor only shows as "left" when ALL tabs close

---

## Interaction Flow

### User Requests Talk
```
User clicks "Request Talk"
    ↓
All AVAILABLE reps see request in queue: "John Smith waiting [Accept] [Dismiss] 0:28"
    ↓
Rep clicks Accept → call starts, other reps see "User connected"
Rep clicks Dismiss → hides from THIS rep only, other reps still see it
    ↓
If 30s timeout → request expires, user can retry
```

**Important:** Reps can only **Accept** or **Dismiss** (not decline):
- **Accept** = Start the call
- **Dismiss** = Hide from my view (I don't want to take this one)
- User sees NOTHING when a rep dismisses - they keep waiting
- Request remains visible to other reps
- No cooldown triggered by dismiss

### Rep Pings User
```
Rep clicks "Ping" on specific user
    ↓
User sees: "Sales rep wants to talk [Accept] [Decline] 0:28"
    ↓
User clicks Accept → call starts
User clicks Decline → request cancelled, 30s cooldown for ALL reps
    ↓
If 30s timeout → request expires, 30s cooldown starts
```

**Important:** Users can **Accept** or **Decline** (active rejection):
- **Accept** = Start the call
- **Decline** = I don't want to talk right now (explicit rejection)
- Rep sees "User declined" notification
- Triggers 30s cooldown preventing ALL reps from pinging this user

**Multi-rep ping spam prevention:**
- Only ONE pending ping per visitor at a time (enforced by partial unique index)
- If user declines OR request expires → 30s cooldown for ALL reps
- Any rep trying to ping during cooldown gets "User recently declined a request"

```sql
-- Add cooldown tracking to visitors table
ALTER TABLE liveconnect_visitors ADD COLUMN
    ping_cooldown_until TIMESTAMP;

-- When user declines or request expires
UPDATE liveconnect_visitors
SET ping_cooldown_until = NOW() + INTERVAL '30 seconds'
WHERE id = :visitorId;

-- Before allowing rep to ping
SELECT ping_cooldown_until > NOW() AS in_cooldown
FROM liveconnect_visitors
WHERE id = :visitorId;
-- If in_cooldown = true, reject with "User recently declined"
```

### Simultaneous Ping
If user requests AND rep pings at same moment → auto-connect

### Race Condition Handling (Atomic Arbitration)

Prevents double-accept and ghost calls:

```sql
-- Single atomic UPDATE with proper idempotency
UPDATE liveconnect_requests
SET status = 'accepted',
    accepted_by_rep_id = :repId,
    accepted_at = COALESCE(accepted_at, NOW()),  -- Don't overwrite on retry
    conversation_id = COALESCE(conversation_id, :newConversationId)  -- Keep existing
WHERE id = :requestId
  AND (
    (status = 'pending' AND expires_at > NOW())  -- New accept: must not be expired
    OR
    (status = 'accepted' AND accepted_by_rep_id = :repId)  -- Idempotent retry: already accepted by same rep
  )
RETURNING id, conversation_id;

-- rowCount == 1 → success (new accept or idempotent retry)
-- rowCount == 0 → expired OR already accepted by different rep
```

**Guarantees:**
- First rep to execute wins (atomic WHERE check)
- Late accepts rejected (expires_at only checked for pending)
- Idempotent retries work even after expiry (already accepted)
- COALESCE prevents overwriting conversation_id on retry
- Second rep gets rowCount=0 → "User already connected"
- No ghost calls or duplicate rooms

### Simultaneous Ping + Request Handling

When user requests AND rep pings at same time:

```sql
-- Try to insert new request
INSERT INTO liveconnect_requests (
    id, project_id, visitor_id, initiated_by_rep_id, direction, status, expires_at
)
VALUES (:id, :projectId, :visitorId, :repId, :direction, 'pending', NOW() + INTERVAL '30 seconds')
ON CONFLICT (project_id, visitor_id) WHERE (status = 'pending')
DO UPDATE SET
    direction = 'mutual',  -- Mark as both sides initiated
    -- Capture rep if user initiated first (was NULL)
    initiated_by_rep_id = COALESCE(
        liveconnect_requests.initiated_by_rep_id,
        EXCLUDED.initiated_by_rep_id
    ),
    -- Keep earliest expires_at
    expires_at = LEAST(liveconnect_requests.expires_at, EXCLUDED.expires_at)
RETURNING id, direction;
```

**Auto-connect for mutual requests:**

```sql
-- If direction = 'mutual', immediately accept (both sides consented)
-- Called server-side after INSERT ON CONFLICT returns direction='mutual'
UPDATE liveconnect_requests
SET status = 'accepted',
    accepted_by_rep_id = COALESCE(accepted_by_rep_id, initiated_by_rep_id, :repId),
    accepted_at = COALESCE(accepted_at, NOW()),
    conversation_id = COALESCE(conversation_id, :newConversationId)
WHERE id = :requestId
  AND direction = 'mutual'
  AND expires_at > NOW()  -- Don't accept expired requests
  AND (
    status = 'pending'
    OR (status = 'accepted' AND accepted_by_rep_id = :repId)  -- Idempotent only for same rep
  )
RETURNING id, conversation_id;
```

**Note:** The `:repId` here is the rep who triggered the mutual (from `initiated_by_rep_id` or the current rep). This ensures only the accepting rep can retry idempotently.

**Rules:**
- Partial unique index prevents duplicate pending requests per project+visitor
- If both sides initiate within 30s window → `direction = 'mutual'`
- Mutual requests immediately transition to 'accepted' (skip countdown)
- `initiated_by_rep_id` captured via COALESCE when user initiated first
- Deterministic: first insert creates, second updates to 'mutual' and triggers accept

### Queue System
When rep is IN_CALL:
- New user requests are queued
- Rep sees "X users waiting" indicator during call
- After call ends, rep sees queued requests

**Queue ordering: FIFO (First In, First Out)**
- Requests ordered by `created_at ASC` (oldest first)
- User waiting longest gets priority
- All available reps see the same ordered queue

```sql
-- Fetch pending requests for project, oldest first
SELECT r.*, v.name, v.email, v.visitor_id
FROM liveconnect_requests r
JOIN liveconnect_visitors v ON v.id = r.visitor_id
WHERE r.project_id = :projectId
  AND r.status = 'pending'
  AND r.expires_at > NOW()
  AND r.direction IN ('user_to_reps', 'mutual')  -- Not rep-initiated pings
ORDER BY r.created_at ASC;
```

### Reps Go Offline During Pending Request

If all reps disconnect while a user's request is pending:

```
User request pending (28s remaining)
    ↓
All reps disconnect (heartbeat lost)
    ↓
Server detects: no available reps for this project
    ↓
WebSocket push to user: "all_reps_offline"
    ↓
User sees: "All reps are now unavailable"
         [Leave contact info] [Keep waiting]
```

**Behavior:**
- Request does NOT auto-expire (rep might reconnect)
- User gets real-time notification via WebSocket
- User can choose to:
  - **Keep waiting** - request continues, timer keeps counting
  - **Leave contact info** - opens contact form, request cancelled
  - **Cancel** - request marked as 'cancelled'
- If a rep comes back online before expiry → request resumes normally

**Server-side detection:**
```sql
-- Check if any reps still available for project
SELECT COUNT(*) FROM liveconnect_reps
WHERE project_id = :projectId
  AND availability = 'available'
  AND presence = 'online'
  AND last_heartbeat > NOW() - INTERVAL '30 seconds';

-- If count = 0 and pending requests exist, notify users
```

**New request status:** `cancelled` (user-initiated cancellation)

### Call Disconnect Handling

When someone's internet drops mid-call, sync LiveKit state with conversation:

**LiveKit Webhooks:**
```
POST /webhooks/livekit
Events:
- participant_left: A participant disconnected
- room_finished: Room closed (all participants left)
```

**Disconnect Flow:**
```
Participant disconnects (internet drop)
    ↓
LiveKit detects (~10-30s timeout)
    ↓
LiveKit sends "participant_left" webhook
    ↓
Server starts grace period (60 seconds)
    ↓
If participant rejoins within 60s → resume call
If not → end call, update conversation
```

**Database updates on call end:**
```sql
UPDATE liveconnect_conversations
SET status = 'ended',
    ended_at = NOW(),
    call_duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at)),
    last_activity_at = NOW()
WHERE id = :conversationId
  AND status = 'active';
```

**Grace period tracking:**
```sql
-- Add to conversations table
ALTER TABLE liveconnect_conversations ADD COLUMN
    disconnect_grace_until TIMESTAMP;  -- NULL if connected, set when disconnect detected

-- On participant_left webhook
UPDATE liveconnect_conversations
SET disconnect_grace_until = NOW() + INTERVAL '60 seconds'
WHERE id = :conversationId
  AND disconnect_grace_until IS NULL;

-- On participant rejoins
UPDATE liveconnect_conversations
SET disconnect_grace_until = NULL
WHERE id = :conversationId;

-- Cron job: end calls past grace period
UPDATE liveconnect_conversations
SET status = 'ended',
    ended_at = disconnect_grace_until,
    call_duration_seconds = EXTRACT(EPOCH FROM (disconnect_grace_until - started_at))
WHERE disconnect_grace_until < NOW()
  AND status = 'active';
```

**Client-side UX during disconnect:**
- Other party sees: "Connection lost. Waiting for reconnection... (0:45)"
- Countdown shows grace period remaining
- If reconnected: "Connection restored"
- If grace expires: "Call ended due to connection loss"

### IN_CALL State Management

**Setting IN_CALL:**
```sql
-- When rep joins LiveKit room (after accepting request)
UPDATE liveconnect_reps
SET presence = 'in_call',
    current_conversation_id = :conversationId,
    call_started_at = NOW()
WHERE project_id = :projectId AND user_id = :userId;
```

**Clearing IN_CALL (normal end):**
```sql
-- When rep clicks "End Call" or call ends normally
UPDATE liveconnect_reps
SET presence = 'online',  -- Back to online (still has active connection)
    current_conversation_id = NULL,
    call_started_at = NULL
WHERE project_id = :projectId AND user_id = :userId;
```

**New columns for tracking:**
```sql
ALTER TABLE liveconnect_reps ADD COLUMN
    current_conversation_id UUID REFERENCES liveconnect_conversations(id),
    call_started_at TIMESTAMP;
```

**LiveKit Webhook cleanup:**
```sql
-- On room_finished webhook from LiveKit
-- Find all reps who were in this room and clear their state
UPDATE liveconnect_reps r
SET presence = CASE
        WHEN active_connections > 0 THEN 'online'
        ELSE 'offline'
    END,
    current_conversation_id = NULL,
    call_started_at = NULL
FROM liveconnect_conversations c
WHERE c.id = r.current_conversation_id
  AND c.id = :conversationId;  -- from webhook room metadata
```

**Cleanup job (runs every 60 seconds):**
```sql
-- Find reps stuck in IN_CALL but their conversation has ended
UPDATE liveconnect_reps r
SET presence = CASE
        WHEN active_connections > 0 THEN 'online'
        ELSE 'offline'
    END,
    current_conversation_id = NULL,
    call_started_at = NULL
WHERE r.presence = 'in_call'
  AND (
    -- Conversation ended
    r.current_conversation_id IS NULL
    OR EXISTS (
        SELECT 1 FROM liveconnect_conversations c
        WHERE c.id = r.current_conversation_id
        AND c.status = 'ended'
    )
    -- Or call has been going for way too long (safety valve: 4 hours)
    OR r.call_started_at < NOW() - INTERVAL '4 hours'
  );
```

**LiveKit room state check (optional, more reliable):**
```java
// Periodically check LiveKit API for active rooms
// If rep is IN_CALL but their room doesn't exist, clear state
@Scheduled(fixedRate = 60000)
public void syncLiveKitState() {
    List<Rep> inCallReps = repRepository.findByPresence("in_call");

    for (Rep rep : inCallReps) {
        String roomName = "conv_" + rep.getCurrentConversationId();
        boolean roomExists = liveKitClient.roomExists(roomName);

        if (!roomExists) {
            rep.setPresence(rep.getActiveConnections() > 0 ? "online" : "offline");
            rep.setCurrentConversationId(null);
            rep.setCallStartedAt(null);
            repRepository.save(rep);
        }
    }
}
```

**State transitions:**
```
OFFLINE ←→ ONLINE ←→ IN_CALL
   ↑          ↑          ↓
   └──────────┴──────────┘
         (cleanup jobs)
```

### LiveKit Webhook Handling

LiveKit sends webhooks for room events. Proper error handling is critical.

**Webhook endpoint:**
```
POST /webhooks/livekit
```

**Events we handle:**
- `participant_joined` - Someone joined the room
- `participant_left` - Someone disconnected
- `room_finished` - Room closed (all left)

**1. Signature Verification:**

LiveKit signs webhooks - reject unsigned/invalid requests.

```java
@PostMapping("/webhooks/livekit")
public ResponseEntity<?> handleWebhook(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody String body
) {
    WebhookReceiver receiver = new WebhookReceiver(apiKey, apiSecret);
    WebhookEvent event;
    try {
        event = receiver.receive(body, authHeader);
    } catch (Exception e) {
        log.warn("Invalid LiveKit webhook signature");
        return ResponseEntity.status(401).build();
    }
    // Process event...
}
```

**2. Idempotency:**

LiveKit may retry webhooks - prevent duplicate processing.

```sql
CREATE TABLE liveconnect_processed_webhooks (
    event_id VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT NOW()
);

-- Cleanup old entries (daily)
DELETE FROM liveconnect_processed_webhooks
WHERE processed_at < NOW() - INTERVAL '7 days';
```

```java
// Check before processing
if (processedWebhookRepo.existsById(event.getId())) {
    return ResponseEntity.ok().build();  // Already handled
}
// After successful processing
processedWebhookRepo.save(new ProcessedWebhook(event.getId()));
```

**3. Response Codes:**

| Response | Meaning | LiveKit Behavior |
|----------|---------|------------------|
| 200 | Success | No retry |
| 400 | Bad request | No retry |
| 401 | Invalid signature | No retry |
| 500 | Server error | Retries with backoff |
| Timeout | Server slow/down | Retries with backoff |

**Rule:** Return 200 for "already processed" or "entity not found" to prevent infinite retries.

**4. Out-of-Order Events:**

Events may arrive out of order. Use timestamps:

```java
// Don't overwrite newer state with stale event
if (event.getTimestamp() < conversation.getLastUpdatedAt()) {
    log.debug("Ignoring stale event");
    return ResponseEntity.ok().build();
}
```

**5. Grace Period Double-Check:**

Before ending a call due to grace period expiry, verify with LiveKit API:

```java
@Scheduled(fixedRate = 30000)
public void checkGracePeriods() {
    List<Conversation> expiring = conversationRepo
        .findByDisconnectGraceUntilBefore(Instant.now());

    for (Conversation conv : expiring) {
        // Double-check with LiveKit before ending
        boolean roomActive = liveKitClient.roomExists("conv_" + conv.getId());
        if (roomActive) {
            // Someone reconnected, webhook may be delayed
            conv.setDisconnectGraceUntil(null);
        } else {
            // Actually end the call
            conv.setStatus("ended");
            conv.setEndedAt(Instant.now());
        }
        conversationRepo.save(conv);
    }
}
```

**6. Complete Webhook Handler:**

```java
@RestController
@RequestMapping("/webhooks/livekit")
public class LiveKitWebhookController {

    @PostMapping
    @Transactional
    public ResponseEntity<?> handleWebhook(
        @RequestHeader("Authorization") String authHeader,
        @RequestBody String body
    ) {
        // 1. Verify signature
        WebhookEvent event;
        try {
            event = webhookReceiver.receive(body, authHeader);
        } catch (Exception e) {
            return ResponseEntity.status(401).build();
        }

        // 2. Idempotency check
        if (processedWebhookRepo.existsById(event.getId())) {
            return ResponseEntity.ok().build();
        }

        // 3. Process by type
        try {
            switch (event.getEvent()) {
                case "participant_left" -> handleParticipantLeft(event);
                case "participant_joined" -> handleParticipantJoined(event);
                case "room_finished" -> handleRoomFinished(event);
                default -> log.debug("Ignoring: {}", event.getEvent());
            }

            // 4. Mark processed
            processedWebhookRepo.save(new ProcessedWebhook(event.getId()));
            return ResponseEntity.ok().build();

        } catch (EntityNotFoundException e) {
            // Entity gone - ignore gracefully, don't retry
            log.warn("Entity not found: {}", e.getMessage());
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            // Unexpected error - let LiveKit retry
            log.error("Webhook processing error", e);
            return ResponseEntity.status(500).build();
        }
    }
}
```

---

### Cleanup Jobs

All scheduled jobs to prevent stale data:

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Stale rep presence | Every 10s | Mark reps offline if heartbeat stale |
| Expired requests | Every 10s | Mark pending requests as expired |
| Disconnect grace period | Every 30s | End calls past grace period (with LiveKit API check) |
| IN_CALL state cleanup | Every 60s | Clear stuck IN_CALL states |
| Inactive conversations | Every 5 min | Auto-end 30-min inactive conversations |
| Session cleanup | Every hour | Delete expired session tokens |
| Processed webhooks cleanup | Daily | Delete webhook records older than 7 days |
| Stale visitor archival | Daily | Archive visitors not seen in 90 days |

Note: Rate limiting uses Redis with TTL auto-expiry - no cleanup job needed.

```sql
-- 1. Stale rep presence (every 10s)
UPDATE liveconnect_reps
SET presence = 'offline'
WHERE presence IN ('online', 'in_call')
  AND active_connections = 0
  AND last_heartbeat < NOW() - INTERVAL '30 seconds';

-- 2. Expire stale requests (every 10s)
UPDATE liveconnect_requests
SET status = 'expired'
WHERE status = 'pending'
  AND expires_at < NOW();

-- 3. End calls past disconnect grace period (every 30s)
UPDATE liveconnect_conversations
SET status = 'ended',
    ended_at = disconnect_grace_until,
    call_duration_seconds = EXTRACT(EPOCH FROM (disconnect_grace_until - started_at))
WHERE status = 'active'
  AND disconnect_grace_until IS NOT NULL
  AND disconnect_grace_until < NOW();

-- 4. Clear stuck IN_CALL states (every 60s)
UPDATE liveconnect_reps
SET presence = CASE WHEN active_connections > 0 THEN 'online' ELSE 'offline' END,
    current_conversation_id = NULL,
    call_started_at = NULL
WHERE presence = 'in_call'
  AND (
    current_conversation_id IS NULL
    OR EXISTS (
      SELECT 1 FROM liveconnect_conversations c
      WHERE c.id = current_conversation_id AND c.status = 'ended'
    )
    OR call_started_at < NOW() - INTERVAL '4 hours'
  );

-- 5. Auto-end inactive conversations (every 5 min)
UPDATE liveconnect_conversations
SET status = 'ended',
    ended_at = NOW()
WHERE status = 'active'
  AND last_activity_at < NOW() - INTERVAL '30 minutes';

-- 6. Clean expired sessions (every hour)
DELETE FROM liveconnect_sessions
WHERE expires_at < NOW();

-- 7. Archive stale visitors (daily)
-- Option A: Delete visitors with no conversations after 90 days
DELETE FROM liveconnect_visitors v
WHERE v.last_seen_at < NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM liveconnect_conversations c
    WHERE c.visitor_id = v.id
  );

-- Option B: If keeping all visitors, just clean up their active state
UPDATE liveconnect_visitors
SET active_connections = 0
WHERE last_seen_at < NOW() - INTERVAL '1 day'
  AND active_connections > 0;
```

### Navigation During Call

When a user navigates to a different page during an active call, the widget would normally reload and drop the call. Solution: **open video calls in a popup window**.

**Desktop Behavior:**

```
User accepts call
    ↓
Widget opens popup window: call.notifykit.dev/room/xxx
    ↓
Video call runs in separate window
    ↓
User can navigate main site freely
    ↓
Popup stays alive, call continues ✅
```

```js
// When call starts, open popup
const callWindow = window.open(
  `https://call.notifykit.dev/room/${conversationId}?token=${token}`,
  'liveconnect_call',
  'width=400,height=600'
);
```

**Desktop tab switching:**
- User can switch between tabs freely
- WebRTC stays active in background tabs
- Call continues without issues ✅

**If user drags popup into browser (becomes tab):**
- Call tab is independent of main site tab
- User navigates main site → call tab unaffected ✅
- Works fine

**iOS Safari Behavior:**

iOS doesn't support floating popup windows - `window.open()` opens a new full-screen tab.

```
User on iPhone accepts call
    ↓
New tab opens (full screen) with video call
    ↓
User is in the call tab
    ↓
To browse main site: must switch tabs
```

**iOS background tab limitation:**

```
User switches from call tab to main site tab
    ↓
iOS Safari may SUSPEND the call tab (battery/memory saving)
    ↓
WebRTC connection freezes or drops after ~10-30 seconds
    ↓
User switches back → call may be dead
```

This is a known iOS Safari limitation affecting all WebRTC apps.

**iOS Mitigations:**

| Approach | Implementation |
|----------|----------------|
| **Warn the user** | "For best experience, stay on this tab during your call" |
| **Detect iOS** | Show more prominent warning on iOS devices |
| **Grace period** | 60s reconnection window (already implemented) |
| **Accept it** | Mobile = focus on call (matches native app behavior) |

```js
// Detect iOS and show warning
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
if (isIOS) {
  showNotice("Switching tabs may interrupt your call. For best experience, stay on this tab.");
}
```

**Platform Summary:**

| Platform | Popup behavior | Tab switch during call | Navigation during call |
|----------|---------------|----------------------|----------------------|
| Desktop (Chrome/Firefox/Edge) | Floating window | ✅ Works fine | ✅ Popup persists |
| Desktop Safari | Floating window | ✅ Works fine | ✅ Popup persists |
| iOS Safari | Opens as new tab | ⚠️ May suspend after ~30s | ⚠️ Call in separate tab |
| Android Chrome | Floating window or tab | ✅ Generally works | ✅ Works |

**Chat vs Video:**

| Feature | During navigation |
|---------|-------------------|
| **Chat (no active call)** | Widget reloads → syncs conversation history → continues seamlessly |
| **Video call** | Opens in popup/tab → persists independently |

---

## Conversation Lifecycle

**Note:** This is a call-first system. Text messaging is only available DURING an active video call.

### What STARTS a conversation
| Action | Creates conversation? |
|--------|----------------------|
| Video call starts | ✓ Yes |
| User leaves contact info (offline form) | ✓ Yes |
| Request/ping | ✗ No (request only, not a conversation yet) |
| Declined request | ✗ No |

### What RESETS the 30-min throttle
| Action | Resets timer? |
|--------|---------------|
| Video call ongoing | ✓ Yes (continuous) |
| Video call ends | ✓ Yes (timer starts from call end) |
| In-call message sent | ✓ Yes |
| Request/ping | ✗ No |

### What ENDS a conversation
| Trigger | Result |
|---------|--------|
| 30 min after call ends (inactivity) | Auto-end |
| Rep clicks "End Call" | Immediate end |
| User closes call window | Immediate end |

### Conversation Data Model
```
Conversation
├── id
├── project_id
├── visitor (anonymous or identified)
├── rep_id (assigned when call connects)
├── status: 'active' | 'ended'
├── started_at (when call connects)
├── ended_at
├── call_duration_seconds (calculated)
└── messages[] (in-call chat only)
    ├── sender: 'user' | 'rep' | 'system'
    ├── content
    └── sent_at
```

---

## Security & Abuse Prevention

### Embed Key Scope (Public Key)

The embed key (`lck_xxx`) is intentionally public (visible in HTML). It has limited scope:

| Allowed | NOT Allowed |
|---------|-------------|
| Initialize widget session | Access other visitors' data |
| Send messages as visitor | Read conversation history |
| Request video calls | Modify project settings |
| Leave contact info | Access dashboard APIs |
| Receive pings | Admin operations |

### Domain Restriction

Embed keys only work from allowed domains:

```
Dashboard UI:
┌─────────────────────────────────┐
│ Allowed Domains                 │
├─────────────────────────────────┤
│ example.com              ✕      │
│ staging.example.com      ✕      │
│ ┌─────────────────────────────┐ │
│ │ + Add domain                │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

- Requests from unlisted domains → rejected with 403
- Checked via `Origin` and `Referer` headers
- Wildcard support: `*.example.com`

### Rate Limiting

**Storage: Redis** (not PostgreSQL) - fast, TTL auto-expiry, no cleanup needed.

**Dual-layer approach:** Per-visitor limits for fair usage + per-IP backstop to catch abuse.

| Action | Per Visitor | Per IP (backstop) |
|--------|-------------|-------------------|
| Widget init | - | 20/min |
| In-call message | 20/min | 100/min |
| Request call | 3/min | 15/min |
| Leave contact | 5/hour | 20/hour |

**Note:** "In-call message" only applies during active video calls (chat is disabled otherwise).

**Logic:** Request fails if **either** limit is exceeded.

- **Per-visitor:** Fair limits for normal users, doesn't punish shared IPs (offices, coffee shops)
- **Per-IP backstop:** Catches attackers creating multiple visitor_ids to bypass per-visitor limits

**Why both?** An attacker could call init 10 times to get 10 visitor_ids, then use each to send 20 in-call messages = 200 messages/min. The IP backstop (100/min) catches this.

**Redis implementation:**

```java
public boolean checkRateLimit(String visitorId, String ip, String action, int visitorLimit, int ipLimit, int windowSeconds) {
    String visitorKey = "ratelimit:" + action + ":visitor:" + visitorId;
    String ipKey = "ratelimit:" + action + ":ip:" + ip;

    // Check visitor limit (if applicable)
    if (visitorLimit > 0) {
        Long visitorCount = redis.incr(visitorKey);
        if (visitorCount == 1) {
            redis.expire(visitorKey, windowSeconds);
        }
        if (visitorCount > visitorLimit) {
            return false; // Rate limited
        }
    }

    // Check IP limit
    Long ipCount = redis.incr(ipKey);
    if (ipCount == 1) {
        redis.expire(ipKey, windowSeconds);
    }
    if (ipCount > ipLimit) {
        return false; // Rate limited
    }

    return true; // Allowed
}

// Usage
if (!checkRateLimit(visitorId, ip, "message", 20, 100, 60)) {
    throw new RateLimitExceededException();
}
```

**Redis key examples:**
```
ratelimit:message:visitor:abc123     → "15"  (TTL: 45s remaining)
ratelimit:message:ip:192.168.1.1     → "47"  (TTL: 32s remaining)
ratelimit:init:ip:192.168.1.1        → "3"   (TTL: 58s remaining)
```

Keys auto-expire - no cleanup job needed.

Exceeded limits return 429 Too Many Requests.

### Abuse Controls

| Control | Purpose |
|---------|---------|
| **IP blocking** | Block abusive IPs at project level |
| **Visitor banning** | Ban specific visitor_ids |
| **Message filtering** | Optional profanity/spam filter |
| **CAPTCHA** | Optional for contact form submissions |
| **Anomaly detection** | Alert on unusual traffic patterns |

### Input Validation

**Max lengths:**

| Field | Max Length | Notes |
|-------|------------|-------|
| Chat message | 2,000 chars | Real-time chat, not email |
| Contact form message | 5,000 chars | Offline messages may need more detail |
| Visitor name | 100 chars | Full names |
| Visitor email | 255 chars | Email standard |
| Company name | 200 chars | Long company names |
| Custom metadata value | 500 chars | Per-field limit |
| Custom metadata total | 5,000 chars | Total JSON size |

**Validation behavior:**
- **Client-side:** Show character count as user types, disable send at limit
- **Server-side:** Reject with 400 Bad Request if exceeded
- **Database:** Use appropriate column types (VARCHAR with limits, TEXT for messages)

```json
// 400 response
{
  "error": "validation_error",
  "field": "content",
  "message": "Message exceeds 2000 character limit",
  "limit": 2000,
  "actual": 2347
}
```

### Key Separation

```
Embed Key (lck_xxx)              Dashboard Auth (JWT)
───────────────────              ────────────────────
Public, in HTML                  Private, httpOnly cookie
Widget APIs only (/v1/*)         Management APIs (/api/*)
Per-visitor scope                Per-user + role scope
Domain restricted                Session-based
Rate limited                     Standard auth
```

---

## Offline Contact Form

When no reps available (or user prefers to leave info):
- User clicks "Leave Your Info" in expanded widget
- Form fields: Name, Email, Phone (optional), Message
- Stored as a conversation with type 'contact_form'
- Email notification sent to project owner/reps
- Appears in dashboard conversations for follow-up

**Form fields:**
| Field | Required | Max Length |
|-------|----------|------------|
| Name | Yes | 100 chars |
| Email | Yes | 255 chars |
| Phone | No | 20 chars |
| Message | Yes | 5,000 chars |

---

## Database Schema

### Modified Tables

```sql
-- Add type to existing projects table
ALTER TABLE projects ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'notifykit';
```

### New Tables

```sql
-- LiveConnect project settings
CREATE TABLE liveconnect_settings (
    project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    welcome_message TEXT DEFAULT 'Hi! How can we help you today?',
    widget_color VARCHAR(7) DEFAULT '#FACC15',
    widget_position VARCHAR(20) DEFAULT 'bottom-right',
    offline_message TEXT DEFAULT 'No reps available. Leave your info and we''ll get back to you.',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Embed keys for LiveConnect
CREATE TABLE liveconnect_embed_keys (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    key_prefix VARCHAR(10) NOT NULL DEFAULT 'lck_',
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    allowed_domains TEXT[], -- ['example.com', 'staging.example.com']
    is_revoked BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Rate limiting: Uses Redis (not PostgreSQL) - see Rate Limiting section

-- Widget sessions (for WebSocket auth)
CREATE TABLE liveconnect_sessions (
    id UUID PRIMARY KEY,
    session_token VARCHAR(255) NOT NULL UNIQUE, -- sess_xxx
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES liveconnect_visitors(id) ON DELETE CASCADE,
    embed_key_id UUID REFERENCES liveconnect_embed_keys(id) ON DELETE CASCADE,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL, -- 24 hours from creation/last activity
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON liveconnect_sessions(session_token);
CREATE INDEX idx_sessions_expires ON liveconnect_sessions(expires_at);

-- Sales rep presence/availability
CREATE TABLE liveconnect_reps (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    availability VARCHAR(20) DEFAULT 'unavailable', -- 'available', 'unavailable'
    presence VARCHAR(20) DEFAULT 'offline', -- 'offline', 'online', 'in_call'
    active_connections INT DEFAULT 0,  -- Track open tabs/connections
    current_conversation_id UUID,  -- Active call conversation (for IN_CALL tracking)
    call_started_at TIMESTAMP,  -- When current call started (for timeout safety)
    last_heartbeat TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Website visitors (tracked users)
CREATE TABLE liveconnect_visitors (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    visitor_id VARCHAR(255) NOT NULL, -- random UUID from localStorage
    identified_user_id VARCHAR(255), -- developer-provided ID
    name VARCHAR(255),
    email VARCHAR(255),
    metadata JSONB, -- company, custom fields
    active_connections INT DEFAULT 0,  -- Track open tabs
    disconnected_at TIMESTAMP,  -- NULL if connected, set when active_connections hits 0
    ping_cooldown_until TIMESTAMP,  -- No rep can ping until this time
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, visitor_id)
);

-- Conversations
-- type: 'video_call' (primary) or 'contact_form' (offline submissions)
CREATE TABLE liveconnect_conversations (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES liveconnect_visitors(id),
    rep_id UUID REFERENCES liveconnect_reps(id),  -- NULL for contact_form until assigned
    type VARCHAR(20) NOT NULL DEFAULT 'video_call', -- 'video_call', 'contact_form'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'ended'
    call_duration_seconds INT,  -- NULL for contact_form
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    disconnect_grace_until TIMESTAMP  -- NULL if connected, set when disconnect detected
);

-- Messages within conversations (only used during video calls - call-first design)
-- Contact forms store their message in the conversation's first system message
CREATE TABLE liveconnect_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES liveconnect_conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'user', 'rep', 'system'
    sender_id UUID, -- rep user_id if sender_type = 'rep'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Request queue (pending requests)
CREATE TABLE liveconnect_requests (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES liveconnect_visitors(id),
    initiated_by_rep_id UUID REFERENCES liveconnect_reps(id), -- null if user-initiated (goes to all)
    direction VARCHAR(20) NOT NULL, -- 'user_to_reps', 'rep_to_user', 'mutual'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'declined', 'cancelled'
    accepted_by_rep_id UUID REFERENCES liveconnect_reps(id), -- who accepted
    accepted_at TIMESTAMP,
    conversation_id UUID REFERENCES liveconnect_conversations(id), -- linked conversation once accepted
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Partial unique index: only one pending request per visitor per project
CREATE UNIQUE INDEX idx_unique_pending_request
ON liveconnect_requests (project_id, visitor_id)
WHERE (status = 'pending');

-- Webhook idempotency tracking
CREATE TABLE liveconnect_processed_webhooks (
    event_id VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_processed_webhooks_time ON liveconnect_processed_webhooks(processed_at);

-- Indexes (basic)
CREATE INDEX idx_visitors_project ON liveconnect_visitors(project_id);
CREATE INDEX idx_conversations_project ON liveconnect_conversations(project_id);
CREATE INDEX idx_conversations_status ON liveconnect_conversations(status);
CREATE INDEX idx_messages_conversation ON liveconnect_messages(conversation_id);
CREATE INDEX idx_requests_project_status ON liveconnect_requests(project_id, status);
CREATE INDEX idx_reps_project ON liveconnect_reps(project_id);

-- Indexes (query optimization)

-- Requests: find pending for visitor (widget init)
CREATE INDEX idx_requests_visitor_status
ON liveconnect_requests(visitor_id, status);

-- Requests: cleanup expired (cron job)
CREATE INDEX idx_requests_expires
ON liveconnect_requests(status, expires_at)
WHERE status = 'pending';

-- Conversations: find active for visitor (widget init)
CREATE INDEX idx_conversations_visitor_status
ON liveconnect_conversations(visitor_id, status);

-- Conversations: date range queries (dashboard pagination)
CREATE INDEX idx_conversations_project_started
ON liveconnect_conversations(project_id, started_at DESC);

-- Messages: ordered pagination (in-call chat history)
CREATE INDEX idx_messages_conversation_created
ON liveconnect_messages(conversation_id, created_at DESC);

-- Conversations: filter by type (video_call vs contact_form)
CREATE INDEX idx_conversations_project_type
ON liveconnect_conversations(project_id, type);

-- Reps: find available (check availability)
CREATE INDEX idx_reps_availability
ON liveconnect_reps(project_id, availability, presence);

-- Reps: cleanup stale heartbeats (cron job)
CREATE INDEX idx_reps_presence_heartbeat
ON liveconnect_reps(presence, last_heartbeat);

-- Visitors: find by identified user ID
CREATE INDEX idx_visitors_identified
ON liveconnect_visitors(project_id, identified_user_id)
WHERE identified_user_id IS NOT NULL;

-- Visitors: cleanup stale (cron job)
CREATE INDEX idx_visitors_last_seen
ON liveconnect_visitors(last_seen_at);
```

---

## Frontend Structure

### Route Structure

All dashboard routes include organization slug for deep-linking and multi-org support.

**Complete route tree:**

```
/frontend/app/
├── page.tsx                                    # Landing page
├── login/page.tsx                              # GitHub OAuth login
├── auth/callback/page.tsx                      # OAuth callback
└── dashboard/
    ├── layout.tsx                              # Dashboard shell (sidebar + header)
    ├── page.tsx                                # Redirect to default org
    └── [orgSlug]/
        ├── layout.tsx                          # Org context provider
        ├── page.tsx                            # Org overview/home
        ├── team/page.tsx                       # Team management
        ├── settings/page.tsx                   # Org settings
        └── projects/
            ├── page.tsx                        # Projects list
            ├── new/page.tsx                    # Create project (type selection)
            └── [projectId]/
                ├── layout.tsx                  # Project tabs (type-aware)
                ├── page.tsx                    # Default view (by type)
                │
                │   # LiveConnect tabs
                ├── conversations/page.tsx      # Chat/call history
                ├── reps/page.tsx               # Manage reps (admin/owner)
                ├── embed/page.tsx              # Embed keys + snippets
                ├── customize/page.tsx          # Widget appearance
                │
                │   # NotifyKit tabs
                ├── api-keys/page.tsx           # API key management
                ├── events/page.tsx             # Event history
                ├── telegram/page.tsx           # Telegram integration
                │
                │   # Shared
                └── settings/page.tsx           # Project settings
```

### URL Examples

| Page | URL |
|------|-----|
| Org home | `/dashboard/acme-corp` |
| Team | `/dashboard/acme-corp/team` |
| Projects list | `/dashboard/acme-corp/projects` |
| Project detail | `/dashboard/acme-corp/projects/abc123` |
| LiveConnect reps | `/dashboard/acme-corp/projects/abc123/reps` |
| NotifyKit events | `/dashboard/acme-corp/projects/abc123/events` |

### Project Layout (Type-Aware Tabs)

`/dashboard/[orgSlug]/projects/[projectId]/layout.tsx`:

```tsx
export default async function ProjectLayout({ children, params }) {
  const { orgSlug, projectId } = await params;
  const project = await getProject(projectId);

  // Different tabs based on project type
  const tabs = project.type === 'liveconnect'
    ? [
        { label: 'Live Users', href: '' },
        { label: 'Conversations', href: '/conversations' },
        { label: 'Reps', href: '/reps', adminOnly: true },
        { label: 'Embed', href: '/embed' },
        { label: 'Customize', href: '/customize' },
        { label: 'Settings', href: '/settings' },
      ]
    : [
        { label: 'Overview', href: '' },
        { label: 'API Keys', href: '/api-keys' },
        { label: 'Events', href: '/events' },
        { label: 'Telegram', href: '/telegram' },
        { label: 'Settings', href: '/settings' },
      ];

  return (
    <div>
      <ProjectHeader project={project} />
      <ProjectTabs
        tabs={tabs}
        baseUrl={`/dashboard/${orgSlug}/projects/${projectId}`}
      />
      {children}
    </div>
  );
}
```

### Dashboard Navigation

**Different default landing per project type:**

| Project Type | Default View | URL |
|--------------|--------------|-----|
| NotifyKit | Overview (stats) | `/dashboard/[orgSlug]/projects/[projectId]` |
| LiveConnect | Live Users (queue + browsing) | `/dashboard/[orgSlug]/projects/[projectId]` |

**LiveConnect tabs:**
```
/dashboard/[orgSlug]/projects/[projectId]               → Live Users (default)
/dashboard/[orgSlug]/projects/[projectId]/conversations → Chat/call history
/dashboard/[orgSlug]/projects/[projectId]/reps          → Manage reps (admin/owner only)
/dashboard/[orgSlug]/projects/[projectId]/embed         → Embed keys + code snippets
/dashboard/[orgSlug]/projects/[projectId]/customize     → Widget appearance
/dashboard/[orgSlug]/projects/[projectId]/settings      → Project settings
```

**NotifyKit tabs:**
```
/dashboard/[orgSlug]/projects/[projectId]               → Overview (default)
/dashboard/[orgSlug]/projects/[projectId]/api-keys      → API key management
/dashboard/[orgSlug]/projects/[projectId]/events        → Event history
/dashboard/[orgSlug]/projects/[projectId]/telegram      → Telegram integration
/dashboard/[orgSlug]/projects/[projectId]/settings      → Project settings
```

### LiveConnect Project Detail Page (Live Users)

The default landing page for LiveConnect projects:

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Project Name]              [🟢 Available ▾]    [Settings]         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  ┌─────────────────────────┐ │
│  │ 🔴 WAITING TO TALK (2)            │  │ John Smith              │ │
│  │ ┌───────────────────────────────┐ │  │ john@acme.com           │ │
│  │ │ John Smith       0:18 left    │ │  │ Acme Corp               │ │
│  │ │ john@acme.com    [Accept]     │ │  ├─────────────────────────┤ │
│  │ ├───────────────────────────────┤ │  │ Currently viewing:      │ │
│  │ │ Anonymous        0:24 left    │ │  │ /pricing                │ │
│  │ │ Visitor #a8f3    [Accept]     │ │  │ Time on site: 4m 32s    │ │
│  │ └───────────────────────────────┘ │  ├─────────────────────────┤ │
│  ├───────────────────────────────────┤  │ Chat History            │ │
│  │ BROWSING (5)              [Sort ▾]│  │ ┌─────────────────────┐ │ │
│  │ ┌───────────────────────────────┐ │  │ │ No messages yet     │ │ │
│  │ │ 🟢 Sarah Connor   /pricing    │ │  │ └─────────────────────┘ │ │
│  │ │ 🟢 Anonymous      /features   │ │  │ ┌─────────────────────┐ │ │
│  │ │ 🟡 Mike Ross      /demo (idle)│ │  │ │ Type a message...   │ │ │
│  │ │ 🟢 Anonymous      /home       │ │  │ └─────────────────────┘ │ │
│  │ │ 🟢 Anonymous      /about      │ │  ├─────────────────────────┤ │
│  │ └───────────────────────────────┘ │  │ [Ping User] [Start Call]│ │
│  └───────────────────────────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Left panel - User lists:**
- **Waiting to Talk (Queue):** Users who requested, FIFO order, countdown timer, Accept button
- **Browsing:** All visitors on site, sortable by activity/time/page
- Click any user to view details in right panel
- Queue section collapses when empty

**Right panel - Selected user:**
- User info (name, email, company if identified; visitor ID if anonymous)
- Current page and time on site
- Previous conversation history (if any past calls/contact forms)
- Action buttons: Ping (if browsing) or Accept (if waiting)
- **Note:** Chat input only appears during active video calls (call-first design)

**Header:**
- Availability toggle (Available/Unavailable)
- Settings quick link

**Video call overlay:**
- When in call, full-screen overlay appears
- Shows video feeds, mute/camera/end buttons
- Chat panel enabled during call (for sharing links, info - this is the only time chat is available)
- Real-time connection quality indicators for both participants

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                          [×] Close  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │                                                               │  │
│  │                     Rep's Video                               │  │
│  │                                                               │  │
│  │                                                               │  │
│  │                                            ▂▄▆█ You: Excellent│  │
│  │                                            ▂▄▆░ Them: Good    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────┐  ┌─────────────────────────────────────────────┐│
│  │               │  │ Chat                                        ││
│  │  Your Video   │  │ ─────────────────────────────────────────── ││
│  │               │  │ Rep: How can I help you today?              ││
│  │        ▂▄▆█   │  │ You: I have a question about pricing        ││
│  └───────────────┘  │ ____________________________________________ ││
│                     │ │ Type a message...                        │││
│                     └─────────────────────────────────────────────┘│
│                                                                     │
│           [🎤 Mute]    [📷 Camera Off]    [🔴 End Call]             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Connection quality indicator:**

| Bars | Quality | Color | Meaning |
|------|---------|-------|---------|
| ▂▄▆█ | Excellent | Green | Great connection |
| ▂▄▆░ | Good | Green | Minor issues, still clear |
| ▂▄░░ | Poor | Yellow | Noticeable lag/pixelation |
| ▂░░░ | Bad | Red | Significant issues |
| ░░░░ | Lost | Red + "Reconnecting..." | Connection lost |

**LiveKit integration:**
```js
room.on('connectionQualityChanged', (quality, participant) => {
  // quality: ConnectionQuality.Excellent | Good | Poor | Lost
  if (participant.isLocal) {
    updateIndicator('you', quality);
  } else {
    updateIndicator('them', quality);
  }
});
```

**Tooltip on hover:**
```
▂▄▆░ Good
Latency: 45ms
Packet loss: 0.2%
```

### Call Quality Metrics (Analytics)

Store call quality data for analytics and debugging.

**Summary metrics (per conversation):**
```sql
ALTER TABLE liveconnect_conversations ADD COLUMN
    avg_quality_score DECIMAL(3,2),       -- 0.00 to 1.00
    avg_packet_loss DECIMAL(5,2),         -- percentage
    avg_rtt_ms INT,                       -- milliseconds
    connection_drops INT DEFAULT 0,       -- reconnect count
    video_enabled_seconds INT,            -- time with video on
    audio_enabled_seconds INT;            -- time with audio on
```

**Conversation detail view:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Conversation with John Smith                    Jan 25, 2:30 PM │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Duration: 12m 34s          Video: 10m 15s    Audio: 12m 34s   │
│                                                                 │
│  Call Quality                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Overall: ████████████░░░░ Good (0.78)                   │   │
│  │ Avg Packet Loss: 0.3%                                   │   │
│  │ Avg Latency: 45ms                                       │   │
│  │ Connection Drops: 0                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Project-level analytics:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Call Quality - Last 30 Days                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Total Calls: 247         Avg Duration: 8m 12s                 │
│                                                                 │
│  Quality Distribution:                                          │
│  Excellent ████████████████████ 62%                            │
│  Good      ████████████ 28%                                    │
│  Poor      ███ 8%                                              │
│  Failed    █ 2%                                                │
│                                                                 │
│  Avg Packet Loss: 0.4%    Avg Latency: 52ms                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Rep Management (Per-Project)

URL: `/dashboard/projects/[id]/reps` (LiveConnect only, admin/owner only)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Reps for "Main Website Chat"                        [+ Add Rep]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 👤 Carol Smith                                              │   │
│  │    carol@company.com                                        │   │
│  │    Status: 🟢 Available                         [Remove]    │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ 👤 Dave Johnson                                             │   │
│  │    dave@company.com                                         │   │
│  │    Status: 🔴 Offline                           [Remove]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ℹ️  Only reps assigned here can see visitors and receive    │   │
│  │     requests for this project.                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

[+ Add Rep] modal:
┌─────────────────────────────────────┐
│ Add Rep to Project                  │
├─────────────────────────────────────┤
│ Select team member:                 │
│ ┌─────────────────────────────────┐ │
│ │ ☐ Alice (owner)                 │ │
│ │ ☐ Bob (admin)                   │ │
│ │ ☑ Carol ← already a rep         │ │
│ │ ☑ Dave  ← already a rep         │ │
│ │ ☐ Eve                           │ │
│ └─────────────────────────────────┘ │
│                      [Cancel] [Add] │
└─────────────────────────────────────┘
```

### Rep Management (Per-User, Organization Team Tab)

URL: `/dashboard/[orgSlug]/team` → Click user → "Rep Assignments"

```
┌─────────────────────────────────────────────────────────────────────┐
│  Team                                                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 👤 Alice           Owner        Rep on: —                   │   │
│  │ 👤 Bob             Admin        Rep on: —                   │   │
│  │ 👤 Carol           Member       Rep on: 2 projects    [Edit]│   │
│  │ 👤 Dave            Member       Rep on: 1 project     [Edit]│   │
│  │ 👤 Eve             Member       Rep on: —             [Edit]│   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

[Edit] Carol's rep assignments:
┌─────────────────────────────────────────────────────────────────────┐
│  Carol's Rep Assignments                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LiveConnect Projects:                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ☑ Main Website Chat                                         │   │
│  │ ☑ Support Chat                                              │   │
│  │ ☐ Sales Demo Chat                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  NotifyKit projects not shown (reps not applicable)                 │
│                                                                     │
│                                            [Cancel] [Save Changes]  │
└─────────────────────────────────────────────────────────────────────┘
```

**Permissions:**
- Only org owner/admin can see and edit rep assignments
- Regular members only see their own assignments (read-only)
- NotifyKit projects never shown in rep assignment UI

---

## API Structure

### Project Endpoints (Modified)

```
POST /api/organizations/{slug}/projects
     Body: { name, type: 'notifykit' | 'liveconnect' }
```

### LiveConnect Dashboard API (`/api/projects/{projectId}/liveconnect/`)

```
# Settings
GET  /api/projects/{projectId}/liveconnect/settings
PUT  /api/projects/{projectId}/liveconnect/settings

# Embed Keys
GET  /api/projects/{projectId}/liveconnect/embed-keys
POST /api/projects/{projectId}/liveconnect/embed-keys
     Body: { name, allowedDomains: ['example.com'] }
PUT  /api/projects/{projectId}/liveconnect/embed-keys/{keyId}
     Body: { name?, allowedDomains? }
DEL  /api/projects/{projectId}/liveconnect/embed-keys/{keyId}

# Abuse Controls (use database IDs, not raw IP/visitorId in URL)
GET  /api/projects/{projectId}/liveconnect/blocked-ips
POST /api/projects/{projectId}/liveconnect/blocked-ips
     Body: { ip, reason? }
DEL  /api/projects/{projectId}/liveconnect/blocked-ips/{blockId}

GET  /api/projects/{projectId}/liveconnect/banned-visitors
POST /api/projects/{projectId}/liveconnect/banned-visitors
     Body: { visitorId, reason? }
DEL  /api/projects/{projectId}/liveconnect/banned-visitors/{banId}

# Live Operations
GET  /api/projects/{projectId}/liveconnect/visitors
POST /api/projects/{projectId}/liveconnect/visitors/{visitorId}/ping
     Response: { requestId, expiresAt }

GET  /api/projects/{projectId}/liveconnect/requests
POST /api/projects/{projectId}/liveconnect/requests/{requestId}/accept
     Response: { conversationId, roomName, token }
POST /api/projects/{projectId}/liveconnect/requests/{requestId}/dismiss
     → Hides from this rep only, others still see it

# Conversations
GET  /api/projects/{projectId}/liveconnect/conversations
GET  /api/projects/{projectId}/liveconnect/conversations/{conversationId}
GET  /api/projects/{projectId}/liveconnect/conversations/{conversationId}/messages
POST /api/projects/{projectId}/liveconnect/conversations/{conversationId}/message
     Body: { content }
POST /api/projects/{projectId}/liveconnect/conversations/{conversationId}/end

# Rep Management (per-project)
GET  /api/projects/{projectId}/liveconnect/reps
     Response: { reps: [{ userId, name, email, availability, presence }] }
POST /api/projects/{projectId}/liveconnect/reps
     Body: { userId }
     → Creates rep entry, returns 400 if project is not 'liveconnect' type
DEL  /api/projects/{projectId}/liveconnect/reps/{userId}

# Rep Status (self)
PUT  /api/projects/{projectId}/liveconnect/availability
     Body: { availability: 'available' | 'unavailable' }

# Rep WebSocket (JWT cookie auth)
WS   /api/projects/{projectId}/liveconnect/ws
     → Heartbeat via WebSocket message: { type: "heartbeat" }
     → Receives: visitor_joined, visitor_left, request_received, etc.
```

### Organization-Level Rep Management

```
# Get member's rep assignments across all projects (for Team tab)
GET  /api/organizations/{slug}/members/{userId}/rep-assignments
     Response: {
       user: { id, name, email },
       assignments: [
         { projectId, projectName, projectType, isRep: true },
         { projectId, projectName, projectType, isRep: false },
         ...
       ]
     }
     → Only returns 'liveconnect' projects (notifykit filtered out)

# Update member's rep assignments (bulk)
PUT  /api/organizations/{slug}/members/{userId}/rep-assignments
     Body: { projectIds: ["proj_1", "proj_2"] }
     → Replaces all assignments for this user
     → Only accepts 'liveconnect' project IDs

# List all reps across org (admin overview)
GET  /api/organizations/{slug}/reps
     Response: {
       reps: [
         { userId, name, email, projects: [{ id, name }] },
         ...
       ]
     }
```

**Validation:**
- Adding rep to NotifyKit project → 400 Bad Request: "Reps can only be assigned to LiveConnect projects"
- Only org owner/admin can manage rep assignments
- User must be org member to be added as rep

### Pagination

**Dashboard APIs use offset/limit pagination:**

```
GET /api/projects/{id}/liveconnect/conversations?page=1&limit=20&status=active

Response:
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 847,
    "totalPages": 43,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Paginated endpoints:**

| Endpoint | Default Limit | Max Limit | Sort |
|----------|---------------|-----------|------|
| `/conversations` | 20 | 100 | `started_at DESC` |
| `/conversations/{id}/messages` | 50 | 200 | `created_at DESC` |
| `/visitors` | 50 | 200 | `last_seen_at DESC` |
| `/blocked-ips` | 50 | 100 | `created_at DESC` |
| `/banned-visitors` | 50 | 100 | `created_at DESC` |

**Widget message history uses cursor-based pagination:**

```
GET /v1/liveconnect/messages?session={sessionId}&cursor={lastMessageId}&limit=50

Response:
{
  "data": [ ... ],
  "pagination": {
    "nextCursor": "msg_abc123",
    "hasMore": true
  }
}
```

Cursor-based is better for:
- Real-time data (new messages don't shift pages)
- Infinite scroll UX
- Large datasets

**Filters:**

```
# Conversations
?status=active|ended
?startDate=2024-01-01
?endDate=2024-01-31
?visitorId=xxx

# Visitors (live)
?status=browsing|in_call|waiting
```

### Public Widget API (`/v1/liveconnect/`)

All widget endpoints use session token auth via `X-Session-Token` header (except /init which uses embed key).

**Call-first design:** Message endpoints only work during active video calls.

```
# Initialize widget session
POST /v1/liveconnect/init
     Headers: X-Embed-Key: lck_xxx
     Body: { visitorId, userData? }
     Response: {
       sessionId,
       repAvailability,
       settings,
       pendingRequest,      // null or { id, repName, expiresAt, direction }
       activeConversation   // null or { id, messages: [...last 20] }
     }

# Full state on init ensures widget survives page navigation/refresh:
# - visitor_id from localStorage identifies returning visitor
# - Server checks DB for pending requests → returns in pendingRequest
# - Server checks DB for active conversation → returns with recent messages
# - Widget renders correct state immediately (no flash of empty state)

# Get in-call message history (cursor-based pagination)
# NOTE: Only returns messages from active conversation during call
GET  /v1/liveconnect/messages?cursor={lastMessageId}&limit=50
     Headers: X-Session-Token: sess_xxx
     Response: { messages: [...], pagination: { nextCursor, hasMore } }
     → Returns 403 if no active call

# Send in-call message
# NOTE: Only works during active video call
POST /v1/liveconnect/message
     Headers: X-Session-Token: sess_xxx
     Body: { conversationId, content }
     → Returns 403 if no active call for this conversation

# User requests talk (to all available reps)
POST /v1/liveconnect/request
     Headers: X-Session-Token: sess_xxx
     Response: { requestId, expiresAt }

# User cancels their own request
POST /v1/liveconnect/request/cancel
     Headers: X-Session-Token: sess_xxx
     Body: { requestId }

# User accepts rep's ping
POST /v1/liveconnect/ping/accept
     Headers: X-Session-Token: sess_xxx
     Body: { requestId }
     Response: { conversationId, roomName, token }

# User declines rep's ping (triggers 30s cooldown)
POST /v1/liveconnect/ping/decline
     Headers: X-Session-Token: sess_xxx
     Body: { requestId }

# Leave contact info (when reps offline)
POST /v1/liveconnect/contact
     Headers: X-Session-Token: sess_xxx
     Body: { name, email, phone?, message }

# Get LiveKit token (for video calls)
POST /v1/liveconnect/token
     Headers: X-Session-Token: sess_xxx
     Body: { conversationId }
     Response: { token, roomName }

# Widget WebSocket (session token auth via query string)
WS   /v1/liveconnect/ws?session={sessionId}
     → Receives: rep_availability_changed, incoming_ping, ping_expired,
                 call_starting, message_received
     → Sends: (read-only, no client→server messages needed)
```

---

## WebSocket Authentication

Browser WebSocket API cannot set custom headers, so we use query string token auth for the widget.

### Widget WebSocket (Visitors)

**Flow:**
```
1. Widget calls POST /v1/liveconnect/init
   Headers: X-Embed-Key: lck_xxx
   Body: { visitorId: "visitor_abc" }
   Response: { sessionId: "sess_xyz", ... }

2. Widget opens WebSocket with sessionId
   wss://api.notifykit.dev/v1/liveconnect/ws?session=sess_xyz

3. Server validates session
   - Is sessionId valid? → If not, reject with 4001
   - Is it expired? → If not, reject with 4001
   - What project/visitor? → Subscribe to relevant channels
```

**Invalid session handling:**
```
Client connects: ?session=invalid_or_expired
    ↓
Server rejects WebSocket handshake (HTTP 401)
   OR closes immediately with code 4001 (Unauthorized)
    ↓
Client receives error, must call /init again
```

**Session token rules:**
- **Short-lived:** Expires after 24 hours of inactivity
- **Refreshed on activity:** Active connections stay valid
- **Tied to visitor:** Session only works for visitor who created it
- **Revocable:** Banning visitor invalidates their sessions
- **WSS only:** Always TLS encrypted

### Rep Dashboard WebSocket

**Flow:**
```
1. Rep is logged in (JWT cookie set)

2. Rep opens LiveConnect project dashboard

3. Dashboard opens WebSocket
   wss://api.notifykit.dev/api/projects/{projectId}/liveconnect/ws
   → JWT cookie sent automatically (same-origin)

4. Server validates JWT
   - Is user a rep for this project? → If not, reject
   - Subscribe to project channels

5. Rep sends heartbeat every 15s
   → { type: "heartbeat" }
   → Server updates last_heartbeat in liveconnect_reps
```

**Rep WebSocket messages:**

| Direction | Message Type | Purpose |
|-----------|--------------|---------|
| Client → Server | `{ type: "heartbeat" }` | Keep presence alive |
| Server → Client | `visitor_joined` | New visitor on site |
| Server → Client | `visitor_left` | Visitor left (after 30s grace) |
| Server → Client | `visitor_updated` | Visitor changed page, identified, etc. |
| Server → Client | `request_received` | User requested talk |
| Server → Client | `request_accepted_by_other` | Another rep accepted |
| Server → Client | `request_expired` | Request timed out |
| Server → Client | `message_received` | New chat message |
| Server → Client | `queue_updated` | Queue count changed |

---

## WebSocket Reconnection

Handle flaky internet gracefully - users shouldn't lose their place due to brief disconnects.

### Client-Side (Widget)

**Exponential backoff reconnection:**
```js
// Reconnection delays
Attempt 1: 1 second
Attempt 2: 2 seconds
Attempt 3: 4 seconds
Attempt 4: 8 seconds
Attempt 5: 16 seconds
Attempt 6+: 30 seconds (max)

// On successful reconnect
reconnectAttempts = 0;
ws.send(JSON.stringify({ type: 'sync', lastEventId: '...' }));
```

**Message queuing during disconnect:**
```js
// While disconnected, queue outgoing messages
messageQueue.push({ type: 'message', content: '...' });

// On reconnect, flush queue
messageQueue.forEach(msg => ws.send(JSON.stringify(msg)));
messageQueue = [];
```

### Server-Side

**30-second grace period before "visitor left":**
```
WebSocket disconnects
    ↓
Decrement active_connections
    ↓
If active_connections > 0 → no action (other tabs still open)
If active_connections = 0 → start 30s grace timer, set disconnected_at
    ↓
If reconnects within 30s → cancel timer, clear disconnected_at
If 30s passes → broadcast "visitor_left" to reps
```

Uses existing `active_connections` column - reconnection is just another connection before timeout.

**Dual grace periods (visibility vs pingable):**

| Grace Period | Duration | Purpose |
|--------------|----------|---------|
| Visibility | 30s | User stays in rep's list (prevents flicker during navigation) |
| Ping eligibility | 5s | Ping button enabled (prevents pinging users who left) |

```
User disconnects (T=0)
    ↓
T=0-5s:   User visible ✓   Ping enabled ✓   (likely navigating)
T=5-30s:  User visible ✓   Ping disabled ✗  (may have left)
T=30s+:   User removed from list
```

**Implementation:**
```sql
-- Add to liveconnect_visitors
ALTER TABLE liveconnect_visitors ADD COLUMN
    disconnected_at TIMESTAMP;  -- NULL if connected, set when last connection drops

-- On WebSocket disconnect (when active_connections becomes 0)
UPDATE liveconnect_visitors
SET disconnected_at = NOW()
WHERE id = :visitorId AND active_connections = 0;

-- On WebSocket connect
UPDATE liveconnect_visitors
SET disconnected_at = NULL
WHERE id = :visitorId;

-- Check if pingable (in ping API)
SELECT
    CASE
        WHEN active_connections > 0 THEN true
        WHEN disconnected_at > NOW() - INTERVAL '5 seconds' THEN true
        ELSE false
    END AS is_pingable
FROM liveconnect_visitors
WHERE id = :visitorId;
```

**Rep dashboard UI:**
```
Browsing users:
┌───────────────────────────────────────┐
│ 🟢 John Smith    /pricing    [Ping]   │  ← Connected, ping enabled
│ 🟡 Sarah Connor  /demo       [Ping]   │  ← Disconnected <5s, ping enabled
│ 🟡 Anonymous     /home       [----]   │  ← Disconnected >5s, ping disabled
└───────────────────────────────────────┘
```

- 🟢 Green dot: actively connected
- 🟡 Yellow dot: disconnected but within 30s grace period
- Ping button grayed out with tooltip: "User may have left"

**State sync on reconnect:**
```
Client sends: { type: 'sync', lastEventId: 'evt_123' }
    ↓
Server sends missed events since lastEventId:
- rep_availability_changed (if changed)
- incoming_ping (if pending)
- message_received (any missed messages)
- Current request status (if any)
```

### What's Protected

| Scenario | Behavior |
|----------|----------|
| WiFi blips for 5s | Seamless reconnect, rep never sees "left" |
| Signal lost for 20s | Reconnects within grace period, no disruption |
| Disconnect during pending request | Request stays valid (30s expiry independent of WebSocket) |
| Disconnect during chat | Messages queued client-side, sent on reconnect |
| Disconnect > 30s | Visitor marked as left, must re-request if needed |

### Events for Reconnection

```
# Client → Server
{ type: 'sync', lastEventId: 'evt_123' }

# Server → Client (on reconnect)
{ type: 'sync_response', events: [...], currentState: { repAvailable, pendingRequest, ... } }
```

---

## WebSocket Scaling

**V1: Single instance (start here)**

With one backend instance, all WebSocket connections are on the same server. No coordination needed - just broadcast to local connections.

```
┌─────────────────────────────────┐
│   Single Backend Instance       │
│   ┌───────────────────────────┐ │
│   │ In-memory connection map  │ │
│   │ Rep A ──┐                 │ │
│   │ Rep B ──┼── broadcast()   │ │
│   │ Visitor X                 │ │
│   └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Future: Multiple instances (Redis Pub/Sub)**

When scaling to multiple backend instances, WebSocket connections are distributed across servers. Use Redis Pub/Sub to coordinate.

```
┌─────────────────────────────────────────────────────────────┐
│                         REDIS                                │
│  Channel: liveconnect:project:{projectId}                   │
└─────────────────────────────────────────────────────────────┘
        ▲           ▲           ▲
   SUBSCRIBE   SUBSCRIBE   SUBSCRIBE
        │           │           │
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │Server 1 │ │Server 2 │ │Server 3 │
   │ Rep A   │ │ Rep B   │ │Visitor X│
   └─────────┘ └─────────┘ └─────────┘

Visitor X sends message → Server 3 publishes to Redis
→ All servers receive → Server 1 forwards to Rep A
```

**When to add Redis Pub/Sub:**
- Running 2+ backend instances
- Need high availability (if one dies, others work)
- Need zero-downtime deployments
- Traffic exceeds single instance capacity

**Migration path:**
1. Start with single instance + in-memory broadcast
2. Abstract broadcast behind interface: `WebSocketBroadcaster`
3. When ready to scale, swap implementation to `RedisWebSocketBroadcaster`
4. No other code changes needed

```java
// Interface (use from day 1)
public interface WebSocketBroadcaster {
    void broadcastToProject(String projectId, Event event);
    void broadcastToVisitor(String visitorId, Event event);
    void broadcastToRep(String repId, Event event);
}

// V1: In-memory implementation
public class LocalWebSocketBroadcaster implements WebSocketBroadcaster {
    private final Map<String, Set<WebSocketSession>> connections;
    // ... broadcast to local connections only
}

// Future: Redis implementation
public class RedisWebSocketBroadcaster implements WebSocketBroadcaster {
    private final RedisTemplate redis;
    // ... publish to Redis, all instances receive
}
```

---

## WebSocket Events

**Note:** `message_received` events only occur during active video calls (call-first design).

### User Widget Receives
```
rep_availability_changed: { available: boolean, repCount: number }
incoming_ping: { repName, expiresAt }
ping_expired: {}
call_starting: { roomName, token }
call_ended: { conversationId, reason }
message_received: { conversationId, content, sender }  // In-call chat only
```

### Rep Dashboard Receives
```
visitor_joined: { visitorId, name?, email?, page }
visitor_left: { visitorId }
visitor_updated: { visitorId, page?, identified? }
request_received: { visitorId, visitorName, expiresAt }
request_accepted_by_other: { visitorId, repName }
request_expired: { visitorId }
call_ended: { conversationId, reason }
message_received: { conversationId, content }  // In-call chat only
queue_updated: { waitingCount }
```

---

## Implementation Phases

### Phase 1: Foundation
1. Add `type` column to projects table
2. Update project creation UI with type selection
3. Create LiveConnect settings table and entity
4. Add embed key generation with domain restrictions
5. Implement rate limiting middleware
6. Add domain validation on widget API requests

### Phase 2: Presence System
1. Create reps and visitors tables
2. Implement WebSocket gateway
3. Build heartbeat system for presence
4. Add availability toggle in dashboard

### Phase 3: Request/Ping Flow
1. Create requests table
2. Implement request creation with 30s expiry
3. Build accept/decline/expire logic
4. Add ping cooldown (30s per user)

### Phase 4: Conversations
1. Create conversations and messages tables
2. Implement 30-min throttle logic
3. Build "End Conversation" action
4. Add contact form for offline mode

### Phase 5: Video Integration
1. Integrate LiveKit Cloud SDK
2. Generate LiveKit tokens
3. Build video call UI (camera, mute, end call)
4. Add voice isolation (Krisp)
5. Handle call disconnects and sync with conversation state (see below)

### Phase 6: Widget SDK
1. Build embeddable JavaScript widget
2. Create floating UI component
3. Implement all widget interactions
4. Publish to CDN

### Phase 7: Dashboard UI
1. Build "Live Users" real-time panel
2. Create conversation history page
3. Add queue indicator
4. Build video call overlay
5. Add embed key management with domain configuration
6. Add IP blocking and visitor banning UI

---

## Key Files to Modify

### Backend
- `/backend/src/main/java/com/notificationservice/entity/Project.java` - add type field
- `/backend/src/main/resources/db/migration/` - new migration files
- New package: `/backend/src/main/java/com/notificationservice/liveconnect/`

### Frontend
- `/frontend/app/dashboard/projects/new/` - type selection
- `/frontend/app/dashboard/projects/[id]/` - type-specific tabs
- New: `/frontend/app/dashboard/projects/[id]/live-users/`
- New: `/frontend/app/dashboard/projects/[id]/conversations/`
- New: `/frontend/components/liveconnect/`

### New SDK
- `/sdks/liveconnect-widget/` - embeddable widget

---

## Widget Build & Distribution

### Widget Source Structure

```
/sdks/liveconnect-widget/
├── src/
│   ├── index.ts              # Entry point, idempotent loader
│   ├── widget.tsx            # Floating button/chat UI (Preact or vanilla)
│   ├── api.ts                # HTTP client for /v1/liveconnect/*
│   ├── websocket.ts          # WebSocket connection + reconnection
│   ├── livekit.ts            # LiveKit SDK integration
│   └── styles.css            # Widget styles (inlined in bundle)
├── package.json
├── vite.config.ts            # Bundler config
├── tsconfig.json
└── dist/
    └── liveconnect.js        # Output: single IIFE bundle (~50-100KB)
```

### Build Output

- **Format:** IIFE (Immediately Invoked Function Expression) - no module dependencies
- **Single file:** All code + styles bundled together
- **Minified + gzipped:** ~50-100KB
- **No external dependencies:** Self-contained

### CDN Hosting

**V1: Vercel (via Next.js frontend)**

Place built widget in frontend's public folder:

```
/frontend/public/sdk/
├── liveconnect@1.js          # Current v1.x.x
├── liveconnect@1.0.0.js      # Exact version (optional)
└── liveconnect@1.2.3.js      # Exact version (optional)
```

**URLs:**

| Phase | URL |
|-------|-----|
| Development (no domain) | `https://your-app.vercel.app/sdk/liveconnect@1.js` |
| Production (with domain) | `https://notifykit.dev/sdk/liveconnect@1.js` |

**Why Vercel:**
- Zero extra infrastructure
- Deploys with frontend
- Global edge network (fast worldwide)
- Free on most plans

**Future (optional):** Migrate to Cloudflare R2 for dedicated `cdn.notifykit.dev` domain if needed.

### Versioning Strategy

**Major version URLs (recommended):**

```html
<!-- Auto-updates within v1.x.x (recommended) -->
<script src="https://notifykit.dev/sdk/liveconnect@1.js"></script>

<!-- Exact version for those who need control -->
<script src="https://notifykit.dev/sdk/liveconnect@1.2.3.js"></script>
```

**Versioning rules:**

| Change Type | Version Bump | `@1.js` Users |
|-------------|--------------|---------------|
| Bug fix | 1.0.0 → 1.0.1 | Auto-updated |
| New feature | 1.0.1 → 1.1.0 | Auto-updated |
| Breaking change | 1.x.x → 2.0.0 | Must manually switch to `@2.js` |

**Cache headers:**

```
# Major version files (@1.js) - short cache, auto-updates
Cache-Control: public, max-age=3600  # 1 hour

# Exact version files (@1.2.3.js) - long cache, immutable
Cache-Control: public, max-age=31536000, immutable  # 1 year
```

### Build Pipeline

```
Developer pushes to /sdks/liveconnect-widget/
    ↓
CI detects changes in widget directory
    ↓
npm run build (outputs dist/liveconnect.js)
    ↓
Copy to /frontend/public/sdk/liveconnect@{version}.js
    ↓
Update /frontend/public/sdk/liveconnect@1.js (latest v1)
    ↓
Frontend deploys to Vercel (includes widget)
```

### Embed Code for Customers

```html
<!-- Basic embed -->
<script
  src="https://notifykit.dev/sdk/liveconnect@1.js"
  data-key="lck_xxx"
></script>

<!-- With identified user -->
<script
  src="https://notifykit.dev/sdk/liveconnect@1.js"
  data-key="lck_xxx"
  data-user-id="user_123"
  data-user-name="John Smith"
  data-user-email="john@acme.com"
></script>
```

---

## Verification

1. Create a LiveConnect project in dashboard
2. Generate embed key
3. Embed widget on test page
4. Toggle rep availability
5. Test user request → rep accept → video call
6. Test rep ping → user accept → video call
7. Test 30s timeout on requests
8. Test offline contact form
9. Verify conversation history saved
10. Test 30-min conversation throttle

---

## Summary

LiveConnect adds live video sales engagement to NotifyKit:

- **Project types:** NotifyKit (notifications) vs LiveConnect (video sales)
- **Call-first design:** No pre-call text messaging - users request calls or leave contact info
- **Widget:** Script tag embed, low-profile floating button, popup for calls
- **Video:** LiveKit Cloud, 1:1 calls, voice isolation, in-call chat
- **Presence:** Three-state (offline/available/in_call), heartbeat + toggle
- **Requests:** 30s timeout, user→all reps, rep→one user, mutual consent
- **Conversations:** Video calls + contact form submissions, 30-min auto-end
- **Offline:** Contact form (name, email, phone, message) with email notification
- **Security:** Domain restriction, rate limiting, IP blocking, visitor banning
- **Notifications:** Sound chimes, popup for incoming pings when collapsed