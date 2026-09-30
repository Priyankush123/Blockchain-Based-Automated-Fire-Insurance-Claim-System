import type {
  HealthStatus,
  FireEventItem,
  Policy,
  PolicyCreateInput,
  Claim,
  ClaimCreateInput,
  FireVerifyResponse,
  ModelMetadata,
  SensorReading
} from '../types';

const BASE_URL = '';

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed with status: ${res.status}`);
  return res.json();
}

export async function fetchModelInfo(): Promise<ModelMetadata> {
  const res = await fetch(`${BASE_URL}/api/model/info`);
  if (!res.ok) throw new Error(`Failed to fetch model info: ${res.status}`);
  return res.json();
}

export async function verifyFireSensor(data: SensorReading): Promise<FireVerifyResponse> {
  const res = await fetch(`${BASE_URL}/api/fire/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to verify fire reading');
  }
  return res.json();
}

export async function postRawSensorData(data: SensorReading): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/sensors/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to submit raw sensor data');
  }
  return res.json();
}

export async function fetchFireEvents(): Promise<FireEventItem[]> {
  const res = await fetch(`${BASE_URL}/api/fire/events`);
  if (!res.ok) throw new Error(`Failed to fetch fire events: ${res.status}`);
  return res.json();
}

export async function fetchPolicies(): Promise<Policy[]> {
  const res = await fetch(`${BASE_URL}/api/policies`);
  if (!res.ok) throw new Error(`Failed to fetch policies: ${res.status}`);
  return res.json();
}

export async function createPolicy(data: PolicyCreateInput): Promise<Policy> {
  const res = await fetch(`${BASE_URL}/api/policies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to create policy');
  }
  return res.json();
}

export async function deletePolicy(policyId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/policies/${policyId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`Failed to delete policy: ${res.status}`);
}

export async function fetchClaims(): Promise<Claim[]> {
  const res = await fetch(`${BASE_URL}/api/claims`);
  if (!res.ok) throw new Error(`Failed to fetch claims: ${res.status}`);
  return res.json();
}

export async function evaluateClaim(data: ClaimCreateInput): Promise<Claim> {
  const res = await fetch(`${BASE_URL}/api/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to evaluate claim');
  }
  return res.json();
}
