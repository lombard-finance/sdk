// Default imports: a namespace import of a JSON array is a module object
// (`{ default: [...] }`) in the bundle, not the ABI array viem expects.
import SILO_VAULT_SPENDER_ABI from './SILO_VAULT_SPENDER_ABI.json';
import VEDA_VAULT_SPENDER_ABI from './VEDA_VAULT_SPENDER_ABI.json';

export { SILO_VAULT_SPENDER_ABI, VEDA_VAULT_SPENDER_ABI };
