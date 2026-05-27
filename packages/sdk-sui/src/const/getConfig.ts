import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';

interface IConfig {
  mint: {
    target: `0x${string}::treasury::mint_v2`;
    denyList: `0x${string}`;
  };
  redeem: {
    target: `0x${string}::treasury::redeem`;
  };
  LBTC: `0x${string}::lbtc::LBTC`;
  treasuryAddress: `0x${string}`;
  consortiumAddress: `0x${string}`;
  bascule: `0x${string}`;
}

// https://github.com/lombard-finance/sui-contracts/blob/main/staging.json
const stageConfig: IConfig = {
  mint: {
    target:
      // lbtc_v2_current
      '0x1269ce3b46b5647d0e46024185dd24bdb7492ec7840ebc40fdd209150b89a33d::treasury::mint_v2',
    denyList: '0x403',
  },
  redeem: {
    // lbtc_v2_current
    target:
      '0x1269ce3b46b5647d0e46024185dd24bdb7492ec7840ebc40fdd209150b89a33d::treasury::redeem',
  },
  // lbtc_v1_deprecated - This is intentional
  LBTC: '0x2d66430a27565b912f21be970e5ae1e8c0359f0b518c3235b751c75976791ce0::lbtc::LBTC',
  // objects.treasury
  treasuryAddress:
    '0xf9621182bf6af94142e81f5c268d1a959991df2766a5b0755c528b70e5b33531',
  // objects.consortium
  consortiumAddress:
    '0xd8a7bff969c0f7069ccda1601516fc93013d8c06835646f718d7d345409340cc',
  // objects.bascule
  bascule: '0x61cf6760a04f4af6938543e1e9c0b84f7b271cf9069f0cb6c8017093fd814c68',
} as const;

// https://github.com/lombard-finance/sui-contracts/blob/main/gastald.json
const testnetConfig: IConfig = {
  mint: {
    // lbtc_v2_current
    target:
      '0xbe409fa89cd3eedbe426fdae9c53a231f2fff9dc66c3ca797163b5b5b2aba977::treasury::mint_v2',
    denyList: '0x403',
  },
  redeem: {
    // lbtc_v2_current
    target:
      '0xbe409fa89cd3eedbe426fdae9c53a231f2fff9dc66c3ca797163b5b5b2aba977::treasury::redeem',
  },
  // lbtc_v1_deprecated - This is intentional
  LBTC: '0x50454d0b0fbad1288a6ab74f2e8ce0905a3317870673ab7787ebcf6f322b45fa::lbtc::LBTC',
  // objects.treasury
  treasuryAddress:
    '0xc8f3d6d596ed86012a289166400d3650d9f888f612bf9c35b0cde7bc1b053408',
  // objects.consortium
  consortiumAddress:
    '0x5d0922bfc25cd4babc76e7e320b0e9b4d4950408bae9632a5fedf2a1f8dc29dc',
  // objects.bascule
  bascule: '0xd8b1c1f9b893330180fa1fc52a316461a5fabd258fa15633e9a5ba5da71af49e',
} as const;

// https://github.com/lombard-finance/sui-contracts/blob/main/mainnet.json
const prodConfig: IConfig = {
  mint: {
    // lbtc_v2_current
    target:
      '0x818430a456ff977f7320f78650d19801f90758d200a01dd3c2c679472c521357::treasury::mint_v2',
    denyList: '0x403',
  },
  redeem: {
    // lbtc_v2_current
    target:
      '0x818430a456ff977f7320f78650d19801f90758d200a01dd3c2c679472c521357::treasury::redeem',
  },
  // lbtc_v1_deprecated - This is intentional
  LBTC: '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC',
  // objects.treasury
  treasuryAddress:
    '0x1adadbca040f368abd554ac55e7c216ea6df2ff891fc647f037d66669661584a',
  // objects.consortium
  consortiumAddress:
    '0x9f68fe752d0879d615415e39207f0363a6fc8e0b3b335e976f5f18b31f55faf3',
  // objects.bascule
  bascule: '0x138938cb496cf0900be970dde1407d86497b8c69182cb5aa22dc4767c92bedcc',
} as const;

export function getConfig(env: Env = DEFAULT_ENV): typeof prodConfig {
  switch (env) {
    case Env.prod:
      return prodConfig;
    case Env.testnet:
      return testnetConfig;
    default:
      return stageConfig;
  }
}
