export const ERROR_COIN_METADATA_NOT_FUND = new Error(
  'Coin Metadata could not be found.',
);
export const ERROR_NOT_ENOUGH_BALANCE = new Error('Not enough balance.');
export const ERROR_ADDRESS_BALANCE_NEEDS_SIGN_TRANSACTION = new Error(
  'The address balance cannot be spent through sui:signTransactionBlock. Use a wallet the SDK signs through sui:signTransaction.',
);
