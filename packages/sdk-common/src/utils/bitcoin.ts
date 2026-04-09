let bitcoinPromise: Promise<typeof import("bitcoinjs-lib")> | null = null;

const initBitcoin = async (): Promise<typeof import("bitcoinjs-lib")> => {
  try {
    const module = await import("bitcoinjs-lib");
    const ecc = await import("@bitcoinerlab/secp256k1");
    try {
      module.initEccLib(ecc);
    } catch (err) {
      if (!/already initialized/i.test(String(err))) {
        throw err;
      }
    }
    return module;
  } catch (err) {
    // Reset promise so subsequent calls can retry
    bitcoinPromise = null;
    throw new Error(
      `Failed to initialize bitcoinjs-lib: ${err instanceof Error ? err.message : String(err)}. ` +
        "Ensure bitcoinjs-lib and @bitcoinerlab/secp256k1 peer dependencies are installed.",
    );
  }
};

export const getBitcoin = async (): Promise<typeof import("bitcoinjs-lib")> => {
  if (!bitcoinPromise) {
    bitcoinPromise = initBitcoin();
  }
  return bitcoinPromise;
};
