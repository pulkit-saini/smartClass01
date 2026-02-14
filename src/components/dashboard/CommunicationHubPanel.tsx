import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Card } from "../common/Card";
import type { BroadcastMessage, School } from "../../types/domain";
import { formatDateTime, schoolHoursIsoNow } from "../../utils/analytics";
import { StatusPill } from "../common/StatusPill";

interface CommunicationHubPanelProps {
  school: School;
  readOnly?: boolean;
}

type MonitorStage = "idle" | "devices" | "connecting" | "streaming";
type EmergencyPlatformId = "GOOGLE_MEET" | "ZOOM";

type SimulatedDevice = {
  id: string;
  name: string;
  status: "ONLINE";
};

type EmergencyPlatform = {
  id: EmergencyPlatformId;
  label: string;
  connectLabel: string;
  url: string;
  available: boolean;
};

type BroadcastType = BroadcastMessage["type"];

type BroadcastAttachmentKind = "PDF" | "AUDIO" | "IMAGE" | "VIDEO";

type BroadcastAttachment = {
  kind: BroadcastAttachmentKind;
  file: File;
  previewUrl: string | null;
  source: "UPLOAD" | "RECORDING";
};

type BroadcastEntry = BroadcastMessage & {
  body?: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileUrl?: string;
  fileMimeType?: string;
  fileSource?: "UPLOAD" | "RECORDING";
};

type AudioInputMode = "UPLOAD" | "RECORD";

const STREAM_SOURCE_PRIMARY = "/videoplayback";
const STREAM_SOURCE_FALLBACK = "/videoplayback.webm";

const INPUT_ACCEPT_MAP: Record<BroadcastAttachmentKind, string> = {
  PDF: ".pdf,application/pdf",
  IMAGE: ".jpg,.jpeg,.png,image/jpeg,image/png",
  VIDEO: ".mp4,video/mp4",
  AUDIO: ".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
};

const EXTENSION_RULES: Record<BroadcastAttachmentKind, string[]> = {
  PDF: [".pdf"],
  IMAGE: [".jpg", ".jpeg", ".png"],
  VIDEO: [".mp4"],
  AUDIO: [".mp3", ".wav", ".webm", ".ogg"]
};

const MIME_RULES: Record<BroadcastAttachmentKind, string[]> = {
  PDF: ["application/pdf"],
  IMAGE: ["image/jpeg", "image/png"],
  VIDEO: ["video/mp4"],
  AUDIO: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"]
};

