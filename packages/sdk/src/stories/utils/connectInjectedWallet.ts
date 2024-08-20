type TEip1559Provider = any;

export async function connectInjectedWallet(): Promise<TEip1559Provider> {
  const { ethereum } = window as any;
  if (!ethereum) {
    throw new Error('Ethereum object not found');
  }

  await ethereum.enable();

  return ethereum;
}
