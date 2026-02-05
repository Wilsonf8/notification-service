package com.notificationservice.service;

import com.notificationservice.config.LiveKitProperties;
import io.livekit.server.RoomServiceClient;
import livekit.LivekitModels;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import retrofit2.Call;
import retrofit2.Response;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for interacting with LiveKit Room API.
 * Provides methods to query active rooms from the LiveKit server.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveKitRoomService {

    private final LiveKitProperties properties;

    /**
     * Gets the names of all currently active rooms from LiveKit.
     *
     * @return set of active room names, or empty set if unable to fetch
     */
    public Set<String> getActiveRoomNames() {
        try {
            RoomServiceClient client = RoomServiceClient.createClient(
                    properties.url(),
                    properties.apiKey(),
                    properties.apiSecret()
            );

            Call<List<LivekitModels.Room>> call = client.listRooms();
            Response<List<LivekitModels.Room>> response = call.execute();

            if (!response.isSuccessful() || response.body() == null) {
                log.warn("Received unsuccessful or null response from LiveKit listRooms");
                return Collections.emptySet();
            }

            List<LivekitModels.Room> rooms = response.body();
            Set<String> roomNames = rooms.stream()
                    .map(LivekitModels.Room::getName)
                    .collect(Collectors.toSet());

            log.debug("Retrieved {} active rooms from LiveKit", roomNames.size());
            return roomNames;
        } catch (Exception e) {
            log.error("Failed to fetch active rooms from LiveKit: {}", e.getMessage(), e);
            return Collections.emptySet();
        }
    }
}
