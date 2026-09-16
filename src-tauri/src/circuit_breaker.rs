#[allow(dead_code)]
#[derive(Debug, PartialEq, Eq)]
pub enum CircuitBreakerState {
    Operational,
    SuspendedVram,
    TdrRecovering,
    HaltedDiskFull,
}

#[allow(dead_code)]
pub struct CircuitBreakerManager {
    pub vram_critical_limit_mb: u64,
    pub frame_timeout_ms: u64,
    pub disk_critical_limit_mb: u64,
    pub state: CircuitBreakerState,
}

impl CircuitBreakerManager {
    pub fn new() -> Self {
        Self {
            vram_critical_limit_mb: 300,
            frame_timeout_ms: 500,
            disk_critical_limit_mb: 500,
            state: CircuitBreakerState::Operational,
        }
    }

    pub fn check_vram_safety(&mut self, available_vram_mb: u64) -> Result<(), &'static str> {
        if available_vram_mb < self.vram_critical_limit_mb {
            self.state = CircuitBreakerState::SuspendedVram;
            return Err("CIRCUIT_BREAKER_VRAM_CRITICAL");
        }
        Ok(())
    }

    pub fn check_frame_execution(&self, duration_ms: u64) -> Result<(), &'static str> {
        if duration_ms > self.frame_timeout_ms {
            return Err("CORRUPTED_FRAME_TIMEOUT_SKIP");
        }
        Ok(())
    }

    pub fn check_disk_safety(&mut self, free_disk_mb: u64) -> Result<(), &'static str> {
        if free_disk_mb < self.disk_critical_limit_mb {
            self.state = CircuitBreakerState::HaltedDiskFull;
            return Err("CIRCUIT_BREAKER_DISK_FULL");
        }
        Ok(())
    }
}
