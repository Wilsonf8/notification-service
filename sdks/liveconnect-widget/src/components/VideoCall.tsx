/**
 * LiveConnect Widget - VideoCall Component.
 * In-call video interface with local PIP, remote video, and control bar.
 */

import { h } from 'preact';
import { useRef, useEffect, useState } from 'preact/hooks';
import {
  micEnabled,
  cameraEnabled,
  screenSharing,
  blurEnabled,
  blurSupported,
  toggleMicrophone,
  toggleCamera,
  toggleScreenShare,
  toggleBlur,
  checkBlurSupport,
  attachLocalVideo,
  attachRemoteVideo,
  attachRemoteScreenShare,
  detachLocalVideo,
  detachRemoteVideo,
  detachRemoteScreenShare,
  localVideoTrack,
  remoteVideoTrack,
  remoteScreenShareTrack,
} from '../livekit';

/**
 * Props for the VideoCall component.
 */
interface VideoCallProps {
  /** Unique identifier for the conversation */
  conversationId: string;
  /** LiveKit room name */
  roomName: string;
  /** Base URL for the application (used for pop-out) */
  appUrl: string;
  /** Session token for authentication */
  sessionToken: string;
  /** LiveKit server URL */
  liveKitUrl: string;
  /** Handler for ending the call */
  onEndCall: () => void;
  /** Handler for when call is popped out */
  onPopOut: () => void;
  /** Handler for toggling chat visibility */
  onToggleChat: () => void;
  /** Whether the chat panel is currently visible */
  isChatVisible: boolean;
  /** Optional name of the remote participant */
  participantName?: string;
}

// ============================================================================
// SVG Icons (Tabler Icons)
// ============================================================================

/**
 * Microphone icon (enabled state).
 * @returns SVG element
 */
function MicrophoneIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__control-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M8 21l8 0" />
      <path d="M12 17l0 4" />
    </svg>
  );
}

/**
 * Microphone off icon (muted state).
 * @returns SVG element
 */
function MicrophoneOffIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__control-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M9 5a3 3 0 0 1 6 0v5a3 3 0 0 1 -.13 .874m-2 2a3 3 0 0 1 -3.87 -2.872v-1" />
      <path d="M5 10a7 7 0 0 0 10.846 5.85m2 -2a6.97 6.97 0 0 0 1.152 -3.85" />
      <path d="M8 21l8 0" />
      <path d="M12 17l0 4" />
    </svg>
  );
}

/**
 * Video camera icon (enabled state).
 * @returns SVG element
 */
function VideoIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__control-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z" />
      <rect x="3" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/**
 * Video camera off icon (disabled state).
 * @returns SVG element
 */
function VideoOffIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__control-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M15 11v-1a2 2 0 0 0 -2 -2h-6" />
      <path d="M9 15v1a2 2 0 0 0 2 2h4a2 2 0 0 0 2 -2v-3" />
      <path d="M15 12l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276" />
      <path d="M3 8v8a2 2 0 0 0 2 2h10" />
    </svg>
  );
}

/**
 * Phone hang up icon (end call).
 * @returns SVG element
 */
function PhoneHangUpIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__control-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 10l-.895 3.578a2 2 0 0 0 1.09 2.39l2.805 1.248v-4.216l-1 -1l2 -5l8 0l2 5l-1 1v4.216l2.805 -1.248a2 2 0 0 0 1.09 -2.39l-.895 -3.578a2 2 0 0 0 -1.943 -1.516h-12.114a2 2 0 0 0 -1.943 1.516z" />
    </svg>
  );
}

/**
 * External link icon (pop out).
 * @returns SVG element
 */
function ExternalLinkIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__control-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
      <path d="M11 13l9 -9" />
      <path d="M15 4h5v5" />
    </svg>
  );
}

/**
 * Message/chat icon.
 * @returns SVG element
 */
function MessageIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__control-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M8 9h8" />
      <path d="M8 13h6" />
      <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z" />
    </svg>
  );
}

/**
 * Screen share icon (start sharing).
 * @returns SVG element
 */
function ScreenShareIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__control-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12v3a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1h9" />
      <path d="M7 20l10 0" />
      <path d="M9 16l0 4" />
      <path d="M15 16l0 4" />
      <path d="M17 4h4v4" />
      <path d="M16 9l5 -5" />
    </svg>
  );
}

/**
 * Screen share off icon (stop sharing).
 * @returns SVG element
 */
function ScreenShareOffIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__control-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12v3a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1h9" />
      <path d="M7 20l10 0" />
      <path d="M9 16l0 4" />
      <path d="M15 16l0 4" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

