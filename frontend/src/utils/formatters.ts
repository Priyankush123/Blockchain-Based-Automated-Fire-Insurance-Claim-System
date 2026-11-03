import { ethers } from "ethers";

/**
 * Formats integer paise into Indian Rupee format (e.g. ₹50,00,000.00).
 */
export function formatPaise(paiseBigInt: bigint | number | string): string {
  try {
    const val = BigInt(paiseBigInt);
    const rupees = Number(val) / 100;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(rupees);
  } catch {
    return "₹0.00";
  }
}

/**
 * Converts INR Rupees number or string into paise BigInt.
 */
export function rupeesToPaise(rupees: number | string): bigint {
  const num = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (isNaN(num) || num < 0) return 0n;
  return BigInt(Math.round(num * 100));
}

/**
 * Truncates an Ethereum address or hash for UI display (e.g. 0x1234...abcd).
 */
export function shortenAddress(addr: string, lead = 6, tail = 4): string {
  if (!addr || addr === ethers.ZeroAddress || addr === ethers.ZeroHash) return "—";
  if (addr.length <= lead + tail) return addr;
  return `${addr.slice(0, lead)}...${addr.slice(-tail)}`;
}

/**
 * Formats a Unix timestamp (seconds) into a readable date string.
 */
export function formatTimestamp(timestamp: bigint | number | string): string {
  try {
    const ts = Number(timestamp);
    if (!ts || ts === 0) return "—";
    return new Date(ts * 1000).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return "—";
  }
}

