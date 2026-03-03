package com.notificationservice.dto;

import java.util.List;
import java.util.UUID;

/**
 * Response for the account deletion preflight check.
 *
 * @param canDelete whether the user can proceed with deletion
 * @param blockers list of team organizations the user owns that prevent deletion
 */
public record DeletionPreflightResponse(
        boolean canDelete,
        List<OrgBlocker> blockers
) {
    /**
     * An organization that blocks account deletion.
     *
     * @param organizationId the org ID
     * @param name the org display name
     * @param slug the org slug
     */
    public record OrgBlocker(UUID organizationId, String name, String slug) {}
}