/**
 * Background blur icon (focus centered).
 * @returns SVG element
 */
function BlurIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__control-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M4.93 19.07l1.41 -1.41" />
      <path d="M17.66 6.34l1.41 -1.41" />
    </svg>
  );
}

/**
 * User icon (placeholder for remote video).
 * @returns SVG element
 */
function UserIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-video__remote-placeholder-icon"
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
      <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

/**
 * Formats duration in seconds to MM:SS or HH:MM:SS format.
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

/**
 * VideoCall component for the LiveConnect widget.
 * Displays in-call video interface with local PIP, remote video,
 * and control bar for mic, camera, end call, pop out, and chat toggle.
 *
 * @param props - Component props
 * @returns VideoCall element
 *
 * @example
 * ```tsx
 * <VideoCall
 *   conversationId="conv_123"
 *   roomName="room_456"
 *   appUrl="https://app.example.com"
 *   sessionToken="token_789"
 *   onEndCall={() => endCall()}
 *   onPopOut={() => handlePopOut()}
 *   onToggleChat={() => setShowChat(!showChat)}
 *   isChatVisible={showChat}
 *   participantName="John Doe"
 * />
 * ```
 */
export function VideoCall({
  conversationId,
  roomName,
  appUrl,
  sessionToken,
  liveKitUrl,
  onEndCall,
  onPopOut,
  onToggleChat,
  isChatVisible,
  participantName = 'Representative',
}: VideoCallProps): h.JSX.Element {
  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteScreenShareRef = useRef<HTMLVideoElement>(null);
  const remoteCameraPipRef = useRef<HTMLVideoElement>(null);

  // Call duration tracking
  const [callDuration, setCallDuration] = useState<number>(0);
  const callStartRef = useRef<number>(Date.now());

  // Track if remote video is available
  const [hasRemoteVideo, setHasRemoteVideo] = useState<boolean>(false);
  const [hasRemoteScreenShare, setHasRemoteScreenShare] = useState<boolean>(false);

  // Local state copies of signals (for rendering)
  const [isMicOn, setIsMicOn] = useState<boolean>(micEnabled.value);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(cameraEnabled.value);
  const [isScreenShareOn, setIsScreenShareOn] = useState<boolean>(screenSharing.value);
  const [isBlurOn, setIsBlurOn] = useState<boolean>(blurEnabled.value);
  const [isBlurAvailable, setIsBlurAvailable] = useState<boolean>(blurSupported.value);

  /**
   * Effect to cleanup video elements when component unmounts.
   */
  useEffect(() => {
    return () => {
      detachLocalVideo();
      detachRemoteVideo();
      detachRemoteScreenShare();
    };
  }, []);

  /**
   * Effect to update local video attachment when track becomes available.
   */
  useEffect(() => {
    const unsubscribe = localVideoTrack.subscribe((track) => {
      if (track && localVideoRef.current) {
        attachLocalVideo(localVideoRef.current);
      }
    });

    // Initial check - attach if track already exists
    if (localVideoTrack.value && localVideoRef.current) {
      attachLocalVideo(localVideoRef.current);
    }

    return unsubscribe;
  }, []);

  /**
   * Effect to update remote video attachment when track becomes available.
   */
  useEffect(() => {
    const unsubscribe = remoteVideoTrack.subscribe((track) => {
      setHasRemoteVideo(track !== null);
      if (track && remoteVideoRef.current) {
        attachRemoteVideo(remoteVideoRef.current);
      }
    });

    // Initial check
    setHasRemoteVideo(remoteVideoTrack.value !== null);

    return unsubscribe;
  }, []);

  /**
   * Effect to update remote screen share attachment when track becomes available.
   */
  useEffect(() => {
    const unsubscribe = remoteScreenShareTrack.subscribe((track) => {
      setHasRemoteScreenShare(track !== null);
      if (track && remoteScreenShareRef.current) {
        attachRemoteScreenShare(remoteScreenShareRef.current);
      }
      // When screen share starts, move camera to PIP; when it ends, reattach to main
      if (track && remoteVideoTrack.value && remoteCameraPipRef.current) {
        attachRemoteVideo(remoteCameraPipRef.current);
      } else if (!track && remoteVideoTrack.value && remoteVideoRef.current) {
        attachRemoteVideo(remoteVideoRef.current);
      }
    });

    setHasRemoteScreenShare(remoteScreenShareTrack.value !== null);

    return unsubscribe;
  }, []);

  /**
   * Effect to track call duration.
   */
  useEffect(() => {
    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartRef.current) / 1000);
      setCallDuration(elapsed);
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  /**
   * Effect to check background blur support on mount.
   */
  useEffect(() => {
    checkBlurSupport().then((supported) => setIsBlurAvailable(supported));
  }, []);

  /**
   * Effect to subscribe to mic/camera/screen share/blur state changes.
   */
  useEffect(() => {
    const unsubMic = micEnabled.subscribe((value) => setIsMicOn(value));
    const unsubCamera = cameraEnabled.subscribe((value) => setIsCameraOn(value));
    const unsubScreenShare = screenSharing.subscribe((value) => setIsScreenShareOn(value));
    const unsubBlur = blurEnabled.subscribe((value) => setIsBlurOn(value));
    const unsubBlurSupported = blurSupported.subscribe((value) => setIsBlurAvailable(value));

    return () => {
      unsubMic();
      unsubCamera();
      unsubScreenShare();
      unsubBlur();
      unsubBlurSupported();
    };
  }, []);

  /**
   * Handles microphone toggle.
   */
  const handleToggleMic = async (): Promise<void> => {
    await toggleMicrophone();
  };

  /**
   * Handles camera toggle.
   */
  const handleToggleCamera = async (): Promise<void> => {
    await toggleCamera();
  };

  /**
   * Handles screen share toggle.
   */
  const handleToggleScreenShare = async (): Promise<void> => {
    await toggleScreenShare();
  };

  /**
   * Handles background blur toggle.
   */
  const handleToggleBlur = async (): Promise<void> => {
    await toggleBlur();
  };

  /**
   * Handles end call button click.
   * @param event - Mouse event
   */
  const handleEndCall = (event: MouseEvent): void => {
    event.preventDefault();
    onEndCall();
  };

  /**
   * Handles pop out button click.
   * Opens the call in a separate browser popup window.
   * @param event - Mouse event
   */
  const handlePopOut = (event: MouseEvent): void => {
    event.preventDefault();

    // Build popup URL with session parameters
    const popupUrl = `${appUrl}/call/${roomName}?session=${encodeURIComponent(sessionToken)}&conversation=${encodeURIComponent(conversationId)}&liveKitUrl=${encodeURIComponent(liveKitUrl)}`;

    // Open popup window with specified dimensions
    const popup = window.open(
      popupUrl,
      'liveconnect-call',
      'width=450,height=600,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no'
    );

    // If popup opened successfully, notify parent
    if (popup) {
      onPopOut();
    } else {
      console.warn('[VideoCall] Failed to open popup window - may be blocked by browser');
    }
  };

  /**
   * Handles chat toggle button click.
   * @param event - Mouse event
   */
  const handleToggleChat = (event: MouseEvent): void => {
    event.preventDefault();
    onToggleChat();
  };

  /**
   * Handles keyboard events for control buttons.
   * @param event - Keyboard event
   * @param action - The action to perform
   */
  const handleKeyDown = (event: KeyboardEvent, action: () => void): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  return (
    <div class="lc-video" role="region" aria-label="Video call">
      {/* Remote screen share (fills main area when active) */}
      {hasRemoteScreenShare && (
        <div class="lc-video__screen-share">
          <video
            ref={remoteScreenShareRef}
            class="lc-video__screen-share-video"
            autoPlay
            playsInline
            aria-label="Screen share"
          />
        </div>
      )}

      {/* Remote video (square container, centered) — hidden when screen share active */}
      <div class={`lc-video__remote-wrapper ${hasRemoteScreenShare ? 'lc-video__remote-wrapper--hidden' : ''}`}>
        <video
          ref={remoteVideoRef}
          class="lc-video__remote"
          autoPlay
          playsInline
          aria-label={`${participantName}'s video`}
        />
      </div>

      {/* Remote camera PIP (bottom-left, shown during screen share) */}
      {hasRemoteScreenShare && hasRemoteVideo && (
        <video
          ref={remoteCameraPipRef}
          class="lc-video__remote-pip"
          autoPlay
          playsInline
          aria-label={`${participantName}'s camera`}
        />
      )}

      {/* Remote video placeholder (shown when no remote video) */}
      {!hasRemoteVideo && !hasRemoteScreenShare && (
        <div class="lc-video__remote-placeholder" aria-hidden="true">
          <UserIcon />
          <span>Waiting for {participantName}...</span>
        </div>
      )}

      {/* Info bar (top) */}
      <div class="lc-video__info">
        <div class="lc-video__participant">
          <span class="lc-video__participant-name">{participantName}</span>
        </div>
        <div
          class="lc-video__duration"
          aria-label={`Call duration: ${formatDuration(callDuration)}`}
          aria-live="off"
        >
          {formatDuration(callDuration)}
        </div>
      </div>

      {/* Local video PIP (bottom-right) */}
      <video
        ref={localVideoRef}
        class={`lc-video__local ${!isCameraOn ? 'lc-video__local--hidden' : ''}`}
        autoPlay
        playsInline
        muted
        aria-label="Your video"
      />

      {/* Control bar (bottom) */}
      <div class="lc-video__controls" role="toolbar" aria-label="Call controls">
        {/* Microphone toggle */}
        <button
          type="button"
          class={`lc-video__control ${isMicOn ? '' : 'lc-video__control--muted'}`}
          onClick={() => handleToggleMic()}
          onKeyDown={(e) => handleKeyDown(e, handleToggleMic)}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          aria-pressed={!isMicOn}
          title={isMicOn ? 'Mute' : 'Unmute'}
        >
          {isMicOn ? <MicrophoneIcon /> : <MicrophoneOffIcon />}
        </button>

        {/* Camera toggle */}
        <button
          type="button"
          class={`lc-video__control ${isCameraOn ? '' : 'lc-video__control--muted'}`}
          onClick={() => handleToggleCamera()}
          onKeyDown={(e) => handleKeyDown(e, handleToggleCamera)}
          aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          aria-pressed={!isCameraOn}
          title={isCameraOn ? 'Camera Off' : 'Camera On'}
        >
          {isCameraOn ? <VideoIcon /> : <VideoOffIcon />}
        </button>

        {/* Screen share toggle */}
        <button
          type="button"
          class={`lc-video__control ${isScreenShareOn ? 'lc-video__control--active' : ''}`}
          onClick={() => handleToggleScreenShare()}
          onKeyDown={(e) => handleKeyDown(e, handleToggleScreenShare)}
          aria-label={isScreenShareOn ? 'Stop screen sharing' : 'Share screen'}
          aria-pressed={isScreenShareOn}
          title={isScreenShareOn ? 'Stop Sharing' : 'Share Screen'}
        >
          {isScreenShareOn ? <ScreenShareOffIcon /> : <ScreenShareIcon />}
        </button>

        {/* Background blur toggle (only shown if supported) */}
        {isBlurAvailable && (
          <button
            type="button"
            class={`lc-video__control ${isBlurOn ? 'lc-video__control--active' : ''}`}
            onClick={() => handleToggleBlur()}
            onKeyDown={(e) => handleKeyDown(e, handleToggleBlur)}
            aria-label={isBlurOn ? 'Disable background blur' : 'Enable background blur'}
            aria-pressed={isBlurOn}
            title={isBlurOn ? 'Blur Off' : 'Blur On'}
          >
            <BlurIcon />
          </button>
        )}

        {/* End call */}
        <button
          type="button"
          class="lc-video__control lc-video__control--danger"
          onClick={handleEndCall}
          onKeyDown={(e) => handleKeyDown(e, () => onEndCall())}
          aria-label="End call"
          title="End Call"
        >
          <PhoneHangUpIcon />
        </button>

        {/* Pop out */}
        <button
          type="button"
          class="lc-video__control"
          onClick={handlePopOut}
          onKeyDown={(e) => handleKeyDown(e, () => {
            const popupUrl = `${appUrl}/call/${roomName}?session=${encodeURIComponent(sessionToken)}&conversation=${encodeURIComponent(conversationId)}&liveKitUrl=${encodeURIComponent(liveKitUrl)}`;
            const popup = window.open(popupUrl, 'liveconnect-call', 'width=450,height=600,resizable=yes');
            if (popup) onPopOut();
          })}
          aria-label="Pop out to separate window"
          title="Pop Out"
        >
          <ExternalLinkIcon />
        </button>

        {/* Chat toggle */}
        <button
          type="button"
          class={`lc-video__control ${isChatVisible ? 'lc-video__control--active' : ''}`}
          onClick={handleToggleChat}
          onKeyDown={(e) => handleKeyDown(e, onToggleChat)}
          aria-label={isChatVisible ? 'Hide chat' : 'Show chat'}
          aria-pressed={isChatVisible}
          title={isChatVisible ? 'Hide Chat' : 'Show Chat'}
        >
          <MessageIcon />
        </button>
      </div>

      {/* Screen reader announcement for call status */}
      <span class="lc-sr-only" role="status" aria-live="polite">
        {!hasRemoteVideo && !hasRemoteScreenShare && `Waiting for ${participantName} to join the call`}
      </span>
    </div>
  );
}

export default VideoCall;