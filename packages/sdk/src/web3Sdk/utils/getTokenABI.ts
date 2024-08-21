import { IERC20, LBTCABI } from '../abi';

type Token = 'LBTC' | 'ERC20';

export function getTokenABI(token: Token) {
  switch (token) {
    case 'LBTC':
      return LBTCABI;
    default:
      return IERC20;
  }
}
