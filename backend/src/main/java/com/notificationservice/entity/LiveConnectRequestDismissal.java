package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Tracks per-rep dismissals of LiveConnect requests.
 * When a rep dismisses a request, a record is created here instead of
 * changing the request status, so other reps can still see the request.
 */
@Entity
@Table(name = "liveconnect_request_dismissals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectRequestDismissal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private LiveConnectRequest request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rep_id", nullable = false)
    private LiveConnectRep rep;

    @Builder.Default
    @Column(name = "dismissed_at")
    private OffsetDateTime dismissedAt = OffsetDateTime.now();
}
