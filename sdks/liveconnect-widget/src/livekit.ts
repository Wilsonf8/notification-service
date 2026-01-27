/**
 * LiveKit SDK Integration.
 * Manages WebRTC video/audio connections through LiveKit for the LiveConnect widget.
 */

import {
  Room,
  RoomEvent,
  Track,
  LocalTrack,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  LocalParticipant,
  ConnectionState,
  createLocalTracks,
  VideoPresets,
  TrackPublication,
} from 'livekit-client';
import { signal, computed } from '@preact/signals';

// ============================================================================
// Types
// ============================================================================

/**
 * LiveKit connection and media state.
 */
export interface LiveKitState {
  /** The active LiveKit room instance */
  room: Room | null;
  /** Whether connected to a room */
  isConnected: boolean;
  /** Connection state */
  connectionState: ConnectionState;
  /** Whether the local microphone is enabled */
  isMicEnabled: boolean;
  /** Whether the local camera is enabled */
  isCameraEnabled: boolean;
  /** Reference to the local video track */
  localVideoTrack: LocalTrack | null;
  /** Reference to the local audio track */
  localAudioTrack: LocalTrack | null;
  /** Reference to the primary remote video track */
  remoteVideoTrack: RemoteTrack | null;
  /** Reference to the primary remote audio track */
  remoteAudioTrack: RemoteTrack | null;
  /** Error message if connection failed */
  error: string | null;
}

/**
 * Callback type for state change listeners.
 */
type StateChangeCallback = (state: LiveKitState) => void;

// ============================================================================
// Internal State (Signals)
// ============================================================================

/** Current LiveKit room instance */
const roomSignal = signal<Room | null>(null);

/** Connection state */
const connectionStateSignal = signal<ConnectionState>(ConnectionState.Disconnected);

/** Local microphone enabled state */
const isMicEnabledSignal = signal<boolean>(true);

/** Local camera enabled state */
const isCameraEnabledSignal = signal<boolean>(true);

/** Local video track */
const localVideoTrackSignal = signal<LocalTrack | null>(null);

/** Local audio track */
const localAudioTrackSignal = signal<LocalTrack | null>(null);

/** Remote video track */
const remoteVideoTrackSignal = signal<RemoteTrack | null>(null);

/** Remote audio track */
const remoteAudioTrackSignal = signal<RemoteTrack | null>(null);

/** Error state */
const errorSignal = signal<string | null>(null);

/** State change listeners */
const stateChangeListeners = new Set<StateChangeCallback>();

// ============================================================================
// Computed State
// ============================================================================

/**
 * Whether currently connected to a room.
 */
export const isConnected = computed(() =>
  connectionStateSignal.value === ConnectionState.Connected
);

/**
 * Computed full state object.
 */
const fullState = computed<LiveKitState>(() => ({
  room: roomSignal.value,
  isConnected: connectionStateSignal.value === ConnectionState.Connected,
  connectionState: connectionStateSignal.value,
  isMicEnabled: isMicEnabledSignal.value,
  isCameraEnabled: isCameraEnabledSignal.value,
  localVideoTrack: localVideoTrackSignal.value,
  localAudioTrack: localAudioTrackSignal.value,
  remoteVideoTrack: remoteVideoTrackSignal.value,
  remoteAudioTrack: remoteAudioTrackSignal.value,
  error: errorSignal.value,
}));

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Notifies all registered state change listeners.
 */
function notifyStateChange(): void {
  const state = fullState.value;
  stateChangeListeners.forEach(callback => {
    try {
      callback(state);
    } catch (err) {
      console.error('[LiveKit] State change callback error:', err);
    }
  });
}

/**
 * Handles track subscribed events for remote participants.
 * @param track - The subscribed remote track
 * @param publication - Track publication info
 * @param participant - The remote participant
 */
