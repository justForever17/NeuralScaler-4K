// Types for NeuralScaler-DLSS5 Desktop App
export type VideoStatus = 'IDLE' | 'VALIDATING' | 'RECOMMENDED' | 'WARNING_480P' | 'WARNING_LOW_RES' | 'REJECTED' | 'ALREADY_4K';

export interface VideoMetadata {
  filePath: string;
  fileName: string;
  width: number;
  height: number;
  durationSeconds: number;
  fps: number;
  codec: string;
  fileSizeBytes: number;
  status: VideoStatus;
  statusMessage?: string;
  isConfirmed480pRisk?: boolean;
}

export type QualityProfile = 'FAITHFUL' | 'NATURAL' | 'CINEMATIC';

export interface AppConfig {
  qualityProfile: QualityProfile;
  outputDir: string;
  fallbackDir: string;
  namingTemplate: string;
  enableFaststart: boolean;
  colorStandard: 'BT.709' | 'BT.2020';
  deblockStrength: 'WEAK' | 'MEDIUM' | 'OFF';
}

export interface QueuedTask {
  id: string;
  inputFile: string;
  outputFile: string;
  outputDir: string;
  totalFrames: number;
  qualityProfile: QualityProfile;
  targetRes: '4K' | '2X';
  fileName: string;
  fileSizeBytes: number;
  status: 'QUEUED' | 'PROCESSING' | 'FINISHED' | 'ERROR';
}

export interface TelemetryState {
  isProcessing: boolean;
  isPaused: boolean;
  currentFrame: number;
  totalFrames: number;
  currentFps: number;
  gpuLoadPercent: number;
  vramUsedMb: number;
  vramTotalMb: number;
  etaSeconds: number;
  circuitBreakerStatus: 'OPERATIONAL' | 'SUSPENDED_VRAM' | 'TDR_RECOVERING' | 'HALTED_DISK_FULL';
  queue?: QueuedTask[];
}

export interface GpuDevice {
  id: string;
  name: string;
  vendor: 'NVIDIA' | 'AMD' | 'INTEL' | 'OTHER';
  vendor_cn?: string;
  vram_mb: number;
  is_discrete: boolean;
  is_recommended?: boolean;
  is_supported: boolean;
  rejection_reason?: string | null;
  tag: string;
}

export interface SystemInfo {
  os: string;
  gpus: GpuDevice[];
  selected_gpu: string;
  has_supported_gpu?: boolean;
}

export type ThemeMode = 'dark' | 'light' | 'auto';

