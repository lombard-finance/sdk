import { Env } from '@lombard.finance/sdk-common';
import { ArgTypes } from 'storybook/internal/types';
import { ChainId } from '../common/chains';
import { Token } from '../tokens/token-addresses';

export const chainSelector: Partial<ArgTypes> = {
  chainId: {
    mapping: ChainId,
    options: Object.keys(ChainId),
    control: { type: 'select' },
  },
};

export const envSelector: Partial<ArgTypes> = {
  env: {
    mapping: Env,
    options: Object.keys(Env),
    control: { type: 'select' },
  },
};

export const makeTokenSelector = (
  tokens?: Token[],
  fieldName = 'token',
): Partial<ArgTypes> => ({
  [fieldName]: {
    mapping: Token,
    options: Object.keys(Token).filter(tk => {
      if (!tokens) return true;

      const entries = Object.entries(Token);
      const keys = tokens.map(tv => entries.find(([, v]) => v === tv)?.[0]);
      return keys.includes(tk);
    }),
    control: { type: 'select' },
  },
});
