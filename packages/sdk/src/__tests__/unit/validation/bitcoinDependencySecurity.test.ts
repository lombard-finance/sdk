import { Block, payments, Psbt, Transaction } from 'bitcoinjs-lib';
import { describe, expect, it, vi } from 'vitest';

function transaction(value: number) {
  const tx = new Transaction();
  tx.addInput(Buffer.alloc(32, value), 0);
  tx.addOutput(Buffer.from([0x51]), 1_000 + value);
  return tx;
}

describe('BitcoinJS security patches', () => {
  it.each([
    [3, 1],
    [6, 2],
    [12, 4],
  ])(
    'rejects duplicated transaction subtrees (%i transactions)',
    (count, copies) => {
      const transactions = Array.from({ length: count }, (_, i) =>
        transaction(i + 1),
      );
      const block = new Block();
      block.transactions = transactions;
      block.merkleRoot = Block.calculateMerkleRoot(transactions);
      expect(block.checkTxRoots()).toBe(true);

      block.transactions = [...transactions, ...transactions.slice(-copies)];
      expect(Block.calculateMerkleRoot(block.transactions)).toEqual(
        block.merkleRoot,
      );
      expect(block.checkTxRoots()).toBe(false);
    },
  );

  it.each([0x00000000, 0x1d80ffff, 0x23000001])(
    'rejects an invalid compact proof-of-work target (%i)',
    (bits) => {
      const block = new Block();
      block.bits = bits;
      vi.spyOn(block, 'getHash').mockReturnValue(Buffer.alloc(32));
      expect(block.checkProofOfWork()).toBe(false);
    },
  );

  const pubkey = Buffer.from(
    '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    'hex',
  );
  const script = payments.p2wpkh({ pubkey }).output!;

  function psbt() {
    const parent = new Transaction();
    parent.addInput(Buffer.alloc(32, 1), 0);
    parent.addOutput(script, 10_000);
    return new Psbt()
      .addInput({
        hash: parent.getHash(),
        index: 0,
        nonWitnessUtxo: parent.toBuffer(),
      })
      .addOutput({ script, value: 9_000 });
  }

  it('rejects conflicting witness and non-witness UTXO amounts after a round trip', () => {
    const input = psbt().updateInput(0, {
      witnessUtxo: { script, value: 10_001 },
    });
    const parsed = Psbt.fromBuffer(input.toBuffer());
    expect(() => parsed.getInputType(0)).toThrow(
      /doesn't match the non-witness UTXO/,
    );
  });

  it('rejects conflicting witness and non-witness UTXO scripts', () => {
    const input = psbt().updateInput(0, {
      witnessUtxo: { script: Buffer.from([0x51]), value: 10_000 },
    });
    expect(() => input.getInputType(0)).toThrow(
      /doesn't match the non-witness UTXO/,
    );
  });

  it('preserves matching witness and non-witness UTXOs', () => {
    const input = psbt().updateInput(0, {
      witnessUtxo: { script, value: 10_000 },
      finalScriptWitness: Buffer.from([0]),
    });
    expect(input.getFee()).toBe(1_000);
  });

  it('invalidates cached fees after a conflicting UTXO is added', () => {
    const input = psbt().updateInput(0, {
      finalScriptWitness: Buffer.from([0]),
    });
    expect(input.getFee()).toBe(1_000);
    input.updateInput(0, { witnessUtxo: { script, value: 10_001 } });
    expect(() => input.getFee()).toThrow(/doesn't match the non-witness UTXO/);
  });
});
