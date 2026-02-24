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
  /** Whether local screen sharing is active */
  isScreenSharing: boolean;
  /** Reference to the local video track */
  localVideoTrack: LocalTrack | null;
  /** Reference to the local audio track */
  localAudioTrack: LocalTrack | null;
  /** Reference to the primary remote video track */
  remoteVideoTrack: RemoteTrack | null;
  /** Reference to the primary remote audio track */
  remoteAudioTrack: RemoteTrack | null;
  /** Reference to the remote screen share track */
  remoteScreenShareTrack: RemoteTrack | null;
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

/** Whether local screen sharing is active */
const isScreenSharingSignal = signal<boolean>(false);

/** Whether the device is using the front-facing camera */
const isUsingFrontCameraSignal = signal<boolean>(true);

/** Whether the device has multiple cameras (front + back) */
const canFlipCameraSignal = signal<boolean>(false);

/** Whether background blur is enabled */
const isBlurEnabledSignal = signal<boolean>(false);

/** Whether background blur is supported by the browser */
const isBlurSupportedSignal = signal<boolean>(false);

/** Remote screen share track */
const remoteScreenShareTrackSignal = signal<RemoteTrack | null>(null);

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
  isScreenSharing: isScreenSharingSignal.value,
  localVideoTrack: localVideoTrackSignal.value,
  localAudioTrack: localAudioTrackSignal.value,
  remoteVideoTrack: remoteVideoTrackSignal.value,
  remoteAudioTrack: remoteAudioTrackSignal.value,
  remoteScreenShareTrack: remoteScreenShareTrackSignal.value,
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
    source: track.source,
    participantId: participant.identity,
    trackSid: publication.trackSid,
  });

  if (track.source === Track.Source.ScreenShare) {
    remoteScreenShareTrackSignal.value = track;
  } else if (track.kind === Track.Kind.Video) {
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
    source: track.source,
    participantId: participant.identity,
    trackSid: publication.trackSid,
  });

  // Detach the track from any elements
  track.detach();

  if (track.source === Track.Source.ScreenShare && remoteScreenShareTrackSignal.value === track) {
    remoteScreenShareTrackSignal.value = null;
  } else if (track.kind === Track.Kind.Video && remoteVideoTrackSignal.value === track) {
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
    source: publication.source,
    trackSid: publication.trackSid,
  });

  if (publication.kind === Track.Kind.Video &&
      publication.source === Track.Source.Camera &&
      publication.track) {
    localVideoTrackSignal.value = publication.track as LocalTrack;
    if (isBlurEnabledSignal.value) {
      reapplyBlur(publication.track as LocalTrack);
    }
    notifyStateChange();
  }
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
  remoteScreenShareTrackSignal.value = null;
  isScreenSharingSignal.value = false;
  isUsingFrontCameraSignal.value = true;
  isBlurEnabledSignal.value = false;
}

/**
 * Sets up event listeners on a room.
 * @param room - The room to attach listeners to
 */
/**
 * Handles local track unpublished events (e.g., browser "Stop sharing" button).
 * @param publication - The unpublished track publication
 */
function handleLocalTrackUnpublished(publication: TrackPublication): void {
  if (publication.source === Track.Source.ScreenShare) {
    console.log('[LiveKit] Local screen share ended');
    isScreenSharingSignal.value = false;
    notifyStateChange();
  } else if (publication.kind === Track.Kind.Video &&
             publication.source === Track.Source.Camera) {
    console.log('[LiveKit] Local camera track unpublished');
    localVideoTrackSignal.value = null;
    notifyStateChange();
  }
}

