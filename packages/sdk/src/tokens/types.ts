import { Address } from 'viem';

/**
 * Address kinds for tokens that have multiple contract addresses.
 *
 * **BTC.b Integration Architecture:**
 *
 * BTC.b on Avalanche uses a dual-contract architecture with both a token contract
 * and an adapter contract serving different purposes:
 *
 * **When to use Token vs Adapter:**
 *
 * - **Token** (`AddressKind.Token`):
 *   - Use for EIP-2612 `permit()` signatures (Stake and Bake)
 *   - Use for querying token balance, symbol, decimals
 *   - Use for standard ERC20 operations (allowance checks, balance queries)
 *   - This is the actual BTC.b ERC20 token contract
 *
 * - **Adapter** (`AddressKind.Adapter`):
 *   - Use for burn/mint/transfer operations via BridgeTokenAdapter
 *   - Use for bridge deposit/withdrawal operations
 *   - Use as spender address when approving tokens for bridge operations
 *   - This adapter serves as an intermediary between BridgeToken and both AssetRouter and Bridge
 *
 * **Important Notes:**
 *
 * 1. **Permit Signatures**: Always use `AddressKind.Token` as the `verifyingContract` in
 *    EIP-2612 permit signatures. The token contract implements the `permit()` function,
 *    not the adapter.
 *
 * 2. **Approvals**: For bridge and redemption operations, users must grant allowance to
 *    the **BridgeTokenAdapter** address, not the vault or bridge contract.
 *
 * 3. **Deposit Address**: For Ledger integration, the token address includes the adapter
 *    address when tweaking deposit addresses.
 *
 * @example
 * ```typescript
 * // For permit signatures (Stake and Bake):
 * const tokenContract = await getTokenContractInfo(
 *   Token.BTCb,
 *   ChainId.avalancheFuji,
 *   env,
 *   AddressKind.Token  // ✅ Use token address for permit
 * );
 *
 * // For bridge operations:
 * const adapterContract = await getTokenContractInfo(
 *   Token.BTCb,
 *   ChainId.avalancheFuji,
 *   env,
 *   AddressKind.Adapter  // ✅ Use adapter address for bridge
 * );
 * ```
 */
export enum AddressKind {
  /**
   * The bridge adapter contract address (BridgeTokenAdapter).
   * Used for burn/mint/transfer operations and as the spender for bridge approvals.
   */
  Adapter = 'adapter',

  /**
   * The token contract address (standard ERC20).
   * Used for permit signatures, balance queries, and standard ERC20 operations.
   */
  Token = 'token',
}

/**
 * Address structure for tokens with both token and adapter addresses.
 *
 * Currently only used by `Token.BTCb` on Avalanche chains.
 */
export type BridgeTokenAddresses = {
  /** The bridge adapter contract address (BridgeTokenAdapter) */
  [AddressKind.Adapter]: Address;
  /** The token contract address (standard ERC20) */
  [AddressKind.Token]: Address;
};
