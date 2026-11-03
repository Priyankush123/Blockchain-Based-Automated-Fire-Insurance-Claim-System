import { ethers } from "ethers";

/**
 * Computes SHA-256 hex string (0x-prefixed) from an ArrayBuffer using native Web Crypto API.
 */
export async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

/**
 * Computes Keccak-256 from a string using ethers.
 */
export function hashString(value: string): string {
  if (!value || value.trim() === "") return ethers.ZeroHash;
  // If it's already a valid 32-byte hex string (0x + 64 hex characters), return as-is
  if (/^0x[0-9a-fA-F]{64}$/.test(value.trim())) {
    return value.trim();
  }
  return ethers.keccak256(ethers.toUtf8Bytes(value.trim()));
}

