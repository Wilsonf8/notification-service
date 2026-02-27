/**
 * API functions for LiveConnect CRM features.
 * @module lib/api/liveconnect-crm
 */

import { apiFetch } from "@/lib/auth";
import type {
  CrmVisitorListResponse,
  CrmVisitorListParams,
  CrmVisitorDetail,
  UpdateVisitorContactRequest,
  Tag,
  VisitorNote,
  TimelineResponse,
  ConversationsResponse,
} from "@/lib/types";

const CRM_BASE = (projectId: string) =>
  `/api/projects/${projectId}/liveconnect/crm`;

/**
 * Fetches paginated CRM visitor list.
 * @param projectId - The project ID
 * @param params - Query parameters (page, size, days, search, sort, direction)
 * @returns Paginated visitor list
 */
export async function getCrmVisitors(
  projectId: string,
  params?: CrmVisitorListParams
): Promise<CrmVisitorListResponse> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set("page", String(params.page));
  if (params?.size !== undefined) query.set("size", String(params.size));
  if (params?.days !== undefined) query.set("days", String(params.days));
  if (params?.search) query.set("search", params.search);
  if (params?.stages?.length) query.set("stages", params.stages.join(","));
  if (params?.tagIds?.length) query.set("tagIds", params.tagIds.join(","));
  if (params?.hasBeenInCall) query.set("hasBeenInCall", "true");
  if (params?.hasContactForm) query.set("hasContactForm", "true");
  if (params?.hasContactInfo) query.set("hasContactInfo", "true");
  if (params?.repUpdatedInfo) query.set("repUpdatedInfo", "true");
  if (params?.onlineNow) query.set("onlineNow", "true");
  if (params?.sort) query.set("sort", params.sort);
  if (params?.direction) query.set("direction", params.direction);

  const qs = query.toString();
  return apiFetch<CrmVisitorListResponse>(
    `${CRM_BASE(projectId)}/visitors${qs ? `?${qs}` : ""}`
  );
}

/**
 * Fetches full visitor CRM profile.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @returns Full visitor detail
 */
export async function getCrmVisitorDetail(
  projectId: string,
  visitorId: string
): Promise<CrmVisitorDetail> {
  return apiFetch<CrmVisitorDetail>(
    `${CRM_BASE(projectId)}/visitors/${visitorId}`
  );
}

/**
 * Patches visitor contact fields (name, email, phone).
 * Only non-undefined fields are sent to the API.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param data - The contact fields to patch
 */
