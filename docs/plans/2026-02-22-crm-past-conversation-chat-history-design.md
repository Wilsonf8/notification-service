# CRM Past Conversation Chat History

## Overview

Allow users to click past conversations in the CRM visitor detail page to view the text chat history in a modal dialog. Only conversations with messages are clickable.

## Scope

**Single file change:** `frontend/components/liveconnect/crm/visitor-conversations-list.tsx`

No backend changes required — `getMessages()` API and `messageCount` field already exist.

## Behavior

1. Conversations with `messageCount > 0` are visually clickable (cursor pointer, hover highlight)
2. Conversations with `messageCount === 0` remain static
3. Clicking opens a shadcn Dialog with a chat-only view
4. A small message count indicator shows on clickable conversations

## Modal UI

- **Header:** Conversation type + "Chat", close button
- **Subheader:** Date/time, rep name
- **Body:** Chat bubbles in a scrollable container
  - REP messages: left-aligned, primary color background
  - USER messages: right-aligned, muted background
  - SYSTEM messages: centered, italic
- **Loading state:** Skeleton placeholders while messages fetch
- **Style:** No border radius, dark mode default

## Data Flow

- `messageCount` on `LiveConnectConversation` determines clickability (already available)
- `getMessages(projectId, conversationId)` fetches messages on dialog open
- Messages displayed in chronological order (ASC)