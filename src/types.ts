// Types for NeuralScaler-DLSS5 Desktop App
export type VideoStatus = 'IDLE' | 'VALIDATING' | 'RECOMMENDED' | 'WARNING_480P' | 'REJECTED' | 'ALREADY_4K';

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
}