function setupRoomListeners(room: Room): void {
  room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
  room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
  room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
  room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
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
  room.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
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
      audio: {
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      },
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
    isUsingFrontCameraSignal.value = true;
    connectionStateSignal.value = ConnectionState.Connected;

    // Detect multiple cameras for flip camera support
    const devices = await Room.getLocalDevices('videoinput');
    canFlipCameraSignal.value = devices.length > 1;

    // Register text stream handler for chat if a listener is registered
    if (chatMessageListener) {
      room.registerTextStreamHandler(LC_CHAT_TOPIC, async (reader) => {
        try {
          const text = await reader.readAll();
          const message: DataChannelChatMessage = JSON.parse(text);
          if (chatMessageListener) {
            chatMessageListener(message);
          }
        } catch (err) {
          console.error('[LiveKit] Failed to parse chat message:', err);
        }
      });
    }

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
 * Toggles screen sharing on/off.
 * @returns The new screen sharing state
 */
export async function toggleScreenShare(): Promise<boolean> {
  const room = roomSignal.value;

  if (!room) {
    console.warn('[LiveKit] Cannot toggle screen share: not connected');
    return isScreenSharingSignal.value;
  }

  const newState = !isScreenSharingSignal.value;

  try {
    await room.localParticipant.setScreenShareEnabled(newState);
    isScreenSharingSignal.value = newState;
    console.log('[LiveKit] Screen share', newState ? 'started' : 'stopped');
    notifyStateChange();
  } catch (err) {
    // User cancelled the screen share picker — not a real error
    console.log('[LiveKit] Screen share toggle cancelled or failed:', err);
  }

  return isScreenSharingSignal.value;
}

/**
 * Flips between the front and back cameras.
 * Uses facingMode constraint to switch between 'user' (front) and 'environment' (back).
 * @returns The new front camera state
 */
export async function flipCamera(): Promise<boolean> {
  const videoTrack = localVideoTrackSignal.value;

  if (!videoTrack) {
    console.warn('[LiveKit] Cannot flip camera: no local video track');
    return isUsingFrontCameraSignal.value;
  }

  const newFacingMode = isUsingFrontCameraSignal.value ? 'environment' : 'user';

  try {
    await videoTrack.restartTrack({ facingMode: newFacingMode });
    isUsingFrontCameraSignal.value = !isUsingFrontCameraSignal.value;
    console.log('[LiveKit] Camera flipped to', newFacingMode);
    notifyStateChange();
  } catch (err) {
    console.error('[LiveKit] Failed to flip camera:', err);
  }

  return isUsingFrontCameraSignal.value;
}

/**
 * Attaches the remote screen share track to an HTMLVideoElement.
 * @param element - The video element to attach to
 */
export function attachRemoteScreenShare(element: HTMLVideoElement): void {
  const track = remoteScreenShareTrackSignal.value;

  if (!track) {
    console.warn('[LiveKit] No remote screen share track to attach');
    return;
  }

  track.detach();
  track.attach(element);
  element.playsInline = true;

  console.log('[LiveKit] Remote screen share attached');
}

/**
 * Detaches the remote screen share track from its current element.
 */
export function detachRemoteScreenShare(): void {
  const track = remoteScreenShareTrackSignal.value;

  if (track) {
    track.detach();
    console.log('[LiveKit] Remote screen share detached');
  }
}

/**
 * Checks if background blur is supported by the browser.
 * Lazy-loads the track-processors module to check support.
 */
export async function checkBlurSupport(): Promise<boolean> {
  try {
    const { supportsBackgroundProcessors } = await import('@livekit/track-processors');
    const supported = supportsBackgroundProcessors();
    isBlurSupportedSignal.value = supported;
    return supported;
  } catch {
    isBlurSupportedSignal.value = false;
    return false;
  }
}

/**
 * Re-applies background blur to a new video track (e.g., after camera toggle).
 * @param track - The new local video track to apply blur to
 */
async function reapplyBlur(track: LocalTrack): Promise<void> {
  try {
    const { BackgroundBlur } = await import('@livekit/track-processors');
    const blurProcessor = BackgroundBlur(10);
    await track.setProcessor(blurProcessor);
    console.log('[LiveKit] Background blur re-applied to new track');
  } catch (err) {
    console.error('[LiveKit] Failed to re-apply background blur:', err);
    isBlurEnabledSignal.value = false;
    notifyStateChange();
  }
}

/**
 * Toggles background blur on the local video track.
 * Lazy-loads @livekit/track-processors to minimize bundle size.
 * @returns The new blur enabled state
 */
export async function toggleBlur(): Promise<boolean> {
  const videoTrack = localVideoTrackSignal.value;

  if (!videoTrack) {
    console.warn('[LiveKit] Cannot toggle blur: no local video track');
    return isBlurEnabledSignal.value;
  }

  try {
    if (isBlurEnabledSignal.value) {
      await videoTrack.stopProcessor();
      isBlurEnabledSignal.value = false;
      console.log('[LiveKit] Background blur disabled');
    } else {
      const { BackgroundBlur } = await import('@livekit/track-processors');
      const blurProcessor = BackgroundBlur(10);
      await videoTrack.setProcessor(blurProcessor);
      isBlurEnabledSignal.value = true;
      console.log('[LiveKit] Background blur enabled');
    }
  } catch (err) {
    console.error('[LiveKit] Failed to toggle background blur:', err);
    isBlurEnabledSignal.value = false;
  }

  notifyStateChange();
  return isBlurEnabledSignal.value;
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

// ============================================================================
// Data Channel Chat API
// ============================================================================

/** Topic identifier for LiveConnect chat messages */
const LC_CHAT_TOPIC = 'lc-chat';

/**
 * Chat message payload sent/received via data channel.
 */
export interface DataChannelChatMessage {
  id: string;
  content: string;
  senderType: 'USER' | 'REP';
  senderName: string;
  sentAt: string;
}

/** Callback for incoming data channel chat messages */
type ChatMessageCallback = (message: DataChannelChatMessage) => void;

/** Registered chat message listener */
let chatMessageListener: ChatMessageCallback | null = null;

/**
 * Registers a handler for incoming data channel chat messages.
 * Must be called after connecting to a room.
 * @param callback - Function called when a chat message arrives via data channel
 */
export function onChatMessage(callback: ChatMessageCallback): void {
  chatMessageListener = callback;

  const room = roomSignal.value;
  if (room) {
    room.registerTextStreamHandler(LC_CHAT_TOPIC, async (reader, participantInfo) => {
      try {
        const text = await reader.readAll();
        const message: DataChannelChatMessage = JSON.parse(text);
        if (chatMessageListener) {
          chatMessageListener(message);
        }
      } catch (err) {
        console.error('[LiveKit] Failed to parse chat message:', err);
      }
    });
  }
}

/**
 * Unregisters the data channel chat message handler.
 */
export function offChatMessage(): void {
  chatMessageListener = null;
  const room = roomSignal.value;
  if (room) {
    try {
      room.unregisterTextStreamHandler(LC_CHAT_TOPIC);
    } catch {
      // Ignore if not registered
    }
  }
}

/**
 * Sends a chat message via the LiveKit data channel.
 * @param message - The chat message payload to send
 */
export async function sendChatMessage(message: DataChannelChatMessage): Promise<void> {
  const room = roomSignal.value;
  if (!room) {
    console.warn('[LiveKit] Cannot send chat message: not connected');
    return;
  }

  await room.localParticipant.sendText(JSON.stringify(message), {
    topic: LC_CHAT_TOPIC,
  });
}

export {
  isMicEnabledSignal as micEnabled,
  isCameraEnabledSignal as cameraEnabled,
  isScreenSharingSignal as screenSharing,
  isBlurEnabledSignal as blurEnabled,
  isBlurSupportedSignal as blurSupported,
  isUsingFrontCameraSignal as usingFrontCamera,
  canFlipCameraSignal as canFlipCamera,
  connectionStateSignal as connectionState,
  localVideoTrackSignal as localVideoTrack,
  remoteVideoTrackSignal as remoteVideoTrack,
  remoteScreenShareTrackSignal as remoteScreenShareTrack,
  errorSignal as liveKitError,
};
