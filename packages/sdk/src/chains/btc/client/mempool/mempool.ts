export type TNetworkMode = 'mainnet' | 'testnet';

interface IApiConfig {
  mempoolApiUrl: string;
}

const stageConfig: IApiConfig = {
  mempoolApiUrl: 'https://mempool.space/signet',
};

const prodConfig: IApiConfig = {
  mempoolApiUrl: 'https://mempool.space',
};

/**
 * Returns the configuration for the Bitcoin related APIs.
 *
 * @param mode - The network mode.
 *
 * @returns The configuration.
 */
export const getBtcApiConfig = (mode: TNetworkMode): IApiConfig =>
  mode === 'mainnet' ? prodConfig : stageConfig;
