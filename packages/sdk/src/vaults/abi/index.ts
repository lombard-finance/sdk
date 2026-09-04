/**
 * Vault spender ABIs.
 *
 * Default imports, not `import * as`. A JSON module whose top level is an array
 * comes back from a namespace import as an object with numeric string keys and
 * no iterator, so `abi as Abi` compiled and then failed at the call with
 * `abi is not iterable`. Only the Silo registry entry consumed this barrel,
 * which is why the BTC.b deploy route was the only place it showed up —
 * `vaults/lib/config.ts` already imports the Veda ABI this way.
 */

import SILO_VAULT_SPENDER_ABI from './SILO_VAULT_SPENDER_ABI.json';
import VEDA_VAULT_SPENDER_ABI from './VEDA_VAULT_SPENDER_ABI.json';

export { SILO_VAULT_SPENDER_ABI, VEDA_VAULT_SPENDER_ABI };
