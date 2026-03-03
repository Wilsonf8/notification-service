package com.notificationservice.job;

import com.notificationservice.entity.User;
import com.notificationservice.repository.OrganizationRepository;
import com.notificationservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Scheduled job that permanently purges user accounts whose 30-day
 * grace period has expired after soft-deletion.
 * Runs daily at 3:50 AM.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AccountPurgeJob {

    private static final int GRACE_PERIOD_DAYS = 30;

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;

    /**
     * Finds and permanently deletes user accounts that were soft-deleted
     * more than 30 days ago. The User entity's cascade settings handle
     * deletion of UserIdentity records and owned Organizations (which
     * further cascade to projects and LiveConnect data).
     */
    @Scheduled(cron = "0 50 3 * * *")
    @Transactional
    public void purgeExpiredAccounts() {
        OffsetDateTime threshold = OffsetDateTime.now().minusDays(GRACE_PERIOD_DAYS);
        List<User> usersToPurge = userRepository.findUsersEligibleForPurge(threshold);

        if (usersToPurge.isEmpty()) {
            return;
        }

        log.info("Starting account purge for {} users past the {}-day grace period",
                usersToPurge.size(), GRACE_PERIOD_DAYS);

        for (User user : usersToPurge) {
            try {
                purgeUser(user);
                log.info("Purged account for user {} ({})", user.getId(), user.getEmail());
            } catch (Exception e) {
                log.error("Failed to purge account for user {} ({}): {}",
                        user.getId(), user.getEmail(), e.getMessage(), e);
            }
        }

        log.info("Account purge completed. Processed {} users.", usersToPurge.size());
    }

    /**
     * Hard-deletes a single user and all associated data.
     * Personal org is deleted first via cascade from the Organization entity,
     * then the user record itself (cascades to UserIdentity records).
     */
    private void purgeUser(User user) {
        // Delete personal org explicitly (cascades to members, projects, and all LC data)
        organizationRepository.findPersonalOrgByUserIdIncludingDeleted(user.getId())
                .ifPresent(organizationRepository::delete);

        // Delete the user (cascades to UserIdentity via orphanRemoval)
        userRepository.delete(user);
    }
}
