/**
 * API functions for LiveConnect dashboard features.
 * Includes rep management, visitors, requests, and conversations.
 * @module lib/api/liveconnect-dashboard
 */

import { apiFetch } from "@/lib/auth";
import type {
  LiveConnectRep,
  LiveConnectRequest,
  LiveConnectConversation,
  LiveConnectMessage,
  PageView,
  VisitorsResponse,
  AcceptRequestResponse,
  ConversationTokenResponse,
  ConversationsResponse,
  ConversationFilters,
  AddRepRequest,
  SendMessageRequest,
  VisitorDetailResponse,
} from "@/lib/types";

// ============================================================================
// Rep Management
// ============================================================================

/**
 * Fetches all reps for a project.
 * @param projectId - The project ID
 * @returns Array of reps with their availability and presence status
 */
export async function getReps(projectId: string): Promise<LiveConnectRep[]> {
  return apiFetch<LiveConnectRep[]>(
    `/api/projects/${projectId}/liveconnect/reps`
  );
}

/**
 * Adds a user as a rep for a project.
 * @param projectId - The project ID
 * @param userId - The user ID to add as a rep
 * @returns The created rep
 */
export async function addRep(
  projectId: string,
  userId: string
): Promise<LiveConnectRep> {
  const request: AddRepRequest = { userId };
  return apiFetch<LiveConnectRep>(
    `/api/projects/${projectId}/liveconnect/reps`,
    { method: "POST", body: JSON.stringify(request) }
  );
}

/**
 * Removes a rep from a project.
 * @param projectId - The project ID
 * @param repUserId - The rep's user ID to remove
 */