function handleTrackSubscribed(
  track: RemoteTrack,
  publication: RemoteTrackPublication,
  participant: RemoteParticipant
): void {
  console.log('[LiveKit] Track subscribed:', {
    kind: track.kind,
    participantId: participant.identity,
    trackSid: publication.trackSid,
  });

  if (track.kind === Track.Kind.Video) {
    remoteVideoTrackSignal.value = track;
  } else if (track.kind === Track.Kind.Audio) {
    remoteAudioTrackSignal.value = track;
    // Auto-play remote audio
    track.attach();
  }

  notifyStateChange();
}

/**
 * Handles track unsubscribed events for remote participants.
 * @param track - The unsubscribed remote track
 * @param publication - Track publication info
 * @param participant - The remote participant
 */
function handleTrackUnsubscribed(
  track: RemoteTrack,
  publication: RemoteTrackPublication,
  participant: RemoteParticipant
): void {
  console.log('[LiveKit] Track unsubscribed:', {
    kind: track.kind,
    participantId: participant.identity,
    trackSid: publication.trackSid,
  });

  // Detach the track from any elements
  track.detach();

  if (track.kind === Track.Kind.Video && remoteVideoTrackSignal.value === track) {
    remoteVideoTrackSignal.value = null;
  } else if (track.kind === Track.Kind.Audio && remoteAudioTrackSignal.value === track) {
    remoteAudioTrackSignal.value = null;
  }

  notifyStateChange();
}

/**
 * Handles local track published events.
 * @param publication - The track publication
 * @param participant - The local participant
 */
function handleLocalTrackPublished(
  publication: TrackPublication,
  participant: LocalParticipant
): void {
  console.log('[LiveKit] Local track published:', {
    kind: publication.kind,
    trackSid: publication.trackSid,
  });
}

/**
 * Handles connection state changes.
 * @param state - The new connection state
 */
function handleConnectionStateChanged(state: ConnectionState): void {
  console.log('[LiveKit] Connection state changed:', state);
  connectionStateSignal.value = state;

  if (state === ConnectionState.Disconnected) {
    // Clean up tracks on disconnect
    cleanupTracks();
  }

  notifyStateChange();
}

/**
 * Handles participant disconnection.
 * @param participant - The disconnected participant
 */
function handleParticipantDisconnected(participant: RemoteParticipant): void {
  console.log('[LiveKit] Participant disconnected:', participant.identity);

  // Clear remote tracks if the disconnected participant was the source
  remoteVideoTrackSignal.value = null;
  remoteAudioTrackSignal.value = null;

  notifyStateChange();
}

/**
 * Handles room disconnection.
 */
function handleDisconnected(): void {
  console.log('[LiveKit] Disconnected from room');
  cleanupTracks();
  notifyStateChange();
}

/**
 * Cleans up all local tracks.
 */
function cleanupTracks(): void {
  const localVideo = localVideoTrackSignal.value;
  const localAudio = localAudioTrackSignal.value;

  if (localVideo) {
    localVideo.stop();
    localVideoTrackSignal.value = null;
  }

  if (localAudio) {
    localAudio.stop();
    localAudioTrackSignal.value = null;
  }

  remoteVideoTrackSignal.value = null;
  remoteAudioTrackSignal.value = null;
}

/**
 * Sets up event listeners on a room.
 * @param room - The room to attach listeners to
 */
function setupRoomListeners(room: Room): void {
  room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
  room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
  room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
  room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
  room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
  room.on(RoomEvent.Disconnected, handleDisconnected);
}

/**
 * Removes event listeners from a room.
 * @param room - The room to remove listeners from
 */
