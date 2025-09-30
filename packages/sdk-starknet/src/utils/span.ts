import { uint256 } from 'starknet';

// Example of the proof hex:
// 0x
// 0000000000000000000000000000000000000000000000000000000000000020  //index: 0; offset 0x20 -> 32/32 -> 1
// 0000000000000000000000000000000000000000000000000000000000000004  //index: 1; len 0x4 -> 4
// 0000000000000000000000000000000000000000000000000000000000000080  //index: 2; el 0: 0x80 -> 128/32 -> 4 +3
// 00000000000000000000000000000000000000000000000000000000000000e0  //index: 3; el 1: 0xe0 -> 224/32 -> 7 +3
// 0000000000000000000000000000000000000000000000000000000000000140  //index: 4; el 2: 0x140 -> 320/32 -> 10 +3
// 00000000000000000000000000000000000000000000000000000000000001a0  //index: 5; el 3: 0x1a0 -> 416/32 -> 13 +3
// 0000000000000000000000000000000000000000000000000000000000000040  //index: 6;
// 195a8c89950230b7f0e204dad96026e7fbc3e871c5e36179d3398e0b71d93a6b  //index: 7; tuple 1
// 12f0bc183214345ec0931a02f1798230da7ba0735176cb203342e34086ecd9c7  //index: 8;
// 0000000000000000000000000000000000000000000000000000000000000040  //index: 9;
// e57eb39fad14be8803853f9dce2a1aeb13e8e6a7e4b4762601469c4cefee05e6  //index: 10; tuple 2
// 1ad93c8fb90e282f6e41aaaca23d0ddc088fdd2da26188d0f89c0049c16f6fa4  //index: 11;
// 0000000000000000000000000000000000000000000000000000000000000040  //index: 10;
// 3b8cc5c7440647ee1345785a4167d8b119ecd7a0315ec4e112ae27e7cd7f8e36  //index: 13; tuple 3
// 6093f2edd4a8b54d28ecc26b595402f63cfd90b76f329e37d8d48eb0c64a353e  //index: 14;
// 0000000000000000000000000000000000000000000000000000000000000040  //index: 15;
// 65b8ea7c620f8b206e94e4b0415cb29ae049c13147593895ff33fcf1ab871345  //index: 16; tuple 4
// 3bd0794b51ae3db9c8c90a89c7843150c812c119f7faa9997d0a942253e7cb4c  //index: 17;

export function parseProofHexToU256Tuples(proofHex: string) {
  let calldataHex = proofHex;
  if (calldataHex.startsWith('0x')) calldataHex = calldataHex.slice(2);
  const words = calldataHex.match(/.{64}/g); // each word = 32 bytes = 64 hex chars
  if (!words) throw new Error('Invalid hex string');

  const offsetToArray = Number.parseInt(words[0], 16) / 32;
  const arrayLength = Number.parseInt(words[offsetToArray], 16);
  const offsetBase = offsetToArray + 1; // where offsets to elements start

  const result = [];

  for (let i = 0; i < arrayLength; i++) {
    const tupleByteOffset = Number.parseInt(words[offsetBase + i], 16); // in bytes

    // Dynamic tuple layout:
    // [0]: skip
    // [1]: u256 low
    // [2]: u256 high
    const skip = 1;
    const tupleWordIndex = tupleByteOffset / 32 + offsetBase + skip;

    const r = `0x${words[tupleWordIndex]}`;
    const s = `0x${words[tupleWordIndex + 1]}`;

    console.log(`sig ${i}`, { r, s });

    const uint256r = uint256.bnToUint256(r);
    const uint256s = uint256.bnToUint256(s);

    result.push({ 0: uint256r, 1: uint256s });
  }

  return result;
}
