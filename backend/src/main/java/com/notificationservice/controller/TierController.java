package com.notificationservice.controller;

import com.notificationservice.dto.TierLimitsDto;
import com.notificationservice.entity.Organization;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.OrganizationRepository;
import com.notificationservice.service.AccessDeniedException;
import com.notificationservice.service.ResourceNotFoundException;
import com.notificationservice.service.TierService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST controller for tier information.
 * Returns tier limits and usage for an organization.
 */
@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
public class TierController {

    private final TierService tierService;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;

    /**
     * Gets tier limits and current usage for an organization.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @return tier limits with current usage data
     */
    @GetMapping("/{slug}/tier")
    public ResponseEntity<TierLimitsDto> getTierLimits(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) {
        Organization org = organizationRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        boolean isMember = organizationMemberRepository.existsByOrganizationIdAndUserId(org.getId(), userId);
        if (!isMember) {
            throw new AccessDeniedException("You are not a member of this organization");
        }

        return ResponseEntity.ok(tierService.getTierLimits(org));
    }
}
