package com.notificationservice.websocket.broadcast;

import java.util.UUID;

/**
 * Interface for broadcasting WebSocket events.
 * Abstracts the broadcast mechanism to allow future Redis Pub/Sub scaling.
 */
public interface WebSocketBroadcaster {

    /**
     * Broadcasts an event to all reps connected to a project.
     *
     * @param projectId the project ID
     * @param event the event to broadcast
     */
    void broadcastToProject(UUID projectId, Object event);

    /**
     * Sends an event to a specific rep (all their connected sessions).
     *
     * @param userId the rep's user ID
     * @param event the event to send
     */
    void sendToRep(UUID userId, Object event);

    /**
     * Sends an event to a specific visitor (all their connected sessions).
     *
     * @param visitorId the visitor's internal ID
     * @param event the event to send
     */
    void sendToVisitor(UUID visitorId, Object event);

    /**
     * Broadcasts an event to all visitors connected to a project.
     *
     * @param projectId the project ID
     * @param event the event to broadcast
     */
    void broadcastToProjectVisitors(UUID projectId, Object event);
}