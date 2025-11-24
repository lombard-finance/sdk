let bitcoin: typeof import('bitcoinjs-lib');

const initBitcoin = async () => {
  const module = await import('bitcoinjs-lib');
  const ecc = await import('@bitcoinerlab/secp256k1');
  try {
    module.initEccLib(ecc);
  } catch (err) {
    if (!/already initialized/i.test(String(err))) {
      throw err;
    }
  }
  bitcoin = module;
};

void initBitcoin().catch(err => {
  // Surface initialization failures during development but swallow to avoid unhandled rejections.
  console.error('Failed to initialize bitcoinjs-lib ECC library', err);
});

export { bitcoin };
