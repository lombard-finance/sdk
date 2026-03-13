import BigNumber from 'bignumber.js';
import { describe, expect, it } from 'vitest';

import {
  ENotarizationStatus,
  ESessionState,
} from '../../../api-functions/getDepositsByAddress/getDepositsByAddress';
import { ChainId } from '../../../common/chains';
import { MIN_STAKE_AMOUNT_BTC } from '../../../common/constants';
import { getDepositStatus, MIN_CLAIM_AMOUNT_BTC } from '../../../shared/deposits';

// Minimal valid deposit factory
function makeDeposit(
  overrides: Partial<Parameters<typeof getDepositStatus>[0]> = {},
): Parameters<typeof getDepositStatus>[0] {
  return {
    isNative: false,
    txHash: '0xabc',
    eventIndex: 0,
    amount: new BigNumber(0.001),
    toChainId: ChainId.ethereum,
    sessionId: 'session-1',
    notarizationStatus: ENotarizationStatus.NOTARIZATION_STATUS_PENDING,
    sessionState: ESessionState.SESSION_STATE_PENDING,
    isClaimed: false,
    ...overrides,
  };
}

describe('getDepositStatus', () => {
  describe('priority ordering', () => {
    it('returns restricted for sanctioned deposits', () => {
      expect(getDepositStatus(makeDeposit({ sanctioned: true }))).toBe('restricted');
    });

    it('returns claimed when isClaimed is true', () => {
      expect(getDepositStatus(makeDeposit({ isClaimed: true }))).toBe('claimed');
    });

    it('returns claimed when claimTxHash is present', () => {
      expect(getDepositStatus(makeDeposit({ claimTxHash: '0xclaim' }))).toBe('claimed');
    });

    it('auto_claimed takes priority over SESSION_STATE_EXPIRED', () => {
      expect(
        getDepositStatus(
          makeDeposit({
            notarizationStatus: ENotarizationStatus.NOTARIZATION_STATUS_GMP_HANDLED,
            sessionState: ESessionState.SESSION_STATE_EXPIRED,
          }),
        ),
      ).toBe('auto_claimed');
    });

    it('too_small takes priority over SESSION_STATE_EXPIRED', () => {
      expect(
        getDepositStatus(
          makeDeposit({
            amount: new BigNumber(0.00001),
            sessionState: ESessionState.SESSION_STATE_EXPIRED,
          }),
        ),
      ).toBe('too_small');
    });

    it('failed takes priority over SESSION_STATE_EXPIRED', () => {
      expect(
        getDepositStatus(
          makeDeposit({
            notarizationStatus: ENotarizationStatus.NOTARIZATION_STATUS_FAILED,
            sessionState: ESessionState.SESSION_STATE_EXPIRED,
          }),
        ),
      ).toBe('failed');
    });

    it('returns expired when sessionState is SESSION_STATE_EXPIRED (no higher priority match)', () => {
      expect(
        getDepositStatus(
          makeDeposit({ sessionState: ESessionState.SESSION_STATE_EXPIRED }),
        ),
      ).toBe('expired');
    });
  });

  describe('notarization status checks', () => {
    it('returns auto_claimed for GMP handled deposits', () => {
      expect(
        getDepositStatus(
          makeDeposit({
            notarizationStatus: ENotarizationStatus.NOTARIZATION_STATUS_GMP_HANDLED,
          }),
        ),
      ).toBe('auto_claimed');
    });

    it('returns too_small when amount is below minimum', () => {
      expect(
        getDepositStatus(makeDeposit({ amount: new BigNumber(0.00001) })),
      ).toBe('too_small');
    });

    it('returns failed for failed notarization', () => {
      expect(
        getDepositStatus(
          makeDeposit({
            notarizationStatus: ENotarizationStatus.NOTARIZATION_STATUS_FAILED,
          }),
        ),
      ).toBe('failed');
    });

    it('returns claimable when approved with proof', () => {
      expect(
        getDepositStatus(
          makeDeposit({
            notarizationStatus: ENotarizationStatus.NOTARIZATION_STATUS_SESSION_APPROVED,
            proof: '0xproof',
            rawPayload: '0xpayload',
          }),
        ),
      ).toBe('claimable');
    });

    it('returns pending_confirmations when block height is below required', () => {
      expect(getDepositStatus(makeDeposit({ blockHeight: 100 }), 104)).toBe(
        'pending_confirmations',
      );
    });
  });
});

describe('MIN_CLAIM_AMOUNT_BTC', () => {
  it('is an alias for MIN_STAKE_AMOUNT_BTC', () => {
    expect(MIN_CLAIM_AMOUNT_BTC).toBe(MIN_STAKE_AMOUNT_BTC);
  });
});
