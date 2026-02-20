/**
 * API functions for LiveConnect embed key and settings management.
 * @module lib/api/liveconnect
 */

import { apiFetch } from "@/lib/auth";
import type {
  LiveConnectEmbedKey,
  LiveConnectEmbedKeyCreated,
  CreateEmbedKeyRequest,
  UpdateEmbedKeyRequest,
  LiveConnectSettings,
  UpdateLiveConnectSettingsRequest,
} from "@/lib/types";

/**
 * Fetches all embed keys for a project.
 * @param projectId - The project ID
 * @returns Array of embed keys (without full key values)
 */
export async function getLiveConnectEmbedKeys(
  projectId: string
): Promise<LiveConnectEmbedKey[]> {
  return apiFetch<LiveConnectEmbedKey[]>(
    `/api/projects/${projectId}/liveconnect/embed-keys`
  );
}

/**
 * Creates a new embed key for a project.
 * @param projectId - The project ID
 * @param request - The embed key creation request
 * @returns The created embed key with full key (shown only once)
 */
export async function createLiveConnectEmbedKey(
  projectId: string,
  request: CreateEmbedKeyRequest
): Promise<LiveConnectEmbedKeyCreated> {
  return apiFetch<LiveConnectEmbedKeyCreated>(
    `/api/projects/${projectId}/liveconnect/embed-keys`,
    { method: "POST", body: JSON.stringify(request) }
  );
}

/**
 * Updates an embed key.
 * @param projectId - The project ID
 * @param keyId - The embed key ID
 * @param request - The embed key update request
 * @returns The updated embed key
 */
export async function updateLiveConnectEmbedKey(
  projectId: string,
  keyId: string,
  request: UpdateEmbedKeyRequest
): Promise<LiveConnectEmbedKey> {
  return apiFetch<LiveConnectEmbedKey>(
    `/api/projects/${projectId}/liveconnect/embed-keys/${keyId}`,
    { method: "PUT", body: JSON.stringify(request) }
  );
}

/**
 * Revokes an embed key (soft delete).
 * @param projectId - The project ID
 * @param keyId - The embed key ID to revoke
 */
export async function deleteLiveConnectEmbedKey(
  projectId: string,
  keyId: string
): Promise<void> {
  await apiFetch(`/api/projects/${projectId}/liveconnect/embed-keys/${keyId}`, {
    method: "DELETE",
  });
}

/**
 * Fetches LiveConnect settings for a project.
 * @param projectId - The project ID
 * @returns The LiveConnect settings
 */
export async function getLiveConnectSettings(
  projectId: string
): Promise<LiveConnectSettings> {
  return apiFetch<LiveConnectSettings>(
    `/api/projects/${projectId}/liveconnect/settings`
  );
}

/**
 * Updates LiveConnect settings for a project.
 * @param projectId - The project ID
 * @param request - The settings update request
 * @returns The updated settings
 */
export async function updateLiveConnectSettings(
  projectId: string,
  request: UpdateLiveConnectSettingsRequest
): Promise<LiveConnectSettings> {
  return apiFetch<LiveConnectSettings>(
    `/api/projects/${projectId}/liveconnect/settings`,
    { method: "PUT", body: JSON.stringify(request) }
  );
}
