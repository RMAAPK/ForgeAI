-- Forge AI & Edge Sensor Telemetry Schema for Supabase (PostgreSQL)
-- Fully private, air-gapped sync and telemetry ingestion for CNC spindle acoustic defense

-- 1. Devices & Spindle Sentinel Registry
CREATE TABLE IF NOT EXISTS edge_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_uid TEXT UNIQUE NOT NULL, -- Hardware MAC / eFuse SHA256
    name TEXT NOT NULL,
    firmware_revision TEXT NOT NULL DEFAULT 'revA',
    status TEXT NOT NULL DEFAULT 'OFFLINE', -- 'ONLINE', 'DISCONNECTED', 'ALERT'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. 80-Band Acoustic Telemetry & Anomaly Frames
CREATE TABLE IF NOT EXISTS acoustic_telemetry (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id UUID REFERENCES edge_devices(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    rpm NUMERIC(8, 2) DEFAULT 0,
    rms_db REAL NOT NULL,
    peak_frequency_hz REAL NOT NULL,
    chatter_detected BOOLEAN NOT NULL DEFAULT false,
    estop_tripped BOOLEAN NOT NULL DEFAULT false,
    harmonic_severity TEXT NOT NULL DEFAULT 'NORMAL', -- 'NORMAL', 'WARN', 'CRITICAL_DEFLECTION'
    
    -- Kinematic & Unbalance Zone: 10 linear bins (1 Hz - 500 Hz, 49.9 Hz/bin)
    kinematic_bands REAL[] NOT NULL, -- length 10
    
    -- Chatter & Breakage Zone: 70 linear bins (500 Hz - 20,000 Hz, 278.57 Hz/bin)
    chatter_bands REAL[] NOT NULL   -- length 70
);

CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON acoustic_telemetry (device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_estop ON acoustic_telemetry (estop_tripped) WHERE estop_tripped = true;

-- 3. Hardware E-Stop Autopsy & Incident Logs
CREATE TABLE IF NOT EXISTS incident_autopsies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES edge_devices(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    trigger_type TEXT NOT NULL, -- 'OPTICAL_PC817_FEED_HOLD', 'CHATTER_RESONANCE_SPIKE'
    peak_hz REAL NOT NULL,
    rms_db REAL NOT NULL,
    vector_80_snapshot REAL[] NOT NULL, -- full 80-band snapshot at moment of trip
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_notes TEXT
);

-- Row Level Security (RLS) - Private Access Only
ALTER TABLE edge_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE acoustic_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_autopsies ENABLE ROW LEVEL SECURITY;
