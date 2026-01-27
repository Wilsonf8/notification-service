/**
 * TypeScript types for API requests and responses.
 * These match the backend DTOs and entities.
 * @module lib/types
 */

/** User entity returned from the API */
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Telegram destination status */
export interface TelegramDestination {
  username: string | null;
  isEnabled: boolean;
  disabledReason: string | null;
  healthStatus: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN";
}

/** Project type enum */
export type ProjectType = "NOTIFYKIT" | "LIVECONNECT";

/** Project entity returned from the API */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  type: ProjectType;
  telegramDestination: TelegramDestination | null;
  createdAt: string;
  updatedAt?: string;
}

/** API key entity returned from the API */
export interface ApiKey {
  id: string;
  projectId: string;
  keyPrefix: string;
  keyHash?: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** API key with the full key (only returned on creation) */
export interface ApiKeyWithSecret extends ApiKey {
  key: string;
}

/** Telegram chat connected to a project */
export interface TelegramChat {
  id: string;
  projectId: string;
  chatId: string;
  chatType: "private" | "group" | "supergroup" | "channel";
  chatTitle: string | null;
  createdAt: string;
}

/** Event/notification sent through the API */
export interface Event {
  id: string;
  projectId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "pending" | "delivered" | "failed";
  createdAt: string;
  deliveredAt: string | null;
}

/** Request body for creating a project */
export interface CreateProjectRequest {
  name: string;
  type?: ProjectType;
}

/** Request body for updating a project */
export interface UpdateProjectRequest {
  name: string;
}

/** Request body for sending an event */
export interface SendEventRequest {
  type: string;
  data: Record<string, unknown>;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/** Dashboard stats response */
export interface DashboardStats {
  totalProjects: number;
  totalEventsSent: number;
  connectedChats: number;
}

/** Connect token response for Telegram linking */
export interface ConnectToken {
  token: string;
  deepLink: string;
}

/** Organization role enum */
export type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

/** Organization entity returned from the API */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  isPersonal: boolean;
  userRole: OrgRole;
  createdAt: string;
}

/** Organization member returned from the API */
export interface OrganizationMember {
  id: string;
  userId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  role: OrgRole;
  joinedAt: string;
}

/** Request body for creating an organization */
export interface CreateOrganizationRequest {
  name: string;
}

/** Request body for updating an organization */
export interface UpdateOrganizationRequest {
  name: string;
}

/** Request body for adding a member to an organization */
export interface AddMemberRequest {
  username: string;
  role: OrgRole;
}

/** Request body for updating a member's role */
export interface UpdateMemberRoleRequest {
  role: OrgRole;
}

/** LiveConnect embed key returned from the API */
export interface LiveConnectEmbedKey {
  id: string;
  name: string;
  keyPrefix: string;
  allowedDomains: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

/** Response when creating a new embed key (includes full key shown once) */
export interface LiveConnectEmbedKeyCreated {
  id: string;
  name: string;
  key: string;
  allowedDomains: string[];
  createdAt: string;
}

/** Request body for creating an embed key */
export interface CreateEmbedKeyRequest {
  name: string;
  allowedDomains: string[];
}

/** Request body for updating an embed key */
export interface UpdateEmbedKeyRequest {
  name: string;
  allowedDomains: string[];
}
