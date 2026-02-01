'use client';

/**
 * Popup Call Page
 * Full-screen video call interface for LiveConnect popup windows.
 *
 * URL format: /call/{roomName}?session={sessionToken}&conversation={conversationId}
 *
 * This page:
 * 1. Parses roomName from path params and session/conversation from query params
 * 2. Uses the session token to fetch a fresh LiveKit token from the API
 * 3. Connects to the LiveKit room and displays full-screen video
 * 4. Provides controls for mic, camera, and ending the call
 * 5. Closes the popup window when the call ends
 */

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Room,
  RoomEvent,
  Track,
  LocalTrack,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  createLocalTracks,
  VideoPresets,
} from 'livekit-client';
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconVideo,
  IconVideoOff,
  IconPhoneOff,
  IconUser,
  IconLoader2,
  IconAlertTriangle,
  IconMessage,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { CallChat } from '@/components/liveconnect/call-chat';
import { getToken } from '@/lib/auth';

// ============================================================================
// Types
// ============================================================================

/**
 * LiveKit connection configuration from API.
 */
interface LiveKitConfig {
  token: string;
  roomName: string;
  url: string;
}

/**
 * Call state for the video call.
 */
interface CallState {
  status: 'loading' | 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  hasRemoteVideo: boolean;
  callDuration: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Backend API base URL from environment variable */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches a LiveKit token from the backend API.
 * @param sessionToken - The visitor session token
 * @param conversationId - The conversation ID
 * @returns LiveKit connection configuration
 * @throws Error if the API request fails
 */
async function fetchLiveKitToken(
  sessionToken: string,
  conversationId: string
): Promise<LiveKitConfig> {
  const response = await fetch(`${API_URL}/v1/liveconnect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': sessionToken,
    },
    body: JSON.stringify({ conversationId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get LiveKit token: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats call duration in seconds to MM:SS or HH:MM:SS format.
 * @param seconds - Total seconds elapsed
 * @returns Formatted duration string
 */
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// CallPageContent Component (uses hooks that need Suspense)
// ============================================================================

/**
 * Main content component for the call page.
 * Separated to allow useSearchParams to be wrapped in Suspense.
 */
function CallPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomName = params.roomName as string;
  const sessionToken = searchParams.get('session');
  const repToken = searchParams.get('token');
  const conversationId = searchParams.get('conversation');
  const projectId = searchParams.get('project');
  const liveKitUrl = searchParams.get('liveKitUrl');

  // Determine auth type - rep uses JWT token from localStorage, visitor uses session token
  const isRepCall = !!repToken;
  const authToken = isRepCall ? (getToken() || '') : (sessionToken || '');
  const authType: 'session' | 'jwt' = isRepCall ? 'jwt' : 'session';

  // Refs
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoTrackRef = useRef<LocalTrack | null>(null);
  const localAudioTrackRef = useRef<LocalTrack | null>(null);
  const remoteVideoTrackRef = useRef<RemoteTrack | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [callState, setCallState] = useState<CallState>({
    status: 'loading',
    isMicEnabled: true,
    isCameraEnabled: true,
    hasRemoteVideo: false,
    callDuration: 0,
  });
  const [isChatOpen, setIsChatOpen] = useState(false);

  /**
   * Attaches a track to a video element.
   */
  const attachTrack = useCallback((track: LocalTrack | RemoteTrack, element: HTMLVideoElement) => {
    track.attach(element);
    element.playsInline = true;
    if (track.kind === Track.Kind.Video) {
      element.muted = track instanceof LocalTrack; // Mute local to prevent feedback
    }
  }, []);

  /**
   * Handles track subscription events from remote participants.
   */
  const handleTrackSubscribed = useCallback(
    (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log('[CallPage] Track subscribed:', track.kind, participant.identity);

      if (track.kind === Track.Kind.Video) {
        remoteVideoTrackRef.current = track;
        if (remoteVideoRef.current) {
          attachTrack(track, remoteVideoRef.current);
        }
        setCallState((prev) => ({ ...prev, hasRemoteVideo: true }));
      } else if (track.kind === Track.Kind.Audio) {
        // Auto-attach audio for playback
        track.attach();
      }
    },
    [attachTrack]
  );

  /**
   * Handles track unsubscription events from remote participants.
   */
  const handleTrackUnsubscribed = useCallback(
    (track: RemoteTrack) => {
      console.log('[CallPage] Track unsubscribed:', track.kind);
      track.detach();

      if (track.kind === Track.Kind.Video && remoteVideoTrackRef.current === track) {
        remoteVideoTrackRef.current = null;
        setCallState((prev) => ({ ...prev, hasRemoteVideo: false }));
      }
    },
    []
  );

  /**
   * Handles room disconnection.
   */
  const handleDisconnected = useCallback(() => {
    console.log('[CallPage] Disconnected from room');
    setCallState((prev) => ({ ...prev, status: 'disconnected' }));

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Close popup window after brief delay to show disconnected state
    setTimeout(() => {
      window.close();
    }, 1500);
  }, []);

  /**
   * Handles participant disconnection.
   */
  const handleParticipantDisconnected = useCallback((participant: RemoteParticipant) => {
    console.log('[CallPage] Participant disconnected:', participant.identity);
    remoteVideoTrackRef.current = null;
    setCallState((prev) => ({ ...prev, hasRemoteVideo: false }));
  }, []);

  /**
   * Cleans up all resources.
   */
  const cleanup = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Stop and detach local tracks
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current = null;
    }
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
    }

    // Detach remote track
    if (remoteVideoTrackRef.current) {
      remoteVideoTrackRef.current.detach();
      remoteVideoTrackRef.current = null;
    }

    // Disconnect from room
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
  }, []);

  /**
   * Connects to the LiveKit room.
   */
  const connectToRoom = useCallback(async () => {
    if (!conversationId || (!sessionToken && !repToken)) {
      setCallState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Missing authentication or conversation ID',
      }));
      return;
    }

    try {
      setCallState((prev) => ({ ...prev, status: 'connecting' }));

      // Fetch LiveKit token from API - different endpoint for rep vs visitor
      let config: LiveKitConfig;
      if (isRepCall && repToken) {
        // Rep auth - token was provided directly in URL (from acceptRequest response)
        // The repToken IS the LiveKit token, liveKitUrl comes from the same response
        config = {
          token: repToken,
          roomName: roomName,
          url: liveKitUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://livekit.notifykit.dev',
        };
      } else if (sessionToken) {
        // Visitor auth - fetch token from API
        config = await fetchLiveKitToken(sessionToken, conversationId);
      } else {
        throw new Error('No valid authentication');
      }
      console.log('[CallPage] Got LiveKit config:', config.roomName);

      // Create room instance
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      // Set up event listeners
      room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.on(RoomEvent.Disconnected, handleDisconnected);
      room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

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
          localVideoTrackRef.current = track;
          if (localVideoRef.current) {
            attachTrack(track, localVideoRef.current);
          }
        } else if (track.kind === Track.Kind.Audio) {
          localAudioTrackRef.current = track;
        }
      }

      // Connect to room
      await room.connect(config.url, config.token);

      // Publish local tracks
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
      }

      roomRef.current = room;

      // Start duration timer
      callStartTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallState((prev) => ({ ...prev, callDuration: elapsed }));
      }, 1000);

      // Check for existing remote participants
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.track && publication.isSubscribed) {
            handleTrackSubscribed(
              publication.track as RemoteTrack,
              publication as RemoteTrackPublication,
              participant
            );
          }
        });
      });

      setCallState((prev) => ({ ...prev, status: 'connected' }));
      console.log('[CallPage] Connected to room:', room.name);
    } catch (error) {
      console.error('[CallPage] Connection error:', error);
      setCallState((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to connect',
      }));
    }
  }, [
    sessionToken,
    repToken,
    conversationId,
    roomName,
    liveKitUrl,
    isRepCall,
    attachTrack,
    handleTrackSubscribed,
    handleTrackUnsubscribed,
    handleDisconnected,
    handleParticipantDisconnected,
  ]);

  /**
   * Toggles the microphone on/off.
   */
  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const newState = !callState.isMicEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(newState);
      setCallState((prev) => ({ ...prev, isMicEnabled: newState }));
    } catch (error) {
      console.error('[CallPage] Failed to toggle microphone:', error);
    }
  }, [callState.isMicEnabled]);

  /**
   * Toggles the camera on/off.
   */
  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const newState = !callState.isCameraEnabled;
    try {
      await room.localParticipant.setCameraEnabled(newState);
      setCallState((prev) => ({ ...prev, isCameraEnabled: newState }));
    } catch (error) {
      console.error('[CallPage] Failed to toggle camera:', error);
    }
  }, [callState.isCameraEnabled]);

  /**
   * Ends the call and closes the window.
   */
  const endCall = useCallback(() => {
    cleanup();
    setCallState((prev) => ({ ...prev, status: 'disconnected' }));

    // Close popup window
    setTimeout(() => {
      window.close();
    }, 500);
  }, [cleanup]);

  // Connect on mount
  useEffect(() => {
    connectToRoom();

    return () => {
      cleanup();
    };
  }, [connectToRoom, cleanup]);

  // Render loading state
  if (callState.status === 'loading' || callState.status === 'connecting') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <IconLoader2 className="size-12 animate-spin text-primary" />
        <p className="mt-4 font-mono text-sm text-muted-foreground">
          {callState.status === 'loading' ? 'Initializing...' : 'Connecting to call...'}
        </p>
      </div>
    );
  }

  // Render error state
  if (callState.status === 'error') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-8">
        <IconAlertTriangle className="size-12 text-destructive" />
        <p className="mt-4 font-mono text-sm text-destructive">Connection Failed</p>
        <p className="mt-2 max-w-md text-center font-mono text-xs text-muted-foreground">
          {callState.error}
        </p>
        <button
          onClick={() => window.close()}
          className="mt-6 bg-muted px-4 py-2 font-mono text-sm text-foreground transition-colors hover:bg-muted/80"
        >
          Close Window
        </button>
      </div>
    );
  }

  // Render disconnected state
  if (callState.status === 'disconnected') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <p className="font-mono text-sm text-muted-foreground">Call ended</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          This window will close automatically...
        </p>
      </div>
    );
  }

  // Render connected state
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Main video area */}
      <div className={cn(
        'relative flex-1 overflow-hidden',
        isChatOpen && 'hidden sm:block'
      )}>
        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 size-full bg-muted object-cover"
          aria-label="Remote participant video"
        />

        {/* Remote video placeholder */}
        {!callState.hasRemoteVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
            <IconUser className="size-16 text-muted-foreground opacity-50" />
            <p className="mt-4 font-mono text-sm text-muted-foreground">
              Waiting for participant...
            </p>
          </div>
        )}

        {/* Info bar (top) */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 py-3">
          <div className="font-mono text-sm font-medium text-white">
            {roomName}
          </div>
          <div
            className="font-mono text-sm tabular-nums text-white/80"
            aria-label={`Call duration: ${formatDuration(callState.callDuration)}`}
          >
            {formatDuration(callState.callDuration)}
          </div>
        </div>

        {/* Local video PIP (bottom right) */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'absolute bottom-24 z-10 h-[120px] w-[160px] border-2 border-border bg-muted object-cover transition-opacity',
            isChatOpen ? 'right-4' : 'right-4',
            !callState.isCameraEnabled && 'opacity-0'
          )}
          aria-label="Your video"
        />

        {/* Controls bar (bottom) */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 py-6">
          {/* Microphone toggle */}
          <button
            type="button"
            onClick={toggleMicrophone}
            className={cn(
              'flex size-12 items-center justify-center border transition-colors',
              callState.isMicEnabled
                ? 'border-border bg-card text-foreground hover:bg-muted'
                : 'border-destructive bg-destructive/20 text-destructive'
            )}
            aria-label={callState.isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
            aria-pressed={!callState.isMicEnabled}
            title={callState.isMicEnabled ? 'Mute' : 'Unmute'}
          >
            {callState.isMicEnabled ? (
              <IconMicrophone className="size-6" />
            ) : (
              <IconMicrophoneOff className="size-6" />
            )}
          </button>

          {/* Camera toggle */}
          <button
            type="button"
            onClick={toggleCamera}
            className={cn(
              'flex size-12 items-center justify-center border transition-colors',
              callState.isCameraEnabled
                ? 'border-border bg-card text-foreground hover:bg-muted'
                : 'border-destructive bg-destructive/20 text-destructive'
            )}
            aria-label={callState.isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            aria-pressed={!callState.isCameraEnabled}
            title={callState.isCameraEnabled ? 'Camera Off' : 'Camera On'}
          >
            {callState.isCameraEnabled ? (
              <IconVideo className="size-6" />
            ) : (
              <IconVideoOff className="size-6" />
            )}
          </button>

          {/* Chat toggle */}
          <button
            type="button"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(
              'flex size-12 items-center justify-center border transition-colors',
              isChatOpen
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
            aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
            aria-pressed={isChatOpen}
            title={isChatOpen ? 'Close Chat' : 'Open Chat'}
          >
            <IconMessage className="size-6" />
          </button>

          {/* End call */}
          <button
            type="button"
            onClick={endCall}
            className="flex size-12 items-center justify-center border border-destructive bg-destructive text-white transition-colors hover:bg-destructive/80"
            aria-label="End call"
            title="End Call"
          >
            <IconPhoneOff className="size-6" />
          </button>
        </div>
      </div>

      {/* Chat sidebar */}
      {isChatOpen && conversationId && (
        <div className={cn(
          'h-full w-full sm:w-80',
          isChatOpen ? 'block' : 'hidden'
        )}>
          <CallChat
            conversationId={conversationId}
            projectId={projectId || undefined}
            authToken={authToken}
            authType={authType}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CallPage Component (Main Export)
// ============================================================================

/**
 * Popup Call Page
 * Wraps CallPageContent in Suspense boundary for useSearchParams.
 */
export default function CallPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
          <IconLoader2 className="size-12 animate-spin text-primary" />
          <p className="mt-4 font-mono text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <CallPageContent />
    </Suspense>
  );
}