export async function updateVisitorContact(
  projectId: string,
  visitorId: string,
  data: UpdateVisitorContactRequest
): Promise<void> {
  await apiFetch(`${CRM_BASE(projectId)}/visitors/${visitorId}/contact`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Updates a visitor's pipeline stage.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param stage - The new pipeline stage
 */
export async function updateVisitorStage(
  projectId: string,
  visitorId: string,
  stage: string
): Promise<void> {
  await apiFetch(`${CRM_BASE(projectId)}/visitors/${visitorId}/stage`, {
    method: "PUT",
    body: JSON.stringify({ stage }),
  });
}

/**
 * Assigns a rep to a visitor.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param repId - The rep ID to assign
 */
export async function assignRepToVisitor(
  projectId: string,
  visitorId: string,
  repId: string
): Promise<void> {
  await apiFetch(`${CRM_BASE(projectId)}/visitors/${visitorId}/assign`, {
    method: "PUT",
    body: JSON.stringify({ repId }),
  });
}

/**
 * Unassigns the rep from a visitor.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 */
export async function unassignRepFromVisitor(
  projectId: string,
  visitorId: string
): Promise<void> {
  await apiFetch(`${CRM_BASE(projectId)}/visitors/${visitorId}/assign`, {
    method: "DELETE",
  });
}

/**
 * Adds a tag to a visitor.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param tagId - The tag ID to assign
 */
export async function addTagToVisitor(
  projectId: string,
  visitorId: string,
  tagId: string
): Promise<void> {
  await apiFetch(`${CRM_BASE(projectId)}/visitors/${visitorId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
}

/**
 * Removes a tag from a visitor.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param tagId - The tag ID to remove
 */
export async function removeTagFromVisitor(
  projectId: string,
  visitorId: string,
  tagId: string
): Promise<void> {
  await apiFetch(
    `${CRM_BASE(projectId)}/visitors/${visitorId}/tags/${tagId}`,
    { method: "DELETE" }
  );
}

/**
 * Fetches all tag definitions for a project.
 * @param projectId - The project ID
 * @returns List of tags
 */
export async function getProjectTags(projectId: string): Promise<Tag[]> {
  return apiFetch<Tag[]>(`${CRM_BASE(projectId)}/tags`);
}

/**
 * Creates a new tag definition.
 * @param projectId - The project ID
 * @param name - The tag name
 * @param color - The hex color code
 * @returns The created tag
 */
export async function createTag(
  projectId: string,
  name: string,
  color: string
): Promise<Tag> {
  return apiFetch<Tag>(`${CRM_BASE(projectId)}/tags`, {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
}

/**
 * Updates a tag definition.
 * @param projectId - The project ID
 * @param tagId - The tag ID
 * @param name - The new tag name
 * @param color - The new hex color
 * @returns The updated tag
 */
export async function updateTag(
  projectId: string,
  tagId: string,
  name?: string,
  color?: string
): Promise<Tag> {
  return apiFetch<Tag>(`${CRM_BASE(projectId)}/tags/${tagId}`, {
    method: "PUT",
    body: JSON.stringify({ name, color }),
  });
}

/**
 * Deletes a tag definition.
 * @param projectId - The project ID
 * @param tagId - The tag ID
 */
export async function deleteTag(
  projectId: string,
  tagId: string
): Promise<void> {
  await apiFetch(`${CRM_BASE(projectId)}/tags/${tagId}`, {
    method: "DELETE",
  });
}

/**
 * Fetches paginated notes for a visitor.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param page - Page number (0-indexed)
 * @param size - Page size
 * @returns Paginated notes
 */
export async function getVisitorNotes(
  projectId: string,
  visitorId: string,
  page = 0,
  size = 20
): Promise<{ content: VisitorNote[]; totalPages: number; totalElements: number }> {
  return apiFetch(
    `${CRM_BASE(projectId)}/visitors/${visitorId}/notes?page=${page}&size=${size}`
  );
}

/**
 * Adds a note to a visitor.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param content - The note text
 * @returns The created note
 */
export async function addVisitorNote(
  projectId: string,
  visitorId: string,
  content: string
): Promise<VisitorNote> {
  return apiFetch<VisitorNote>(
    `${CRM_BASE(projectId)}/visitors/${visitorId}/notes`,
    { method: "POST", body: JSON.stringify({ content }) }
  );
}

/**
 * Deletes a note.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param noteId - The note ID
 */
export async function deleteVisitorNote(
  projectId: string,
  visitorId: string,
  noteId: string
): Promise<void> {
  await apiFetch(
    `${CRM_BASE(projectId)}/visitors/${visitorId}/notes/${noteId}`,
    { method: "DELETE" }
  );
}

/**
 * Fetches unified timeline for a visitor.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param page - Page number (0-indexed)
 * @param size - Page size
 * @returns Paginated timeline
 */
export async function getVisitorTimeline(
  projectId: string,
  visitorId: string,
  page = 0,
  size = 30
): Promise<TimelineResponse> {
  return apiFetch<TimelineResponse>(
    `${CRM_BASE(projectId)}/visitors/${visitorId}/timeline?page=${page}&size=${size}`
  );
}

/**
 * Fetches paginated conversations for a specific visitor.
 * @param projectId - The project ID
 * @param visitorId - The visitor's internal ID
 * @param page - Page number (0-indexed)
 * @param size - Page size
 * @returns Paginated conversations
 */
export async function getVisitorConversations(
  projectId: string,
  visitorId: string,
  page = 0,
  size = 20
): Promise<ConversationsResponse> {
  return apiFetch<ConversationsResponse>(
    `${CRM_BASE(projectId)}/visitors/${visitorId}/conversations?page=${page}&size=${size}`
  );
}
