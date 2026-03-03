package com.notificationservice.repository;

import com.notificationservice.entity.AuthProvider;
import com.notificationservice.entity.UserIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, UUID> {
    Optional<UserIdentity> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);

    @Query("SELECT ui FROM UserIdentity ui JOIN FETCH ui.user WHERE ui.provider = :provider AND ui.providerUserId = :providerUserId")
    Optional<UserIdentity> findByProviderAndProviderUserIdWithUser(AuthProvider provider, String providerUserId);

    List<UserIdentity> findByUserId(UUID userId);

    @Query("SELECT ui FROM UserIdentity ui WHERE ui.user.id = :userId AND ui.provider = :provider")
    Optional<UserIdentity> findByUserIdAndProvider(UUID userId, AuthProvider provider);

    boolean existsByProviderAndProviderUserId(AuthProvider provider, String providerUserId);
}
