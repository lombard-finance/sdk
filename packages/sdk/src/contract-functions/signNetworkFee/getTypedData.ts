interface IGetTypedData {
  chainId: number;
  verifyingContract: string;
  fee: string;
  expiry: number;
}

export function getTypedData({
  chainId,
  verifyingContract,
  fee,
  expiry }: IGetTypedData) {
  return {
    domain: {
      name: 'Lombard Staked Bitcoin',
      version: '1',
      chainId,
      verifyingContract },
    message: {
      chainId,
      fee,
      expiry },
    primaryType: 'feeApproval',
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      feeApproval: [
        { name: 'chainId', type: 'uint256' },
        { name: 'fee', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
      ] } };
}
