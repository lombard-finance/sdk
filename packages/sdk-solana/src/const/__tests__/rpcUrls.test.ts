import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { SolanaNetwork } from '../../types/network';
import { getRpcEndpoint } from '../getConfig';
import { getRpcUrl, getWsUrl } from '../rpcUrls';

const STAGE_HOST = 'bff.stage.lombard-fi.com';
const PROD_HOST = 'bff.prod.lombard-fi.com';

describe('Solana BFF env propagation', () => {
  describe('getRpcUrl', () => {
    it('uses stage host for non-prod env on mainnet', () => {
      const url = getRpcUrl(SolanaNetwork.mainnet, Env.stage);
      expect(url).toContain(STAGE_HOST);
      expect(url).not.toContain(PROD_HOST);
      expect(url).toContain('/solana');
    });

    it('uses prod host for prod env on mainnet', () => {
      const url = getRpcUrl(SolanaNetwork.mainnet, Env.prod);
      expect(url).toContain(PROD_HOST);
      expect(url).toContain('/solana');
    });

    it('uses stage host for stage env on devnet', () => {
      const url = getRpcUrl(SolanaNetwork.devnet, Env.stage);
      expect(url).toContain(STAGE_HOST);
      expect(url).toContain('/solana_devnet');
    });
  });

  describe('getWsUrl', () => {
    it('uses stage WS host for non-prod env', () => {
      const url = getWsUrl(SolanaNetwork.mainnet, Env.stage);
      expect(url.startsWith('wss://')).toBe(true);
      expect(url).toContain(STAGE_HOST);
      expect(url).toContain('chain=solana');
    });

    it('uses prod WS host for prod env', () => {
      const url = getWsUrl(SolanaNetwork.mainnet, Env.prod);
      expect(url).toContain(PROD_HOST);
      expect(url).toContain('chain=solana');
    });

    it('builds correct devnet WS URL (regression: was using HTTP host)', () => {
      const url = getWsUrl(SolanaNetwork.devnet, Env.stage);
      expect(url.startsWith('wss://')).toBe(true);
      expect(url).toContain('chain=solana_devnet');
    });
  });

  describe('getRpcEndpoint(env)', () => {
    it('routes stage env through stage BFF + devnet segment', () => {
      const url = getRpcEndpoint(Env.stage);
      expect(url).toContain(STAGE_HOST);
      expect(url).not.toContain(PROD_HOST);
      expect(url).toContain('/solana_devnet');
    });

    it('routes prod env through prod BFF + mainnet segment', () => {
      const url = getRpcEndpoint(Env.prod);
      expect(url).toContain(PROD_HOST);
      expect(url).toContain('/solana');
    });

    it('routes dev/ibc env through stage BFF', () => {
      expect(getRpcEndpoint(Env.dev)).toContain(STAGE_HOST);
      expect(getRpcEndpoint(Env.ibc)).toContain(STAGE_HOST);
    });
  });
});