export async function removeRep(
  projectId: string,
  repUserId: string
): Promise<void> {
  await apiFetch(`/api/projects/${projectId}/liveconnect/reps/${repUserId}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Rep Availability
// ============================================================================

/**
 * Updates the current rep's availability status.
 * @param projectId - The project ID
 * @param availability - The new availability status
 * @returns The updated rep
 */
export async function updateAvailability(
  projectId: string,
  availability: "available" | "unavailable"
): Promise<LiveConnectRep> {
  return apiFetch<LiveConnectRep>(
    `/api/projects/${projectId}/liveconnect/availability`,
    { method: "PUT", body: JSON.stringify({ availability }) }
  );
}

/**
 * Resets the current rep's state (clears stuck conversation).
 * Useful for recovering from failed calls during testing.
 * @param projectId - The project ID
 * @returns The updated rep
 */
export async function resetRepState(
  projectId: string
): Promise<LiveConnectRep> {
  return apiFetch<LiveConnectRep>(
    `/api/projects/${projectId}/liveconnect/reset-state`,
    { method: "POST" }
  );
}

// ============================================================================
// Live Users (Visitors)
// ============================================================================

/**
 * Fetches current visitors (both browsing and in queue).
 * @param projectId - The project ID
 * @returns Object containing browsing visitors and request queue
 */
export async function getVisitors(
  projectId: string
): Promise<VisitorsResponse> {
  return apiFetch<VisitorsResponse>(
    `/api/projects/${projectId}/liveconnect/visitors`
  );
}

/**
 * Pings a visitor to initiate a call request from rep side.
 * @param projectId - The project ID
 * @param visitorId - The visitor ID to ping
 */
export async function pingVisitor(
  projectId: string,
  visitorId: string
): Promise<void> {
  await apiFetch(
    `/api/projects/${projectId}/liveconnect/visitors/${visitorId}/ping`,
    { method: "POST" }
  );
}

/**
 * Fetches visit statistics and history for a visitor.
 * @param projectId - The project ID
 * @param visitorId - The visitor ID
 * @param page - Page number (0-indexed)
 * @param size - Page size
 * @returns Visit stats and paginated history
 */
export async function getVisitorVisits(
  projectId: string,
  visitorId: string,
  page: number = 0,
  size: number = 20
): Promise<VisitorDetailResponse> {
  return apiFetch<VisitorDetailResponse>(
    `/api/projects/${projectId}/liveconnect/visitors/${visitorId}/visits?page=${page}&size=${size}`
  );
}

/**
 * Fetches page view history for a visitor.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param limit - Maximum number of page views to return
 * @returns Array of page views
 */
export async function getPageViews(
  projectId: string,
  visitorId: string,
  limit: number = 50
): Promise<PageView[]> {
  return apiFetch<PageView[]>(
    `/api/projects/${projectId}/liveconnect/visitors/${visitorId}/page-views?limit=${limit}`
  );
}

// ============================================================================
// Requests
// ============================================================================

/**
 * Fetches pending call requests.
 * @param projectId - The project ID
 * @returns Array of pending requests
 */
export async function getPendingRequests(
  projectId: string
): Promise<LiveConnectRequest[]> {
  return apiFetch<LiveConnectRequest[]>(
    `/api/projects/${projectId}/liveconnect/requests`
  );
}

/**
 * Accepts a call request and joins the video call.
 * @param projectId - The project ID
 * @param requestId - The request ID to accept
 * @param deviceSessionId - The device session ID of the accepting client (optional)
 * @returns Object containing conversation ID, room name, and LiveKit token
 */
export async function acceptRequest(
  projectId: string,
  requestId: string,
  deviceSessionId?: string
): Promise<AcceptRequestResponse> {
  const params = deviceSessionId ? `?deviceSessionId=${encodeURIComponent(deviceSessionId)}` : '';
  return apiFetch<AcceptRequestResponse>(
    `/api/projects/${projectId}/liveconnect/requests/${requestId}/accept${params}`,
    { method: "POST" }
  );
}

/**
 * Dismisses a call request (hides it from this rep).
 * @param projectId - The project ID
 * @param requestId - The request ID to dismiss
 */
export async function dismissRequest(
  projectId: string,
  requestId: string
): Promise<void> {
  await apiFetch(
    `/api/projects/${projectId}/liveconnect/requests/${requestId}/dismiss`,
    { method: "POST" }
  );
}

// ============================================================================
// Conversations
// ============================================================================

/**
 * Fetches conversations with optional filters and pagination.
 * @param projectId - The project ID
 * @param filters - Optional filter parameters
 * @returns Paginated list of conversations
 */
export async function getConversations(
  projectId: string,
  filters?: ConversationFilters
): Promise<ConversationsResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.page !== undefined) params.set("page", String(filters.page));
  if (filters?.size !== undefined) params.set("size", String(filters.size));

  const queryString = params.toString();
  const url = `/api/projects/${projectId}/liveconnect/conversations${queryString ? `?${queryString}` : ""}`;
  return apiFetch<ConversationsResponse>(url);
}

/**
 * Fetches a single conversation by ID.
 * @param projectId - The project ID
 * @param conversationId - The conversation ID
 * @returns The conversation details
 */
export async function getConversation(
  projectId: string,
  conversationId: string
): Promise<LiveConnectConversation> {
  return apiFetch<LiveConnectConversation>(
    `/api/projects/${projectId}/liveconnect/conversations/${conversationId}`
  );
}

/**
 * Fetches messages for a conversation.
 * @param projectId - The project ID
 * @param conversationId - The conversation ID
 * @returns Array of messages
 */
export async function getMessages(
  projectId: string,
  conversationId: string
): Promise<LiveConnectMessage[]> {
  const response = await apiFetch<{ messages: LiveConnectMessage[] }>(
    `/api/projects/${projectId}/liveconnect/conversations/${conversationId}/messages`
  );
  return response.messages;
}

/**
 * Sends a message in a conversation.
 * @param projectId - The project ID
 * @param conversationId - The conversation ID
 * @param content - The message content
 * @returns The created message
 */
export async function sendMessage(
  projectId: string,
  conversationId: string,
  content: string
): Promise<LiveConnectMessage> {
  const request: SendMessageRequest = { content };
  return apiFetch<LiveConnectMessage>(
    `/api/projects/${projectId}/liveconnect/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify(request) }
  );
}

/**
 * Ends an active conversation.
 * @param projectId - The project ID
 * @param conversationId - The conversation ID
 * @returns The updated conversation
 */
export async function endConversation(
  projectId: string,
  conversationId: string
): Promise<LiveConnectConversation> {
  return apiFetch<LiveConnectConversation>(
    `/api/projects/${projectId}/liveconnect/conversations/${conversationId}/end`,
    { method: "POST" }
  );
}

/**
 * Gets a LiveKit token to rejoin an active conversation.
 * @param projectId - The project ID
 * @param conversationId - The conversation ID
 * @returns LiveKit connection details
 */
export async function getConversationToken(
  projectId: string,
  conversationId: string
): Promise<ConversationTokenResponse> {
  return apiFetch<ConversationTokenResponse>(
    `/api/projects/${projectId}/liveconnect/conversations/${conversationId}/token`
  );
}
