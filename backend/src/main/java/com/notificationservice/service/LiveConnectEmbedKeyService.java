package com.notificationservice.service;

import com.notificationservice.dto.*;
import com.notificationservice.entity.LiveConnectEmbedKey;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.ProjectType;
import com.notificationservice.repository.LiveConnectEmbedKeyRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing LiveConnect embed keys.
 */
@Service
@RequiredArgsConstructor
public class LiveConnectEmbedKeyService {

    private static final String KEY_PREFIX = "lck_";
    private static final int KEY_LENGTH = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final LiveConnectEmbedKeyRepository embedKeyRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final SubscriptionService subscriptionService;
    private final TierService tierService;

    /**
     * Gets all embed keys for a project.
     *
     * @param projectId the project ID
     * @param userId the requesting user's ID
     * @return list of embed key DTOs (with key prefix only)
     * @throws ResourceNotFoundException if project not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional(readOnly = true)
    public List<LiveConnectEmbedKeyDto> getEmbedKeys(UUID projectId, UUID userId) {
        getAndValidateProject(projectId, userId);
        return embedKeyRepository.findActiveByProjectId(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Creates a new embed key for a project.
     *
     * @param projectId the project ID
     * @param request the creation request
     * @param userId the requesting user's ID
     * @return the created embed key DTO (includes full key, shown only once)
     * @throws ResourceNotFoundException if project not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional
    public LiveConnectEmbedKeyCreatedDto createEmbedKey(UUID projectId, CreateLiveConnectEmbedKeyRequest request, UUID userId) {
        Project project = getAndValidateProject(projectId, userId);
        tierService.enforceOrgActive(project.getOrganization());
        tierService.enforceEmbedKeyLimit(project.getOrganization(), projectId);

        String rawKey = generateRawKey();
        String fullKey = KEY_PREFIX + rawKey;
        String keyHash = passwordEncoder.encode(fullKey);
        String keyPrefixDisplay = KEY_PREFIX + rawKey.substring(0, 8) + "...";

        List<String> allowedDomains = request.allowedDomains() != null
                ? request.allowedDomains()
                : List.of();

        LiveConnectEmbedKey embedKey = LiveConnectEmbedKey.builder()
                .project(project)
                .name(request.name())
                .keyHash(keyHash)
                .keyPrefix(keyPrefixDisplay)
                .allowedDomains(allowedDomains)
                .build();

        embedKeyRepository.save(embedKey);

        return new LiveConnectEmbedKeyCreatedDto(
                embedKey.getId(),
                embedKey.getName(),
                fullKey,
                embedKey.getAllowedDomains(),
                embedKey.getCreatedAt()
        );
    }

    /**
     * Updates an embed key's name and allowed domains.
     *
     * @param keyId the embed key ID
     * @param request the update request
     * @param userId the requesting user's ID
     * @return the updated embed key DTO
     * @throws ResourceNotFoundException if key not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional
    public LiveConnectEmbedKeyDto updateEmbedKey(UUID keyId, UpdateLiveConnectEmbedKeyRequest request, UUID userId) {
        LiveConnectEmbedKey embedKey = embedKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResourceNotFoundException("Embed key not found"));

        if (embedKey.getIsRevoked()) {
            throw new ResourceNotFoundException("Embed key not found");
        }

        getAndValidateProject(embedKey.getProject().getId(), userId);

        if (request.name() != null) {
            embedKey.setName(request.name());
        }
        if (request.allowedDomains() != null) {
            embedKey.setAllowedDomains(request.allowedDomains());
        }

        return toDto(embedKeyRepository.save(embedKey));
    }

    /**
     * Revokes (soft deletes) an embed key.
     *
     * @param keyId the embed key ID
     * @param userId the requesting user's ID
     * @throws ResourceNotFoundException if key not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional
    public void deleteEmbedKey(UUID keyId, UUID userId) {
        LiveConnectEmbedKey embedKey = embedKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResourceNotFoundException("Embed key not found"));

        if (embedKey.getIsRevoked()) {
            throw new ResourceNotFoundException("Embed key not found");
        }

        getAndValidateProject(embedKey.getProject().getId(), userId);

        embedKey.setIsRevoked(true);
        embedKeyRepository.save(embedKey);
    }

    /**
     * Validates an embed key and checks domain authorization.
     * Used internally by widget initialization.
     *
     * @param key the full embed key
     * @param domain the requesting domain
     * @return the embed key if valid
     * @throws ResourceNotFoundException if key is invalid or domain not allowed
     */
    @Transactional
    public LiveConnectEmbedKey validateEmbedKey(String key, String domain) {
        LiveConnectEmbedKey embedKey = embedKeyRepository.findAll().stream()
                .filter(k -> !k.getIsRevoked())
                .filter(k -> passwordEncoder.matches(key, k.getKeyHash()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Invalid embed key"));

        if (embedKey.getAllowedDomains() != null && !embedKey.getAllowedDomains().isEmpty()) {
            boolean domainAllowed = embedKey.getAllowedDomains().stream()
                    .anyMatch(allowed -> matchesDomain(domain, allowed));
            if (!domainAllowed) {
                throw new AccessDeniedException("Domain not authorized for this embed key");
            }
        }

        // Check organization is active (free tier always active, team needs subscription)
        if (!tierService.isOrgActive(embedKey.getProject().getOrganization())) {
            throw new SubscriptionRequiredException("Active subscription required");
        }

        embedKey.setLastUsedAt(OffsetDateTime.now());
        return embedKeyRepository.save(embedKey);
    }

    private boolean matchesDomain(String requestDomain, String allowedDomain) {
        if (requestDomain == null || allowedDomain == null) {
            return false;
        }
        String normalizedRequest = requestDomain.toLowerCase().replaceFirst("^www\\.", "");
        String normalizedAllowed = allowedDomain.toLowerCase().replaceFirst("^www\\.", "");
        return normalizedRequest.equals(normalizedAllowed) ||
                normalizedRequest.endsWith("." + normalizedAllowed);
    }

    private Project getAndValidateProject(UUID projectId, UUID userId) {
        Project project = projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (project.getType() != ProjectType.LIVECONNECT) {
            throw new IllegalArgumentException("Project is not a LiveConnect project");
        }

        boolean isMember = organizationMemberRepository.existsByOrganizationIdAndUserId(
                project.getOrganization().getId(), userId);
        if (!isMember) {
            throw new AccessDeniedException("You are not a member of this organization");
        }

        return project;
    }

    private String generateRawKey() {
        byte[] bytes = new byte[KEY_LENGTH];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private LiveConnectEmbedKeyDto toDto(LiveConnectEmbedKey embedKey) {
        return new LiveConnectEmbedKeyDto(
                embedKey.getId(),
                embedKey.getName(),
                embedKey.getKeyPrefix(),
                embedKey.getAllowedDomains(),
                embedKey.getCreatedAt(),
                embedKey.getLastUsedAt()
        );
    }
}
