export type Hex = `0x${string}`;
export type Hash = Hex;
export type Address = Hash;

export function isHex(input: string): input is Hex {
  return input.startsWith('0x');
}

export function ensureHex(input: string): Hex {
  return isHex(input) ? input : `0x${input}`;
}
