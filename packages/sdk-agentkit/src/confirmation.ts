/**
 * The gate between a tool call and a transaction.
 *
 * Every write action here signs or sends as soon as it is invoked, and what
 * invokes it is a model reading text. Some of that text is not the operator's:
 * a token symbol, a memo, an address label or an error string relayed from an
 * upstream service all reach the model, and a tool call is indistinguishable
 * from an instruction once it has been made.
 *
 * So the provider asks before it moves funds. The decision belongs to the
 * integrator, not to this package, which is why there is no default that
 * quietly approves.
 */

/** What is about to happen, in the terms a person would approve it in. */
export interface WriteConfirmationRequest {
  /** The action's tool name, e.g. `unstake_lbtc_to_btc`. */
  action: string;
  /** Chain the transaction goes to. */
  chainId: number;
  /** The account that signs and pays. */
  account: string;
  /** Human-readable amount, as the caller gave it, when the action has one. */
  amount?: string;
  /** The asset moving out of the account. */
  assetIn?: string;
  /** The asset expected back. */
  assetOut?: string;
  /**
   * Where the funds land, when it is not the signing account. This is the
   * field worth reading twice: on the BTC output route it is a Bitcoin address
   * supplied as a tool argument.
   */
  recipient?: string;
  /** Anything else the action wants shown, e.g. a deposit transaction hash. */
  details?: Record<string, unknown>;
}

/**
 * Decides whether a write may proceed. Return false, or throw, to stop it.
 *
 * Runs before the action signs anything at all, including the fee
 * authorisation some chains require, so declining leaves nothing behind.
 */
export type ConfirmWrite = (
  request: WriteConfirmationRequest,
) => boolean | Promise<boolean>;

export interface LombardActionProviderOptions {
  /**
   * Called before every write action. Wire it to whatever the operator
   * actually sees — a terminal prompt, a Slack approval, a signing UI.
   */
  confirmWrite?: ConfirmWrite;
  /**
   * Runs writes with no confirmation at all.
   *
   * For a wallet that is expected to move funds unattended and is funded
   * accordingly. Prompt-injected text reaching the model is then enough to
   * move whatever the key holds, so it is opt-in and named plainly rather
   * than being the default.
   */
  autoApproveWrites?: boolean;
}

/** Why a write did not go ahead. */
export type WriteRefusal =
  | { kind: 'unconfigured'; message: string }
  | { kind: 'declined'; message: string };

/**
 * Applies the configured policy to one pending write.
 *
 * @returns `null` when the write may proceed, otherwise the refusal to report.
 */
export async function checkWriteAllowed(
  options: LombardActionProviderOptions,
  request: WriteConfirmationRequest,
): Promise<WriteRefusal | null> {
  if (options.autoApproveWrites) {
    return null;
  }

  if (!options.confirmWrite) {
    return {
      kind: 'unconfigured',
      message:
        `${request.action} moves funds and no confirmation is configured. ` +
        `Pass confirmWrite to lombardActionProvider() to approve writes as ` +
        `they happen, or autoApproveWrites: true to run them unattended.`,
    };
  }

  const approved = await options.confirmWrite(request);
  if (approved) {
    return null;
  }

  return {
    kind: 'declined',
    message: `${request.action} was not approved, so nothing was signed or sent.`,
  };
}
