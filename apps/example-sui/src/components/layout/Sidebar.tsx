import { Env } from '@lombard.finance/sdk';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  env: Env;
  onEnvChange: (env: Env) => void;
}

export function Sidebar({ env, onEnvChange }: SidebarProps) {
  const examples = [
    {
      id: 'staking',
      title: 'Staking',
      description: 'Stake BTC to receive LBTC on Sui',
      path: '/staking',
    },
    {
      id: 'unstaking',
      title: 'Unstaking',
      description: 'Burn LBTC on Sui to receive BTC',
      path: '/unstaking',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-primary">Sui Examples</h2>
        <p className="text-xs text-secondary mt-1">
          Interactive demonstrations
        </p>
      </div>

      <div className="p-4 border-b border-gray-200">
        <label
          htmlFor="env-select"
          className="block text-xs font-medium text-secondary mb-2"
        >
          Environment
        </label>
        <select
          id="env-select"
          value={env}
          onChange={(e) => onEnvChange(e.target.value as Env)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-capital-green bg-white"
        >
          <option value={Env.testnet}>Testnet</option>
          <option value={Env.stage}>Stage</option>
          <option value={Env.prod}>Production</option>
        </select>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {examples.map((example) => (
            <li key={example.id}>
              <NavLink
                to={example.path}
                className={({ isActive }) =>
                  `block p-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-capital-green/10 text-primary border-l-4 border-capital-green'
                      : 'text-secondary hover:bg-gray-50 hover:text-primary'
                  }`
                }
              >
                <div className="font-medium text-sm">{example.title}</div>
                <div className="text-xs mt-1 opacity-75">
                  {example.description}
                </div>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <a
          href="https://github.com/lombard-finance/sdk/tree/main/apps/example-sui"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>View on GitHub</span>
        </a>
      </div>
    </aside>
  );
}
