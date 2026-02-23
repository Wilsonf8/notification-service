package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents a single page view by a visitor on a customer's website.
 * Used to build browsing history for the rep dashboard.
 */
@Entity
@Table(name = "liveconnect_page_views")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectPageView {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visitor_id", nullable = false)
    private UUID visitorId;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "url", nullable = false, columnDefinition = "TEXT")
    private String url;

    @Column(name = "title", length = 512)
    private String title;

    @Column(name = "visited_at", nullable = false)
    @Builder.Default
    private OffsetDateTime visitedAt = OffsetDateTime.now();

    @Column(name = "duration_ms")
    private Integer durationMs;
}
