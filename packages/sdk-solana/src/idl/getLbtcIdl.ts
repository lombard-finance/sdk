import { getConfig, networkToEnv } from "../const/getConfig";
import { SolanaNetwork } from "../types";
import { Lbtc } from "./lbtc";
import lbtcIdl from "./lbtc.json";

export const getLbtcIdl = (network: SolanaNetwork) => {
  const config = getConfig(networkToEnv[network]);
  const programIdl = {
    ...lbtcIdl,
    address: config.lbtcProgramId,
  } as unknown as Lbtc;
  return programIdl;
};
