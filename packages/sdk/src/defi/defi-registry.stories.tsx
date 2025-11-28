import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP, ChainId } from '../common/chains';
import {
  DEFI_REGISTRY,
  DefiProtocol,
  DefiProtocols,
  type StakeAndBakeToken,
} from './defi-registry';

const meta = {
  title: 'registry/defiRegistry',
  component: DefiRegistryViewer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Visual explorer for the DeFi Registry. Shows which tokens are supported on which protocols, chains, and environments for stake-and-bake operations.',
      },
    },
  },
} satisfies Meta<typeof DefiRegistryViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RegistryExplorer: Story = {
  name: 'Registry Explorer',
};

function DefiRegistryViewer() {
  const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(
    new Set(),
  );
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set());
  const [filterEnv, setFilterEnv] = useState<Env | 'all'>('all');

  const toggleProtocol = (protocol: string) => {
    const newSet = new Set(expandedProtocols);
    if (newSet.has(protocol)) {
      newSet.delete(protocol);
    } else {
      newSet.add(protocol);
    }
    setExpandedProtocols(newSet);
  };

  const toggleToken = (key: string) => {
    const newSet = new Set(expandedTokens);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedTokens(newSet);
  };

  const toggleEnv = (key: string) => {
    const newSet = new Set(expandedEnvs);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedEnvs(newSet);
  };

  // Get all protocols
  const protocols = Object.keys(DEFI_REGISTRY);

  // Get tokens for selected protocol
  const getTokensForProtocol = (protocol: string) => {
    return Object.keys(DEFI_REGISTRY[protocol as DefiProtocol]);
  };

  // Get registry entries for a token
  const getEntriesForToken = (protocol: string, token: string) => {
    const tokenRegistry =
      DEFI_REGISTRY[protocol as DefiProtocol]?.[token as StakeAndBakeToken];
    if (!tokenRegistry) return [];

    const entries: Array<{
      env: Env;
      chainId: number;
      chainName: string;
      mode: 'permit' | 'approve';
      domainName: string;
      spenderAddress: string;
      amountStrategy: string;
      deadlineStrategy: string;
      nonceStrategy: string;
    }> = [];

    // Iterate through environments
    for (const env of Object.values(Env)) {
      const envRegistry = tokenRegistry[env];
      if (!envRegistry) continue;

      // Iterate through chains
      const chainEntries = Object.entries(envRegistry);
      for (const [chainId, entry] of chainEntries) {
        if (!entry.approval) continue;

        const viemChain =
          CHAIN_ID_TO_VIEM_CHAIN_MAP[Number(chainId) as ChainId];
        const chainName = viemChain?.name || `Chain ${chainId}`;

        entries.push({
          env,
          chainId: Number(chainId),
          chainName,
          mode: entry.approval.mode,
          domainName: entry.approval.domainName,
          spenderAddress: entry.spenderContract.address,
          amountStrategy: entry.amountStrategy,
          deadlineStrategy: entry.approval.deadlineStrategy,
          nonceStrategy: entry.approval.nonceStrategy,
        });
      }
    }

    return entries;
  };

  // Get summary stats
  const getSummaryStats = () => {
    let totalProtocols = 0;
    let totalTokens = 0;
    let totalConfigs = 0;
    let permitCount = 0;
    let approveCount = 0;

    for (const protocol of protocols) {
      totalProtocols++;
      const tokens = getTokensForProtocol(protocol);
      totalTokens += tokens.length;

      for (const token of tokens) {
        const entries = getEntriesForToken(protocol, token);
        totalConfigs += entries.length;
        permitCount += entries.filter(e => e.mode === 'permit').length;
        approveCount += entries.filter(e => e.mode === 'approve').length;
      }
    }

    return {
      totalProtocols,
      totalTokens,
      totalConfigs,
      permitCount,
      approveCount,
    };
  };

  const stats = getSummaryStats();

  return (
    <div className="container">
      <div className="mb-4">
        <h2>DeFi Registry Explorer</h2>
        <p className="text-muted">
          Browse all stake-and-bake configurations by protocol, token, chain,
          and environment.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Protocols</h6>
              <h3 className="card-title">{stats.totalProtocols}</h3>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Tokens</h6>
              <h3 className="card-title">{stats.totalTokens}</h3>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Configurations</h6>
              <h3 className="card-title">{stats.totalConfigs}</h3>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card border-success">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Permit Mode</h6>
              <h3 className="card-title text-success">{stats.permitCount}</h3>
              <small className="text-muted">Gasless</small>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card border-warning">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Approve Mode</h6>
              <h3 className="card-title text-warning">{stats.approveCount}</h3>
              <small className="text-muted">On-chain</small>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Filter & Expand/Collapse All */}
      <div className="row mb-3">
        <div className="col-md-6">
          <label htmlFor="envFilter" className="form-label">
            Filter by Environment:
          </label>
          <select
            id="envFilter"
            className="form-select"
            value={filterEnv}
            onChange={e => {
              setFilterEnv(e.target.value as Env | 'all');
            }}
          >
            <option value="all">All Environments</option>
            {Object.values(Env).map(env => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-6 d-flex align-items-end">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm me-2"
            onClick={() => {
              setExpandedProtocols(new Set(protocols));
              setExpandedTokens(
                new Set(
                  protocols.flatMap(p =>
                    getTokensForProtocol(p).map(t => `${p}-${t}`),
                  ),
                ),
              );
            }}
          >
            Expand All
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              setExpandedProtocols(new Set());
              setExpandedTokens(new Set());
              setExpandedEnvs(new Set());
            }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree View */}
      <div className="card">
        <div className="card-body">
          {protocols.map(protocol => {
            const isProtocolExpanded = expandedProtocols.has(protocol);
            const tokens = getTokensForProtocol(protocol);

            return (
              <div key={protocol} className="mb-2">
                {/* Protocol Level */}
                <button
                  type="button"
                  className="btn btn-link text-start w-100 text-decoration-none p-2"
                  style={{ border: '1px solid #dee2e6', borderRadius: '4px' }}
                  onClick={() => {
                    toggleProtocol(protocol);
                  }}
                >
                  <span className="me-2">
                    {isProtocolExpanded ? '▼' : '▶'}
                  </span>
                  <strong>
                    {DefiProtocols[protocol as DefiProtocol]?.name || protocol}
                  </strong>
                  <span className="badge bg-secondary ms-2">
                    {tokens.length} token{tokens.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {/* Tokens Level */}
                {isProtocolExpanded && (
                  <div className="ms-4 mt-2">
                    {tokens.map(token => {
                      const tokenKey = `${protocol}-${token}`;
                      const isTokenExpanded = expandedTokens.has(tokenKey);
                      const allEntries = getEntriesForToken(protocol, token);

                      // Group by environment
                      const envGroups = allEntries.reduce(
                        (acc, entry) => {
                          if (!acc[entry.env]) acc[entry.env] = [];
                          acc[entry.env].push(entry);
                          return acc;
                        },
                        {} as Record<
                          Env,
                          Array<ReturnType<typeof getEntriesForToken>[0]>
                        >,
                      );

                      // Filter by selected environment
                      const filteredEnvs =
                        filterEnv === 'all'
                          ? Object.keys(envGroups)
                          : Object.keys(envGroups).filter(
                              env => env === filterEnv,
                            );

                      if (filteredEnvs.length === 0) return null;

                      return (
                        <div key={tokenKey} className="mb-2">
                          {/* Token Level */}
                          <button
                            type="button"
                            className="btn btn-link text-start w-100 text-decoration-none p-2"
                            style={{
                              border: '1px solid #dee2e6',
                              borderRadius: '4px',
                              backgroundColor: '#f8f9fa',
                            }}
                            onClick={() => {
                              toggleToken(tokenKey);
                            }}
                          >
                            <span className="me-2">
                              {isTokenExpanded ? '▼' : '▶'}
                            </span>
                            <strong>{token}</strong>
                            <span className="badge bg-info ms-2">
                              {filteredEnvs.length} env
                              {filteredEnvs.length !== 1 ? 's' : ''}
                            </span>
                          </button>

                          {/* Environments Level */}
                          {isTokenExpanded && (
                            <div className="ms-4 mt-2">
                              {filteredEnvs.map(env => {
                                const envKey = `${tokenKey}-${env}`;
                                const isEnvExpanded = expandedEnvs.has(envKey);
                                const entries = envGroups[env as Env];

                                return (
                                  <div key={envKey} className="mb-2">
                                    {/* Environment Level */}
                                    <button
                                      type="button"
                                      className="btn btn-link text-start w-100 text-decoration-none p-2"
                                      style={{
                                        border: '1px solid #dee2e6',
                                        borderRadius: '4px',
                                        backgroundColor: '#e9ecef',
                                      }}
                                      onClick={() => {
                                        toggleEnv(envKey);
                                      }}
                                    >
                                      <span className="me-2">
                                        {isEnvExpanded ? '▼' : '▶'}
                                      </span>
                                      <span className="badge bg-secondary me-2">
                                        {env}
                                      </span>
                                      <span className="text-muted">
                                        {entries.length} chain
                                        {entries.length !== 1 ? 's' : ''}
                                      </span>
                                    </button>

                                    {/* Chains Level (Details) */}
                                    {isEnvExpanded && (
                                      <div className="ms-4 mt-2">
                                        {entries.map(entry => (
                                          <div
                                            key={`${entry.chainId}`}
                                            className="card mb-2"
                                          >
                                            <div className="card-body">
                                              {/* Chain Header */}
                                              <h6 className="card-title">
                                                {entry.chainName}
                                                <span className="badge bg-primary ms-2">
                                                  ID: {entry.chainId}
                                                </span>
                                                <span
                                                  className={`badge ms-2 ${
                                                    entry.mode === 'permit'
                                                      ? 'bg-success'
                                                      : 'bg-warning'
                                                  }`}
                                                >
                                                  {entry.mode.toUpperCase()}
                                                </span>
                                              </h6>

                                              {/* Details */}
                                              <div className="small">
                                                <p className="mb-1">
                                                  <strong>Domain:</strong>{' '}
                                                  <code>
                                                    {entry.domainName}
                                                  </code>
                                                </p>
                                                <p className="mb-1">
                                                  <strong>Spender:</strong>
                                                  <br />
                                                  <code className="text-break">
                                                    {entry.spenderAddress}
                                                  </code>
                                                </p>
                                                <p className="mb-1">
                                                  <strong>Amount:</strong>{' '}
                                                  <code>
                                                    {entry.amountStrategy}
                                                  </code>
                                                  {entry.amountStrategy ===
                                                    'btcToLbtc' && (
                                                    <small className="text-info ms-1">
                                                      (BTC→LBTC)
                                                    </small>
                                                  )}
                                                </p>
                                                <p className="mb-1">
                                                  <strong>Deadline:</strong>{' '}
                                                  <code>
                                                    {entry.deadlineStrategy}
                                                  </code>
                                                </p>
                                                <p className="mb-0">
                                                  <strong>Nonce:</strong>{' '}
                                                  <code>
                                                    {entry.nonceStrategy}
                                                  </code>
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="card mt-4">
        <div className="card-body">
          <h5 className="card-title">Legend</h5>
          <div className="row">
            <div className="col-md-4">
              <h6>Approval Modes:</h6>
              <ul>
                <li>
                  <span className="badge bg-success">PERMIT</span> - Off-chain
                  signature (EIP-2612). User doesn't pay gas. Backend submits
                  transaction.
                </li>
                <li>
                  <span className="badge bg-warning">APPROVE</span> - On-chain
                  transaction. User pays gas immediately.
                </li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6>Amount Strategies:</h6>
              <ul>
                <li>
                  <code>identity</code> - Use amount as-is
                </li>
                <li>
                  <code>btcToLbtc</code> - Convert BTC to LBTC using exchange
                  ratio
                </li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6>Other Strategies:</h6>
              <ul>
                <li>
                  <strong>Deadline:</strong> <code>expiry</code> (uses user
                  deadline) or <code>zero</code> (no deadline)
                </li>
                <li>
                  <strong>Nonce:</strong> <code>chain</code> (fetch from
                  contract) or <code>skip</code> (not needed)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
