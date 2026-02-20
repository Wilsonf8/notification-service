package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Settings for a LiveConnect-enabled project.
 * One-to-one relationship with Project.
 */
@Entity
@Table(name = "liveconnect_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectSettings {
    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "welcome_message", columnDefinition = "TEXT")
    @Builder.Default
    private String welcomeMessage = "Hi! How can we help you today?";

    @Column(name = "widget_color")
    @Builder.Default
    private String widgetColor = "#FACC15";

    @Column(name = "widget_position")
    @Builder.Default
    private String widgetPosition = "bottom-right";

    @Column(name = "offline_message", columnDefinition = "TEXT")
    @Builder.Default
    private String offlineMessage = "No reps available. Leave your info and we'll get back to you.";

    @Column(name = "background_color")
    @Builder.Default
    private String backgroundColor = "#0c0a09";

    @Column(name = "text_color")
    @Builder.Default
    private String textColor = "#fafaf9";

    @Column(name = "border_radius")
    @Builder.Default
    private Integer borderRadius = 0;

    @Column(name = "font_family")
    @Builder.Default
    private String fontFamily = "JetBrains Mono";

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
