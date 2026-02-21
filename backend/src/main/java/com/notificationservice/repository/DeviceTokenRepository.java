package com.notificationservice.repository;

import com.notificationservice.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for device tokens used in push notifications.
 */
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, UUID> {

    /**
     * Finds a device token by its token string.
     *
     * @param deviceToken the device token string
     * @return the device token entity if found
     */
    Optional<DeviceToken> findByDeviceToken(String deviceToken);

    /**
     * Finds all valid device tokens for a user.
     *
     * @param userId the user ID
     * @return list of valid device tokens
     */
    @Query("SELECT d FROM DeviceToken d WHERE d.user.id = :userId AND d.isValid = true")
    List<DeviceToken> findValidByUserId(UUID userId);

    /**
     * Finds all device tokens for a user.
     *
     * @param userId the user ID
     * @return list of all device tokens
     */
    List<DeviceToken> findByUserId(UUID userId);

    /**
     * Marks a device token as invalid.
     *
     * @param deviceToken the device token string
     */
    @Modifying
    @Query("UPDATE DeviceToken d SET d.isValid = false WHERE d.deviceToken = :deviceToken")
    void invalidateToken(String deviceToken);

    /**
     * Deletes a device token by its token string and user ID.
     *
     * @param deviceToken the device token string
     * @param userId the user ID
     */
    @Modifying
    @Query("DELETE FROM DeviceToken d WHERE d.deviceToken = :deviceToken AND d.user.id = :userId")
    void deleteByDeviceTokenAndUserId(String deviceToken, UUID userId);

    /**
     * Finds all valid device tokens for multiple users in a single query.
     * Used to avoid N+1 queries when sending push notifications to multiple reps.
     *
     * @param userIds the user IDs
     * @return list of valid device tokens for the given users
     */
    @Query("SELECT d FROM DeviceToken d WHERE d.user.id IN :userIds AND d.isValid = true")
    List<DeviceToken> findValidByUserIds(Collection<UUID> userIds);
}
