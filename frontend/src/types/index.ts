export interface SensorReading {
  device_id: string;
  property_id: string;
  temperature: number;
  smoke_level: number;
  flame_detected: boolean;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  duration_seconds?: number;
}

export interface VerificationResult {
  reading: SensorReading;
  rule_verdict: 'CONFIRMED_FIRE' | 'POSSIBLE_FIRE' | 'NORMAL' | 'ANOMALY';
  ai_result: {
    fire_confidence: number;
    classification: 'CONFIRMED_FIRE' | 'POSSIBLE_FIRE' | 'NORMAL' | 'ANOMALY';
  };
  verification_status: 'CONFIRMED_FIRE' | 'POSSIBLE_FIRE' | 'NORMAL' | 'MANUAL_REVIEW';
  reason: string;
}

export interface BlockchainReceipt {
  tx_hash: string;
  event_id: string;
  receipt?: {
    blockNumber?: number;
    gasUsed?: number;
    status?: number;
    from?: string;
    to?: string;
    transactionHash?: string;
  };
}

export interface FireVerifyResponse {
  verification: VerificationResult;
  verification_status: string;
  fire_event_id: string;
  blockchain: BlockchainReceipt;
}

export interface FireEventItem {
  id: string;
  device_id: string;
  property_id: string;
  temperature: number;
  smoke_level: number;
  flame_detected: boolean;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  verified: boolean;
}

export interface Policy {
  id: string;
  temperature_threshold: number;
  smoke_threshold: number;
  required_duration_seconds: number;
  payout_amount: number;
}

export interface PolicyCreateInput {
  temperature_threshold: number;
  smoke_threshold: number;
  required_duration_seconds: number;
  payout_amount: number;
}

export interface Claim {
  id: string;
  event_id: string;
  policy_id: string;
  status: 'approved' | 'rejected' | 'manual_review';
  payout_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ClaimCreateInput {
  event_id: string;
  policy_id: string;
}

export interface ModelMetadata {
  model_type: string;
  hyperparameters: Record<string, unknown>;
  features: string[];
  test_f1_macro: number;
}

export interface HealthStatus {
  status: string;
  model_loaded: boolean;
}