const ATTACHMENT_HELPER_TEXT: Record<BroadcastAttachmentKind, string> = {
  PDF: "Supported format: .pdf",
  IMAGE: "Supported formats: .jpg, .jpeg, .png",
  VIDEO: "Supported format: .mp4",
  AUDIO: "Supported formats: .mp3, .wav"
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AUDIO_UPLOAD_EXTENSIONS = [".mp3", ".wav"];
const AUDIO_UPLOAD_MIME_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"];

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const PlatformIcon = ({ id }: { id: EmergencyPlatformId }) => {
  if (id === "GOOGLE_MEET") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="13" height="12" rx="2.3" stroke="currentColor" strokeWidth="1.8" />
        <path d="m16 10 5-3v10l-5-3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 10h6M9 14h6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
};

export const CommunicationHubPanel = ({ school, readOnly = false }: CommunicationHubPanelProps) => {
  const [title, setTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [type, setType] = useState<BroadcastType>("TEXT");
  const [history, setHistory] = useState<BroadcastEntry[]>(school.communication.broadcastHistory);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [attachedMedia, setAttachedMedia] = useState<BroadcastAttachment | null>(null);
  const [audioInputMode, setAudioInputMode] = useState<AudioInputMode>("UPLOAD");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [broadcastToast, setBroadcastToast] = useState("");
  const [broadcastError, setBroadcastError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecordedAudioConfirmed, setIsRecordedAudioConfirmed] = useState(false);

  const [monitorStage, setMonitorStage] = useState<MonitorStage>("idle");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [streamStartedAt, setStreamStartedAt] = useState<number | null>(null);
  const [streamElapsedSeconds, setStreamElapsedSeconds] = useState(0);
  const [streamFailed, setStreamFailed] = useState(false);

  const [isEmergencyPanelOpen, setIsEmergencyPanelOpen] = useState(false);
  const [selectedEmergencyPlatformId, setSelectedEmergencyPlatformId] = useState<EmergencyPlatformId | null>(
    null
  );
  const [emergencyCountdown, setEmergencyCountdown] = useState(0);
  const [isBroadcastActive, setIsBroadcastActive] = useState(false);

  const connectTimeoutRef = useRef<number | null>(null);
  const streamIntervalRef = useRef<number | null>(null);
  const streamContainerRef = useRef<HTMLDivElement | null>(null);
  const emergencyRedirectTimeoutRef = useRef<number | null>(null);
  const emergencyCountdownIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const createdObjectUrlsRef = useRef<string[]>([]);
  const broadcastToastTimeoutRef = useRef<number | null>(null);

  const emergencyPlatforms = useMemo<EmergencyPlatform[]>(() => {
    const meetUrl =
      (import.meta.env.VITE_EMERGENCY_MEET_URL as string | undefined)?.trim() ||
      "https://meet.google.com/xxx-xxxx-xxx";
    const zoomUrl =
      (import.meta.env.VITE_EMERGENCY_ZOOM_URL as string | undefined)?.trim() ||
      "https://zoom.us/j/1234567890";

    return [
      {
        id: "GOOGLE_MEET",
        label: "Google Meet",
        connectLabel: "Connect via Google Meet",
        url: meetUrl,
        available: Boolean(meetUrl)
      },
      {
        id: "ZOOM",
        label: "Zoom",
        connectLabel: "Connect via Zoom",
        url: zoomUrl,
        available: Boolean(zoomUrl)
      }
    ];
  }, []);

  const selectedEmergencyPlatform = useMemo(
    () =>
      emergencyPlatforms.find((platform) => platform.id === selectedEmergencyPlatformId) ?? null,
    [emergencyPlatforms, selectedEmergencyPlatformId]
  );

  const devices = useMemo<SimulatedDevice[]>(
    () => [
      { id: `${school.id}-ict-c1`, name: "ICT - Classroom 1", status: "ONLINE" },
      { id: `${school.id}-ict-c2`, name: "ICT - Classroom 2", status: "ONLINE" },
      { id: `${school.id}-aio-lab1`, name: "AIO - Lab 1", status: "ONLINE" },
      { id: `${school.id}-aio-office`, name: "AIO - Office", status: "ONLINE" }
    ],
    [school.id]
  );

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId]
  );

  const selectedBroadcast = useMemo(
    () => history.find((item) => item.id === selectedBroadcastId) ?? null,
    [history, selectedBroadcastId]
  );

  const currentAttachmentKind = useMemo<BroadcastAttachmentKind | null>(() => {
    if (type === "PDF" || type === "AUDIO" || type === "IMAGE" || type === "VIDEO") {
      return type;
    }
    return null;
  }, [type]);

  const registerObjectUrl = (url: string) => {
    if (!url.startsWith("blob:")) {
      return;
    }
    createdObjectUrlsRef.current.push(url);
  };

  const revokeObjectUrl = (url: string | null | undefined) => {
    if (!url || !url.startsWith("blob:")) {
      return;
    }
    URL.revokeObjectURL(url);
    createdObjectUrlsRef.current = createdObjectUrlsRef.current.filter((item) => item !== url);
  };

  const stopRecordingStream = () => {
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
  };

  const resetRecordingTimer = () => {
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setRecordingSeconds(0);
  };

  const clearAttachedMedia = (options?: { revokePreview?: boolean }) => {
    const shouldRevokePreview = options?.revokePreview ?? true;
    if (shouldRevokePreview && attachedMedia?.previewUrl) {
      revokeObjectUrl(attachedMedia.previewUrl);
    }
    setAttachedMedia(null);
    setIsRecordedAudioConfirmed(false);
  };

  const isFileAllowed = (
    file: File,
    kind: BroadcastAttachmentKind,
    source: BroadcastAttachment["source"]
  ): boolean => {
    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    const allowedExtensions =
      kind === "AUDIO" && source === "UPLOAD" ? AUDIO_UPLOAD_EXTENSIONS : EXTENSION_RULES[kind];
    const allowedMimes =
      kind === "AUDIO" && source === "UPLOAD" ? AUDIO_UPLOAD_MIME_TYPES : MIME_RULES[kind];
    return allowedExtensions.includes(extension) || allowedMimes.includes(file.type.toLowerCase());
  };

  const clearEmergencyTimers = () => {
    if (emergencyRedirectTimeoutRef.current) {
      window.clearTimeout(emergencyRedirectTimeoutRef.current);
      emergencyRedirectTimeoutRef.current = null;
    }

    if (emergencyCountdownIntervalRef.current) {
      window.clearInterval(emergencyCountdownIntervalRef.current);
      emergencyCountdownIntervalRef.current = null;
    }
  };

  const closeEmergencyPanel = () => {
    clearEmergencyTimers();
    setIsEmergencyPanelOpen(false);
    setSelectedEmergencyPlatformId(null);
    setEmergencyCountdown(0);
  };

  useEffect(() => {
    const seededHistory: BroadcastEntry[] = school.communication.broadcastHistory.map((item) => ({
      ...item
    }));
    setHistory(seededHistory);
    setSelectedBroadcastId(seededHistory[0]?.id ?? null);
  }, [school.id, school.communication.broadcastHistory]);

  useEffect(() => {
    setMonitorStage("idle");
    setSelectedDeviceId(null);
    setStreamStartedAt(null);
    setStreamElapsedSeconds(0);
    setStreamFailed(false);
    closeEmergencyPanel();
    setIsBroadcastActive(false);
    setTitle("");
    setMessageBody("");
    setBroadcastError("");
    setAudioInputMode("UPLOAD");
    setIsRecordedAudioConfirmed(false);
    resetRecordingTimer();
    stopRecordingStream();
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    clearAttachedMedia();
    setIsSending(false);
    if (broadcastToastTimeoutRef.current) {
      window.clearTimeout(broadcastToastTimeoutRef.current);
      broadcastToastTimeoutRef.current = null;
    }
    setBroadcastToast("");
  }, [school.id]);

  useEffect(() => {
    return () => {
      if (connectTimeoutRef.current) {
        window.clearTimeout(connectTimeoutRef.current);
      }
      if (streamIntervalRef.current) {
        window.clearInterval(streamIntervalRef.current);
      }
      clearEmergencyTimers();
      resetRecordingTimer();
      stopRecordingStream();
      if (broadcastToastTimeoutRef.current) {
        window.clearTimeout(broadcastToastTimeoutRef.current);
      }
      createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      createdObjectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!isEmergencyPanelOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeEmergencyPanel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEmergencyPanelOpen]);

  useEffect(() => {
    if (monitorStage !== "streaming" || !streamStartedAt) {
      if (streamIntervalRef.current) {
        window.clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      setStreamElapsedSeconds(Math.max(0, Math.floor((Date.now() - streamStartedAt) / 1000)));
    };

    tick();
    streamIntervalRef.current = window.setInterval(tick, 1000);

    return () => {
      if (streamIntervalRef.current) {
        window.clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    };
  }, [monitorStage, streamStartedAt]);

  const setContentType = (nextType: BroadcastType) => {
    setType(nextType);
    setBroadcastError("");

    if (nextType !== "TEXT") {
      setMessageBody("");
    }

    if (nextType === "TEXT" || nextType === "EMERGENCY") {
      clearAttachedMedia();
      setAudioInputMode("UPLOAD");
      return;
    }

    if (nextType !== "AUDIO") {
      setAudioInputMode("UPLOAD");
      setIsRecordedAudioConfirmed(false);
      if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      stopRecordingStream();
      resetRecordingTimer();
      setIsRecording(false);
    }

    if (attachedMedia && attachedMedia.kind !== nextType) {
      clearAttachedMedia();
    }
  };

  const resolveFileKindLabel = (kind: BroadcastAttachmentKind): string => {
    if (kind === "PDF") {
      return "PDF";
    }
    if (kind === "IMAGE") {
      return "Image";
    }
    if (kind === "VIDEO") {
      return "Video";
    }
    return "Audio";
  };

  const applyAttachment = (
    file: File,
    kind: BroadcastAttachmentKind,
    source: BroadcastAttachment["source"]
  ): boolean => {
    if (!isFileAllowed(file, kind, source)) {
      setBroadcastError(`Invalid ${resolveFileKindLabel(kind)} file. ${ATTACHMENT_HELPER_TEXT[kind]}`);
      return false;
    }

    clearAttachedMedia();

    const previewUrl = URL.createObjectURL(file);
    registerObjectUrl(previewUrl);

    setAttachedMedia({
      kind,
      file,
      previewUrl,
      source
    });
    setBroadcastError("");
    setIsRecordedAudioConfirmed(source === "UPLOAD");
    return true;
  };

  const handlePickedFiles = (files: FileList | null, overrideKind?: BroadcastAttachmentKind) => {
    const kind = overrideKind ?? currentAttachmentKind;
    if (!kind || !files || files.length === 0) {
      return;
    }
    const pickedFile = files[0];
    const isAttached = applyAttachment(pickedFile, kind, "UPLOAD");
    if (isAttached && kind === "AUDIO") {
      setAudioInputMode("UPLOAD");
    }
  };

  const browseForAttachment = () => {
    if (readOnly) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleUploadDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!currentAttachmentKind || readOnly) {
      return;
    }
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleUploadDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleUploadDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!currentAttachmentKind || readOnly) {
      return;
    }
    event.preventDefault();
    setIsDragActive(false);
    handlePickedFiles(event.dataTransfer.files, currentAttachmentKind);
  };

  const startAudioRecording = async () => {
    if (readOnly || type !== "AUDIO" || isRecording) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setBroadcastError("Microphone recording is not supported on this browser.");
      return;
    }

    clearAttachedMedia();
    setAudioInputMode("RECORD");
    setBroadcastError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/wav"
      ];
      const supportedType = preferredTypes.find((value) => MediaRecorder.isTypeSupported(value));
      const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setBroadcastError("Audio recording failed. Please try again.");
        setIsRecording(false);
        stopRecordingStream();
        resetRecordingTimer();
      };

      recorder.onstop = () => {
        const recordingBlob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });

        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsRecording(false);
        stopRecordingStream();
        resetRecordingTimer();

        if (!recordingBlob.size) {
          setBroadcastError("No audio captured. Please record again.");
          return;
        }

        const mimeType = recordingBlob.type.toLowerCase();
        const extension = mimeType.includes("wav")
          ? ".wav"
          : mimeType.includes("mpeg") || mimeType.includes("mp3")
            ? ".mp3"
            : mimeType.includes("ogg")
              ? ".ogg"
              : ".webm";
        const recordedFile = new File([recordingBlob], `school-recording-${Date.now()}${extension}`, {
          type: recordingBlob.type
        });

        applyAttachment(recordedFile, "AUDIO", "RECORDING");
      };

      recorder.start(300);
      setRecordingSeconds(0);
      setIsRecording(true);
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
      }
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((previous) => previous + 1);
      }, 1000);
    } catch {
      stopRecordingStream();
      resetRecordingTimer();
      setIsRecording(false);
      setBroadcastError("Microphone permission is required to record audio.");
    }
  };

  const stopAudioRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      setIsRecording(false);
      stopRecordingStream();
      resetRecordingTimer();
      return;
    }

    if (recorder.state !== "inactive") {
      recorder.stop();
      return;
    }

    setIsRecording(false);
    stopRecordingStream();
    resetRecordingTimer();
  };

  const confirmRecordedAudio = () => {
    if (attachedMedia?.kind !== "AUDIO" || attachedMedia.source !== "RECORDING") {
      return;
    }
    setIsRecordedAudioConfirmed(true);
    setBroadcastError("");
  };

  const rerecordAudio = async () => {
    if (isRecording) {
      stopAudioRecording();
    }
    clearAttachedMedia();
    await startAudioRecording();
  };

  const removeAttachment = () => {
    if (isRecording) {
      stopAudioRecording();
    }
    clearAttachedMedia();
    setBroadcastError("");
  };

  const isSendEnabled = useMemo(() => {
    if (readOnly || isSending) {
      return false;
    }

    const hasTitle = title.trim().length > 0;
    if (!hasTitle) {
      return false;
    }

    if (type === "TEXT") {
      return messageBody.trim().length > 0;
    }

    if (type === "EMERGENCY") {
      return true;
    }

    if (type === "AUDIO") {
      if (!attachedMedia || attachedMedia.kind !== "AUDIO") {
        return false;
      }
      return attachedMedia.source === "UPLOAD" || isRecordedAudioConfirmed;
    }

    if (type === "PDF" || type === "IMAGE" || type === "VIDEO") {
      return attachedMedia?.kind === type;
    }

    return false;
  }, [attachedMedia, isRecordedAudioConfirmed, isSending, messageBody, readOnly, title, type]);

  const handleSend = () => {
    if (!isSendEnabled) {
      return;
    }

    setIsSending(true);
    setBroadcastError("");

    const queuedAttachment = attachedMedia;
    const nextType = type;
    const nextTitle = title.trim();
    const nextBody = messageBody.trim();

    window.setTimeout(() => {
      const message: BroadcastEntry = {
        id: crypto.randomUUID(),
        title: nextTitle,
        type: nextType,
        sentAt: schoolHoursIsoNow(),
        body: nextType === "TEXT" ? nextBody : undefined,
        fileName: queuedAttachment?.file.name,
        fileSizeBytes: queuedAttachment?.file.size,
        fileUrl: queuedAttachment?.previewUrl ?? undefined,
        fileMimeType: queuedAttachment?.file.type,
        fileSource: queuedAttachment?.source
      };

      setHistory((prev) => [message, ...prev].slice(0, 20));
      setSelectedBroadcastId(message.id);
      setTitle("");
      setMessageBody("");
      setAttachedMedia(null);
      setIsRecordedAudioConfirmed(false);
      setAudioInputMode("UPLOAD");
      setIsSending(false);

      if (broadcastToastTimeoutRef.current) {
        window.clearTimeout(broadcastToastTimeoutRef.current);
      }
      setBroadcastToast("Broadcast Sent Successfully");
      broadcastToastTimeoutRef.current = window.setTimeout(() => {
        setBroadcastToast("");
        broadcastToastTimeoutRef.current = null;
      }, 2200);
    }, 700);
  };

  const openDevicePanel = () => {
    if (!school.communication.liveAccessEnabled) {
      return;
    }

    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    setMonitorStage((previous) => (previous === "devices" ? "idle" : "devices"));
    setStreamStartedAt(null);
    setStreamElapsedSeconds(0);
    setStreamFailed(false);
    closeEmergencyPanel();
  };

  const connectToDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setMonitorStage("connecting");
    setStreamFailed(false);

    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
    }

    const delayMs = 2000 + Math.floor(Math.random() * 1000);
    connectTimeoutRef.current = window.setTimeout(() => {
      setMonitorStage("streaming");
      setStreamStartedAt(Date.now());
      setStreamElapsedSeconds(0);
      connectTimeoutRef.current = null;
    }, delayMs);
  };

  const backToDevices = () => {
    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    setMonitorStage("devices");
    setStreamStartedAt(null);
    setStreamElapsedSeconds(0);
    setStreamFailed(false);
  };

  const stopStream = () => {
    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    setMonitorStage("idle");
    setSelectedDeviceId(null);
    setStreamStartedAt(null);
    setStreamElapsedSeconds(0);
    setStreamFailed(false);
  };

  const openFullscreen = async () => {
    if (!streamContainerRef.current) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await streamContainerRef.current.requestFullscreen();
  };

  const openEmergencyPanel = () => {
    if (readOnly || !school.communication.liveAccessEnabled) {
      return;
    }

    setIsEmergencyPanelOpen(true);
    setSelectedEmergencyPlatformId(null);
    setEmergencyCountdown(0);
  };

  const launchEmergencyPlatform = (platform: EmergencyPlatform) => {
    if (!platform.available || selectedEmergencyPlatformId) {
      return;
    }

    setSelectedEmergencyPlatformId(platform.id);
    setEmergencyCountdown(3);

    clearEmergencyTimers();

    emergencyCountdownIntervalRef.current = window.setInterval(() => {
      setEmergencyCountdown((previous) => (previous > 1 ? previous - 1 : 1));
    }, 330);

    emergencyRedirectTimeoutRef.current = window.setTimeout(() => {
      window.open(platform.url, "_blank", "noopener,noreferrer");

      const emergencyMessage: BroadcastEntry = {
        id: crypto.randomUUID(),
        type: "TEXT",
        title: `School communication started via ${platform.label}`,
        sentAt: schoolHoursIsoNow()
      };

      setHistory((prev) => [emergencyMessage, ...prev].slice(0, 20));
      setSelectedBroadcastId(emergencyMessage.id);
      setIsBroadcastActive(true);
      closeEmergencyPanel();
    }, 1000);
  };

  const getBroadcastTypeLabel = (value: BroadcastType): string => {
    return value === "EMERGENCY" ? "PRIORITY" : value;
  };

  const getBroadcastTypeClass = (value: BroadcastType): string => {
    if (value === "TEXT") {
      return "text";
    }
    if (value === "PDF") {
      return "pdf";
    }
    if (value === "AUDIO") {
      return "audio";
    }
    if (value === "IMAGE") {
      return "image";
    }
    if (value === "VIDEO") {
      return "video";
    }
    return "priority";
  };

  const activeUploadKind: BroadcastAttachmentKind | null =
    type === "AUDIO" ? "AUDIO" : currentAttachmentKind;
  const showUploadDropzone =
    Boolean(activeUploadKind) && (type !== "AUDIO" || audioInputMode === "UPLOAD");
  const showAudioRecorder = type === "AUDIO" && audioInputMode === "RECORD";
  const isPendingRecordedAudio =
    type === "AUDIO" &&
    attachedMedia?.kind === "AUDIO" &&
    attachedMedia.source === "RECORDING" &&
    !isRecordedAudioConfirmed;

  return (
    <Card title="Connect to School - Live Communication Hub" subtitle="Live monitoring and secure broadcasting">
      <div className="module-grid module-2">
        <div className="live-panel">
          <div className="live-header">
            <h4>Live Access</h4>
            <div className="live-status-group">
              {isBroadcastActive ? <span className="emergency-active-indicator">Communication Active</span> : null}
              <StatusPill
                text={school.communication.liveAccessEnabled ? "AUTHORIZED" : "DISABLED"}
                color={school.communication.liveAccessEnabled ? "GREEN" : "RED"}
              />
            </div>
          </div>

          <div className={`camera-placeholder live-monitor-surface stage-${monitorStage}`}>
            {monitorStage === "idle" ? (
              <div className="monitor-view monitor-idle-view">
                <span>Classroom Camera Stream Preview</span>
              </div>
            ) : null}

            {monitorStage === "devices" ? (
              <div className="monitor-view device-picker-view">
                <div className="device-picker-header">
                  <h5>Available Devices</h5>
                  <span>{devices.length} devices</span>
                </div>
                <ul className="device-picker-list">
                  {devices.map((device) => (
                    <li key={device.id}>
                      <button type="button" className="device-row" onClick={() => connectToDevice(device.id)}>
                        <span className="device-name" title={device.name}>
                          {device.name}
                        </span>
                        <span className="device-status">
                          <span className="device-dot device-online" />
                          Online
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {monitorStage === "connecting" ? (
              <div className="monitor-view connecting-view">
                <span className="connect-spinner" aria-hidden="true" />
                <strong>Connecting to device...</strong>
                <p>Establishing secure video stream</p>
                <small>{selectedDevice?.name ?? "Preparing device channel"}</small>
              </div>
            ) : null}

            {monitorStage === "streaming" ? (
              <div className="monitor-view stream-view" ref={streamContainerRef}>
                <video
                  className="live-stream-video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  onError={() => setStreamFailed(true)}
                >
                  <source src={STREAM_SOURCE_PRIMARY} />
                  <source src={STREAM_SOURCE_FALLBACK} type="video/webm" />
                </video>

                <div className="stream-overlay-bar">
                  <span className="stream-live-pill">LIVE</span>
                  <span className="stream-device" title={selectedDevice?.name ?? ""}>
                    {selectedDevice?.name ?? "Camera Device"}
                  </span>
                  <span className="stream-timer">{formatDuration(streamElapsedSeconds)}</span>
                  <span className="stream-signal" aria-label="Signal strength">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </div>

                {streamFailed ? (
                  <div className="stream-fallback">Unable to load stream source /videoplayback</div>
                ) : null}
              </div>
            ) : null}

            {isEmergencyPanelOpen ? (
              <div className="emergency-modal-layer" role="dialog" aria-modal="true">
                <div className="emergency-modal-card">
                  <div className="emergency-modal-head">
                    <div>
                      <h5>Start School Communication</h5>
                      <p>Select a communication platform to connect with the school</p>
                      <small title={school.geoIdentity.schoolName}>{school.geoIdentity.schoolName}</small>
                    </div>
                    <button type="button" className="emergency-close-btn" onClick={closeEmergencyPanel}>
                      x Cancel
                    </button>
                  </div>

                  <div className="emergency-platform-grid">
                    {emergencyPlatforms.map((platform) => (
                      <button
                        key={platform.id}
                        type="button"
                        className={`emergency-platform-card ${
                          selectedEmergencyPlatformId === platform.id ? "active" : ""
                        }`}
                        disabled={!platform.available || Boolean(selectedEmergencyPlatformId)}
                        onClick={() => launchEmergencyPlatform(platform)}
                      >
                        <span className="emergency-platform-icon">
                          <PlatformIcon id={platform.id} />
                        </span>
                        <span className="emergency-platform-meta">
                          <strong>{platform.label}</strong>
                          <span>{platform.connectLabel}</span>
                        </span>
                        <span className={`emergency-platform-state ${platform.available ? "ready" : "disabled"}`}>
                          {platform.available ? "Ready" : "Disabled"}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedEmergencyPlatform ? (
                    <div className="emergency-init-panel">
                      <span className="connect-spinner emergency-connect-spinner" aria-hidden="true" />
                      <div>
                        <strong>Initializing secure school communication session...</strong>
                        <p>{selectedEmergencyPlatform.label} connection is preparing</p>
                      </div>
                      <span className="emergency-countdown">{emergencyCountdown > 0 ? emergencyCountdown : "1"}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="live-actions">
            {monitorStage === "streaming" ? (
              <>
                <button className="ghost-btn" type="button" onClick={backToDevices}>
                  Back to Devices
                </button>
                <button className="ghost-btn" type="button" onClick={openFullscreen}>
                  Fullscreen
                </button>
                <button className="danger-btn" type="button" onClick={stopStream}>
                  Stop Stream
                </button>
              </>
            ) : (
              <button
                className="ghost-btn open-monitor-btn"
                type="button"
                disabled={!school.communication.liveAccessEnabled}
                onClick={openDevicePanel}
              >
                Open Live Monitoring
              </button>
            )}
            <button
              className="danger-btn"
              type="button"
              disabled={!school.communication.liveAccessEnabled || readOnly}
              onClick={openEmergencyPanel}
            >
              Connect to School
            </button>
          </div>
        </div>

        <div className="broadcast-panel">
          <h4>Broadcasting Media System</h4>
          <div className={`broadcast-form ${type === "EMERGENCY" ? "priority-mode" : ""}`}>
            <label>
              Content Type
              <select
                value={type}
                onChange={(event) => setContentType(event.target.value as BroadcastType)}
                disabled={readOnly || isSending || isRecording}
              >
                <option value="TEXT">Text</option>
                <option value="PDF">PDF</option>
                <option value="AUDIO">Audio</option>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="EMERGENCY">Priority</option>
              </select>
            </label>

            <div className="broadcast-dynamic-area">
              <label>
                Message Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter announcement heading"
                  disabled={readOnly || isSending}
                />
              </label>

              {type === "TEXT" ? (
                <label>
                  Message Body
                  <textarea
                    value={messageBody}
                    onChange={(event) => setMessageBody(event.target.value)}
                    placeholder="Write the communication message for the school"
                    disabled={readOnly || isSending}
                    rows={4}
                  />
                </label>
              ) : null}

              {type === "EMERGENCY" ? (
                <div className="broadcast-priority-note">
                  <strong>Priority Communication</strong>
                  <span>This message is marked as high priority for immediate school visibility.</span>
                </div>
              ) : null}

              {activeUploadKind ? (
                <div className="broadcast-upload-shell">
                  {type === "AUDIO" ? (
                    <div className="audio-mode-switch">
                      <button
                        type="button"
                        className={`audio-mode-btn ${audioInputMode === "UPLOAD" ? "active" : ""}`}
                        onClick={() => setAudioInputMode("UPLOAD")}
                        disabled={readOnly || isSending || isRecording}
                      >
                        Upload Audio File
                      </button>
                      <button
                        type="button"
                        className={`audio-mode-btn ${audioInputMode === "RECORD" ? "active" : ""}`}
                        onClick={() => setAudioInputMode("RECORD")}
                        disabled={readOnly || isSending}
                      >
                        Record Using Microphone
                      </button>
                    </div>
                  ) : null}

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept={activeUploadKind ? INPUT_ACCEPT_MAP[activeUploadKind] : undefined}
                    onChange={(event) => {
                      handlePickedFiles(event.target.files, activeUploadKind ?? undefined);
                      event.currentTarget.value = "";
                    }}
                  />

                  {showUploadDropzone ? (
                    <div
                      className={`upload-dropzone ${isDragActive ? "drag-active" : ""}`}
                      onDragOver={handleUploadDragOver}
                      onDragEnter={handleUploadDragOver}
                      onDragLeave={handleUploadDragLeave}
                      onDrop={handleUploadDrop}
                    >
                      <p>Drag &amp; drop {resolveFileKindLabel(activeUploadKind!)} file here</p>
                      <span>{ATTACHMENT_HELPER_TEXT[activeUploadKind!]}</span>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={browseForAttachment}
                        disabled={readOnly || isSending}
                      >
                        Browse File
                      </button>
                    </div>
                  ) : null}

                  {showAudioRecorder ? (
                    <div className="audio-recorder-box">
                      <div className="audio-recorder-head">
                        <strong>Microphone Recorder</strong>
                        <span>{formatDuration(recordingSeconds)}</span>
                      </div>
                      <div className="audio-recorder-actions">
                        {!isRecording ? (
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={startAudioRecording}
                            disabled={readOnly || isSending}
                          >
                            Start Recording
                          </button>
                        ) : (
                          <button type="button" className="danger-btn" onClick={stopAudioRecording}>
                            Stop Recording
                          </button>
                        )}
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={rerecordAudio}
                          disabled={readOnly || isSending}
                        >
                          Re-record
                        </button>
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={confirmRecordedAudio}
                          disabled={!isPendingRecordedAudio || readOnly || isSending}
                        >
                          Attach Recording
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {attachedMedia ? (
                    <div className="broadcast-file-preview">
                      <div className="broadcast-file-row">
                        <div className="broadcast-file-meta">
                          <strong title={attachedMedia.file.name}>{attachedMedia.file.name}</strong>
                          <span>
                            {formatFileSize(attachedMedia.file.size)} ·{" "}
                            {attachedMedia.source === "RECORDING"
                              ? isRecordedAudioConfirmed
                                ? "Recorded and attached"
                                : "Recording ready to attach"
                              : "Uploaded file"}
                          </span>
                        </div>
                        <div className="broadcast-file-actions">
                          {showUploadDropzone ? (
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={browseForAttachment}
                              disabled={readOnly || isSending}
                            >
                              Replace
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={removeAttachment}
                            disabled={readOnly || isSending}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {attachedMedia.kind === "AUDIO" && attachedMedia.previewUrl ? (
                        <audio controls src={attachedMedia.previewUrl} className="broadcast-audio-preview" />
                      ) : null}

                      {attachedMedia.kind === "IMAGE" && attachedMedia.previewUrl ? (
                        <img src={attachedMedia.previewUrl} alt="Uploaded preview" className="broadcast-image-preview" />
                      ) : null}

                      {attachedMedia.kind === "VIDEO" && attachedMedia.previewUrl ? (
                        <video controls src={attachedMedia.previewUrl} className="broadcast-video-preview" />
                      ) : null}

                      {attachedMedia.kind === "PDF" && attachedMedia.previewUrl ? (
                        <a
                          className="broadcast-pdf-link"
                          href={attachedMedia.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Preview PDF
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {broadcastError ? <p className="broadcast-error-text">{broadcastError}</p> : null}
            {broadcastToast ? (
              <p className="broadcast-success-toast" role="status">
                {broadcastToast}
              </p>
            ) : null}

            {readOnly ? (
              <span className="readonly-chip">Read-Only Access</span>
            ) : (
              <button
                type="button"
                className="primary-btn broadcast-send-btn"
                onClick={handleSend}
                disabled={!isSendEnabled}
              >
                {isSending ? "Sending Broadcast..." : "Send Broadcast"}
              </button>
            )}
          </div>

          <h4>Recent Broadcasts</h4>
          <div className="broadcast-history-wrap">
            {history.length === 0 ? (
              <p className="broadcast-empty">No broadcasts available.</p>
            ) : (
              <ul className="broadcast-history-list">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`broadcast-history-item ${selectedBroadcastId === item.id ? "active" : ""}`}
                      onClick={() => setSelectedBroadcastId(item.id)}
                    >
                      <span className={`broadcast-type-badge ${getBroadcastTypeClass(item.type)}`}>
                        {getBroadcastTypeLabel(item.type)}
                      </span>
                      <span className="broadcast-history-title" title={item.title}>
                        {item.title}
                      </span>
                      <span className="broadcast-history-time">{formatDateTime(item.sentAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedBroadcast ? (
            <div className="broadcast-preview-panel">
              <div className="broadcast-preview-head">
                <span className={`broadcast-type-badge ${getBroadcastTypeClass(selectedBroadcast.type)}`}>
                  {getBroadcastTypeLabel(selectedBroadcast.type)}
                </span>
                <span>{formatDateTime(selectedBroadcast.sentAt)}</span>
              </div>
              <p className="broadcast-preview-title">{selectedBroadcast.title}</p>
              {selectedBroadcast.body ? <p className="broadcast-preview-body">{selectedBroadcast.body}</p> : null}
              {selectedBroadcast.fileName ? (
                <p className="broadcast-preview-meta">
                  {selectedBroadcast.fileName}
                  {selectedBroadcast.fileSizeBytes ? ` · ${formatFileSize(selectedBroadcast.fileSizeBytes)}` : ""}
                </p>
              ) : null}

              {selectedBroadcast.type === "AUDIO" && selectedBroadcast.fileUrl ? (
                <audio controls src={selectedBroadcast.fileUrl} className="broadcast-audio-preview" />
              ) : null}
              {selectedBroadcast.type === "IMAGE" && selectedBroadcast.fileUrl ? (
                <img src={selectedBroadcast.fileUrl} alt="Broadcast media preview" className="broadcast-image-preview" />
              ) : null}
              {selectedBroadcast.type === "VIDEO" && selectedBroadcast.fileUrl ? (
                <video controls src={selectedBroadcast.fileUrl} className="broadcast-video-preview" />
              ) : null}
              {selectedBroadcast.type === "PDF" && selectedBroadcast.fileUrl ? (
                <a className="broadcast-pdf-link" href={selectedBroadcast.fileUrl} target="_blank" rel="noreferrer">
                  Open PDF Preview
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
};