function removeRoomListeners(room: Room): void {
  room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
  room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
  room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
  room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
  room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
  room.off(RoomEvent.Disconnected, handleDisconnected);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Connects to a LiveKit room with the given URL and token.
 * Creates local audio/video tracks and publishes them.
 * @param url - The LiveKit server URL
 * @param token - The access token for joining the room
 * @returns The connected Room instance
 * @throws Error if connection fails
 */
export async function connectToRoom(url: string, token: string): Promise<Room> {
  // Disconnect from any existing room first
  if (roomSignal.value) {
    await disconnectFromRoom();
  }

  errorSignal.value = null;
  connectionStateSignal.value = ConnectionState.Connecting;
  notifyStateChange();

  try {
    // Create room instance with optimal settings for video calls
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });

    // Setup event listeners before connecting
    setupRoomListeners(room);

    // Create local tracks
    const tracks = await createLocalTracks({
      audio: true,
      video: {
        resolution: VideoPresets.h720.resolution,
      },
    });

    // Store local tracks
    for (const track of tracks) {
      if (track.kind === Track.Kind.Video) {
        localVideoTrackSignal.value = track;
      } else if (track.kind === Track.Kind.Audio) {
        localAudioTrackSignal.value = track;
      }
    }

    // Connect to the room
    await room.connect(url, token);

    // Publish local tracks
    for (const track of tracks) {
      await room.localParticipant.publishTrack(track);
    }

    roomSignal.value = room;
    isMicEnabledSignal.value = true;
    isCameraEnabledSignal.value = true;
    connectionStateSignal.value = ConnectionState.Connected;

    console.log('[LiveKit] Connected to room:', room.name);
    notifyStateChange();

    return room;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to connect to room';
    console.error('[LiveKit] Connection error:', errorMessage);
    errorSignal.value = errorMessage;
    connectionStateSignal.value = ConnectionState.Disconnected;
    cleanupTracks();
    notifyStateChange();
    throw err;
  }
}

/**
 * Disconnects from the current LiveKit room.
 * Stops all local tracks and cleans up resources.
 */
export async function disconnectFromRoom(): Promise<void> {
  const room = roomSignal.value;

  if (!room) {
    console.log('[LiveKit] No room to disconnect from');
    return;
  }

  console.log('[LiveKit] Disconnecting from room:', room.name);

  // Remove event listeners
  removeRoomListeners(room);

  // Disconnect from the room
  await room.disconnect();

  // Clean up state
  roomSignal.value = null;
  connectionStateSignal.value = ConnectionState.Disconnected;
  cleanupTracks();

  notifyStateChange();
}

/**
 * Toggles the local microphone on/off.
 * @returns The new microphone enabled state
 */
export async function toggleMicrophone(): Promise<boolean> {
  const room = roomSignal.value;

  if (!room) {
    console.warn('[LiveKit] Cannot toggle microphone: not connected');
    return isMicEnabledSignal.value;
  }

  const newState = !isMicEnabledSignal.value;

  try {
    await room.localParticipant.setMicrophoneEnabled(newState);
    isMicEnabledSignal.value = newState;
    console.log('[LiveKit] Microphone', newState ? 'enabled' : 'disabled');
    notifyStateChange();
  } catch (err) {
    console.error('[LiveKit] Failed to toggle microphone:', err);
  }

  return isMicEnabledSignal.value;
}

/**
 * Toggles the local camera on/off.
 * @returns The new camera enabled state
 */
export async function toggleCamera(): Promise<boolean> {
  const room = roomSignal.value;

  if (!room) {
    console.warn('[LiveKit] Cannot toggle camera: not connected');
    return isCameraEnabledSignal.value;
  }

  const newState = !isCameraEnabledSignal.value;

  try {
    await room.localParticipant.setCameraEnabled(newState);
    isCameraEnabledSignal.value = newState;
    console.log('[LiveKit] Camera', newState ? 'enabled' : 'disabled');
    notifyStateChange();
  } catch (err) {
    console.error('[LiveKit] Failed to toggle camera:', err);
  }

  return isCameraEnabledSignal.value;
}

/**
 * Explicitly enables or disables the microphone.
 * @param enabled - Whether to enable the microphone
 * @returns The new microphone enabled state
 */
export async function setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
  const room = roomSignal.value;

  if (!room) {
    console.warn('[LiveKit] Cannot set microphone state: not connected');
    return isMicEnabledSignal.value;
  }

  try {
    await room.localParticipant.setMicrophoneEnabled(enabled);
    isMicEnabledSignal.value = enabled;
    console.log('[LiveKit] Microphone', enabled ? 'enabled' : 'disabled');
    notifyStateChange();
  } catch (err) {
    console.error('[LiveKit] Failed to set microphone state:', err);
  }

  return isMicEnabledSignal.value;
}

