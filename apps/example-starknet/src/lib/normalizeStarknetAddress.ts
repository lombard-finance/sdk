const STARKNET_HEX_LENGTH = 64;
const HEX_REGEX = /^[0-9a-fA-F]+$/;

/**
 * Starknet addresses are 252-bit felt values = 0x + 64 hex chars.
 * Wallets strip leading zeros, e.g.
 * return 0x3edf... (63 chars) instead of 0x03edf... (64 chars).
 * padStart restores missing leading zeros to the full 64-char hex representation.
 */
export function normalizeStarknetAddress(address: string): string {
  if (!address || !address.startsWith('0x')) {
    throw new Error(
      `Invalid Starknet address: must start with 0x, got "${address}"`,
    );
  }

  const hexPart = address.slice(2);

  if (hexPart.length === 0 || hexPart.length > STARKNET_HEX_LENGTH) {
    throw new Error(
      `Invalid Starknet address: hex part must be 1-${STARKNET_HEX_LENGTH} chars, got ${hexPart.length}`,
    );
  }

  if (!HEX_REGEX.test(hexPart)) {
    throw new Error('Invalid Starknet address: contains non-hex characters');
  }

  return `0x${hexPart.padStart(STARKNET_HEX_LENGTH, '0')}`;
}
