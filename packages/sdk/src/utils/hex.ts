type Hex = `0x${string}`;

export function isHex(input: string): input is Hex {
  return input.startsWith("0x");
}

export function ensureHex(input: string): Hex {
  return isHex(input) ? input : `0x${input}`;
}