/**
 * Explicitly enables or disables the camera.
 * @param enabled - Whether to enable the camera
 * @returns The new camera enabled state
 */
export async function setCameraEnabled(enabled: boolean): Promise<boolean> {
  const room = roomSignal.value;

  if (!room) {
    console.warn('[LiveKit] Cannot set camera state: not connected');
    return isCameraEnabledSignal.value;
  }

  try {
    await room.localParticipant.setCameraEnabled(enabled);
    isCameraEnabledSignal.value = enabled;
    console.log('[LiveKit] Camera', enabled ? 'enabled' : 'disabled');
    notifyStateChange();
  } catch (err) {
    console.error('[LiveKit] Failed to set camera state:', err);
  }

  return isCameraEnabledSignal.value;
}

/**
 * Attaches the local video track to an HTMLVideoElement.
 * @param element - The video element to attach to
 */
export function attachLocalVideo(element: HTMLVideoElement): void {
  const track = localVideoTrackSignal.value;

  if (!track) {
    console.warn('[LiveKit] No local video track to attach');
    return;
  }

  // Detach from any previous elements first
  track.detach();

  // Attach to the new element
  track.attach(element);

  // Configure for local video display
  element.muted = true; // Mute local video to prevent feedback
  element.playsInline = true;

  console.log('[LiveKit] Local video attached');
}

/**
 * Attaches the remote video track to an HTMLVideoElement.
 * @param element - The video element to attach to
 */
export function attachRemoteVideo(element: HTMLVideoElement): void {
  const track = remoteVideoTrackSignal.value;

  if (!track) {
    console.warn('[LiveKit] No remote video track to attach');
    return;
  }

  // Detach from any previous elements first
  track.detach();

  // Attach to the new element
  track.attach(element);

  // Configure for remote video display
  element.playsInline = true;

  console.log('[LiveKit] Remote video attached');
}

/**
 * Detaches the local video track from its current element.
 */
export function detachLocalVideo(): void {
  const track = localVideoTrackSignal.value;

  if (track) {
    track.detach();
    console.log('[LiveKit] Local video detached');
  }
}

/**
 * Detaches the remote video track from its current element.
 */
export function detachRemoteVideo(): void {
  const track = remoteVideoTrackSignal.value;

  if (track) {
    track.detach();
    console.log('[LiveKit] Remote video detached');
  }
}

/**
 * Gets the current LiveKit state.
 * @returns The current state object
 */
export function getLiveKitState(): LiveKitState {
  return fullState.value;
}

/**
 * Registers a callback to be notified when LiveKit state changes.
 * @param callback - The callback to invoke on state changes
 * @returns An unsubscribe function
 */
export function onStateChange(callback: StateChangeCallback): () => void {
  stateChangeListeners.add(callback);

  // Immediately invoke with current state
  callback(fullState.value);

  // Return unsubscribe function
  return () => {
    stateChangeListeners.delete(callback);
  };
}

/**
 * Gets the current room instance if connected.
 * @returns The Room instance or null
 */
export function getRoom(): Room | null {
  return roomSignal.value;
}

/**
 * Checks if there is an active remote participant with video.
 * @returns True if remote video is available
 */
export function hasRemoteVideo(): boolean {
  return remoteVideoTrackSignal.value !== null;
}

/**
 * Checks if there is an active remote participant with audio.
 * @returns True if remote audio is available
 */
export function hasRemoteAudio(): boolean {
  return remoteAudioTrackSignal.value !== null;
}

// ============================================================================
// Exported Signals (for reactive UI binding)
// ============================================================================

export {
  isMicEnabledSignal as micEnabled,
  isCameraEnabledSignal as cameraEnabled,
  connectionStateSignal as connectionState,
  localVideoTrackSignal as localVideoTrack,
  remoteVideoTrackSignal as remoteVideoTrack,
  errorSignal as liveKitError,
};
