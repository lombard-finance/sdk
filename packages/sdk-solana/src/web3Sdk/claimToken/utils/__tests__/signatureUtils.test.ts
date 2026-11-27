import { Buffer } from 'node:buffer'; // Import Buffer for hex comparisons

import { describe, expect, it } from 'vitest';

import { parseSignaturesFromProof } from '../signatureUtils';

describe('signatureUtils', () => {
  describe('parseSignaturesFromProof', () => {
    // Test Case 1: three valid signatures
    it('should parse three valid signatures correctly', () => {
      // From Go test: "three valid signatures"
      const proof =
        '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000040d764881a3e99000dfc55377cdf7601047d071c0c491def1d79631504f07c921820614bf96eefec3511967d9a3abaa14656440af089a018d0d641c329cc3a10100000000000000000000000000000000000000000000000000000000000000040b419c4967990f07401b4a42eb0e35badabc40fb9904a4fbde8e713840550aac07868b62f8ca473f5f17581a3855e85328bb0dd1365e4d4a94aff384891721f0900000000000000000000000000000000000000000000000000000000000000402e7d9e3917e8cfe809f33a475ac760e816632b79d65bf10eab162b9fbcad38666131061077dd3c36e3b55520f545e544fe3203b0e9cac7e99dd278778f9e22d6';
      const expectedSignatureCount = 3;
      const expectedIndices = [0, 1, 2]; // No empty signatures
      const expectedSig0HexR =
        'd764881a3e99000dfc55377cdf7601047d071c0c491def1d79631504f07c9218';
      const expectedSig0HexS =
        '20614bf96eefec3511967d9a3abaa14656440af089a018d0d641c329cc3a1010';

      const result = parseSignaturesFromProof(proof);

      // Check signature count
      expect(result.signatures).toHaveLength(expectedSignatureCount);
      expect(result.indices).toHaveLength(expectedSignatureCount);

      // Check indices
      expect(result.indices.map((bn) => bn.toNumber())).toEqual(
        expectedIndices,
      );

      // Check each signature
      result.signatures.forEach((sig) => {
        expect(sig).toBeInstanceOf(Uint8Array);
        expect(sig.length).toBe(64);
      });

      // Deep check first signature's R and S against expected hex
      const sig0Buffer = Buffer.from(result.signatures[0]);
      expect(sig0Buffer.slice(0, 32).toString('hex')).toBe(expectedSig0HexR);
      expect(sig0Buffer.slice(32, 64).toString('hex')).toBe(expectedSig0HexS);
    });

    // Test Case 2: Valid signatures where third signature has shorter S component (handled by padding in Go)
    it('should parse signatures with shorter S component correctly', () => {
      // From Go test: "valid signatures where third signature has shorter S component"
      const proof =
        '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000040679fd5f9f59ebef9cc5fa294120918d8d79f83e8842648045fe7ad70c00f7e28566cd9b7e9b779695e72fbc7dfa30e58fc04e6080df30d40f3004f1b680a6d280000000000000000000000000000000000000000000000000000000000000040308488d459d012c961a80442db5c9c8a22b8cef77b9ddc08a6a694d90ab8ca7365ffc4b65e0ab4757f1b032065833d46067c67d44b4cbaff9233c9004b1922df000000000000000000000000000000000000000000000000000000000000004000c2fd2088a70ffb18af3844e0a67a03f19653f8e791db18ce8ed9815b999cee5c6b2c00959696ff0c026809ad108725b3b0e535093257e7cac3831341c6973f';
      const expectedSignatureCount = 3;
      const expectedIndices = [0, 1, 2];
      const expectedSig2HexR =
        '00c2fd2088a70ffb18af3844e0a67a03f19653f8e791db18ce8ed9815b999cee'; // Note the leading zero from padding
      const expectedSig2HexS =
        '5c6b2c00959696ff0c026809ad108725b3b0e535093257e7cac3831341c6973f';

      const result = parseSignaturesFromProof(proof);

      expect(result.signatures).toHaveLength(expectedSignatureCount);
      expect(result.indices.map((bn) => bn.toNumber())).toEqual(
        expectedIndices,
      );

      for (const sig of result.signatures) {
        expect(sig).toBeInstanceOf(Uint8Array);
        expect(sig.length).toBe(64);
      }

      // Deep check third signature's R and S against expected hex
      const sig2Buffer = Buffer.from(result.signatures[2]);
      expect(sig2Buffer.slice(0, 32).toString('hex')).toBe(expectedSig2HexR);
      expect(sig2Buffer.slice(32, 64).toString('hex')).toBe(expectedSig2HexS);
    });

    // Test Case 3: valid signatures where third signature is empty
    it('should handle empty signatures correctly', () => {
      // From Go test: "valid signatures where third signature is empty"
      const proof =
        '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000004078eb55e4d3f30bfad2687dd4e7cfb31c7b3ecdce22f22b3650552b04839efc4554cefafc7a9ca0c3b25b3da348219ed0fbecb98fd1f847b5ec7fa0517276c2690000000000000000000000000000000000000000000000000000000000000040e1532b5ce0205023da78758a286f87e77f4df9935f47ab87a56df162c6973f7072fca0f5e712ba520ae226f6c2c647bfc787c9a70bf5ca73b6bff9472ace4f1100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407e6e5cb00fd8ada534e3f296b767ecce3f0c23b0a86d9459ea8406a6311e3ef12a81840fbf89bb95b5483e5f28c7679ebaff3f8022fdd9ab862707f10ed80bb6';
      const expectedSignatureCount = 3; // 3 non-empty signatures expected
      const expectedIndices = [0, 1, 3]; // Empty signature at original index 2 is skipped
      const expectedSig0HexR =
        '78eb55e4d3f30bfad2687dd4e7cfb31c7b3ecdce22f22b3650552b04839efc45';
      const expectedSig2HexR =
        '7e6e5cb00fd8ada534e3f296b767ecce3f0c23b0a86d9459ea8406a6311e3ef1'; // This is the 4th original sig (index 3)

      const result = parseSignaturesFromProof(proof);

      expect(result.signatures).toHaveLength(expectedSignatureCount);
      expect(result.indices.map((bn) => bn.toNumber())).toEqual(
        expectedIndices,
      );

      for (const sig of result.signatures) {
        expect(sig).toBeInstanceOf(Uint8Array);
        expect(sig.length).toBe(64);
      }

      // Check R components of the first and last valid signatures
      const sig0Buffer = Buffer.from(result.signatures[0]);
      expect(sig0Buffer.slice(0, 32).toString('hex')).toBe(expectedSig0HexR);

      const sig2Buffer = Buffer.from(result.signatures[2]); // The 3rd *valid* signature
      expect(sig2Buffer.slice(0, 32).toString('hex')).toBe(expectedSig2HexR);
    });

    // Edge Cases
    it('should handle empty string input', () => {
      const result = parseSignaturesFromProof('');
      expect(result.signatures).toHaveLength(0);
      expect(result.indices).toHaveLength(0);
    });

    it("should handle '0x' input", () => {
      const result = parseSignaturesFromProof('0x');
      expect(result.signatures).toHaveLength(0);
      expect(result.indices).toHaveLength(0);
    });

    it('should handle null input', () => {
      const result = parseSignaturesFromProof(null);
      expect(result.signatures).toHaveLength(0);
      expect(result.indices).toHaveLength(0);
    });

    it('should handle undefined input', () => {
      const result = parseSignaturesFromProof(undefined);
      expect(result.signatures).toHaveLength(0);
      expect(result.indices).toHaveLength(0);
    });

    it('should handle invalid hex input gracefully', () => {
      const result = parseSignaturesFromProof('0xinvalidhexstring');
      // parseInt will return NaN, function should return empty
      expect(result.signatures).toHaveLength(0);
      expect(result.indices).toHaveLength(0);
    });

    it('should handle incorrectly ABI encoded data gracefully', () => {
      const result = parseSignaturesFromProof(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ); // Enough length but invalid structure
      // Should likely fail on parseInt or slicing and return empty
      expect(result.signatures).toHaveLength(0);
      expect(result.indices).toHaveLength(0);
    });
  });
});
