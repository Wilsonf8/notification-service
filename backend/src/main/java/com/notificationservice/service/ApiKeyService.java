package com.notificationservice.service;

import com.notificationservice.dto.ApiKeyCreatedDto;
import com.notificationservice.dto.ApiKeyDto;
import com.notificationservice.dto.CreateApiKeyRequest;
import com.notificationservice.entity.ApiKey;
import com.notificationservice.entity.Project;
import com.notificationservice.repository.ApiKeyRepository;
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
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private static final String KEY_PREFIX = "nsk_";
    private static final int KEY_LENGTH = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ApiKeyRepository apiKeyRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<ApiKeyDto> getApiKeysForProject(UUID projectId, UUID userId) {
        verifyProjectAccess(projectId, userId);
        return apiKeyRepository.findActiveByProjectId(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ApiKeyCreatedDto createApiKey(UUID projectId, CreateApiKeyRequest request, UUID userId) {
        Project project = verifyProjectAccess(projectId, userId);

        String rawKey = generateRawKey();
        String fullKey = KEY_PREFIX + rawKey;
        String keyHash = passwordEncoder.encode(fullKey);
        String keyPrefixDisplay = KEY_PREFIX + rawKey.substring(0, 8) + "...";

        ApiKey apiKey = ApiKey.builder()
                .project(project)
                .name(request.name())
                .keyHash(keyHash)
                .keyPrefix(keyPrefixDisplay)
                .build();

        apiKeyRepository.save(apiKey);

        return new ApiKeyCreatedDto(apiKey.getId(), apiKey.getName(), fullKey);
    }

    @Transactional
    public void revokeApiKey(UUID keyId, UUID userId) {
        ApiKey apiKey = apiKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResourceNotFoundException("API key not found"));

        verifyProjectAccess(apiKey.getProject().getId(), userId);

        apiKey.setRevokedAt(OffsetDateTime.now());
        apiKeyRepository.save(apiKey);
    }

    @Transactional
    public Optional<ApiKey> validateAndGetApiKey(String rawKey) {
        // Find all active keys and check if any matches
        // Note: In production, consider indexing strategies for better performance
        return apiKeyRepository.findAll().stream()
                .filter(key -> !key.isRevoked())
                .filter(key -> passwordEncoder.matches(rawKey, key.getKeyHash()))
                .findFirst()
                .map(key -> {
                    key.setLastUsedAt(OffsetDateTime.now());
                    return apiKeyRepository.save(key);
                });
    }

    private Project verifyProjectAccess(UUID projectId, UUID userId) {
        Project project = projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        boolean isMember = organizationMemberRepository.existsByOrganizationIdAndUserId(
                project.getOrganization().getId(), userId);
        if (!isMember) {
            throw new AccessDeniedException("You don't have access to this project");
        }
        return project;
    }

    private String generateRawKey() {
        byte[] bytes = new byte[KEY_LENGTH];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private ApiKeyDto toDto(ApiKey apiKey) {
        return new ApiKeyDto(
                apiKey.getId(),
                apiKey.getName(),
                apiKey.getKeyPrefix(),
                apiKey.getCreatedAt(),
                apiKey.getLastUsedAt()
        );
    }
}
