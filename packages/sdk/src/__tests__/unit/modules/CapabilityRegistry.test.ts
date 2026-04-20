import { Env } from '@lombard.finance/sdk-common';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import { LombardConfig } from '../../../config/types';
import { CapabilityRegistry } from '../../../modules/CapabilityRegistry';

// Mock config
const mockConfig: LombardConfig = {
  env: Env.testnet,
  providers: {},
  modules: [],
};

// Mock module
const mockModule = {
  id: 'test-module',
  register: vi.fn().mockReturnValue('service-instance'),
};

describe('CapabilityRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require registered capabilities', () => {
    const registry = new CapabilityRegistry([mockModule], mockConfig);
    
    const service = registry.require('test-module');
    expect(service).toBe('service-instance');
    expect(mockModule.register).toHaveBeenCalled();
  });

  it('should throw for unregistered capabilities', () => {
    const registry = new CapabilityRegistry([], mockConfig);
    
    expect(() => registry.require('test-module')).toThrow(/not registered/);
  });

  it('should return null for optional missing capabilities', () => {
    const registry = new CapabilityRegistry([], mockConfig);
    
    const service = registry.optional('test-module');
    expect(service).toBeNull();
  });

  it('should cache service instances', () => {
    const registry = new CapabilityRegistry([mockModule], mockConfig);
    
    registry.require('test-module');
    registry.require('test-module');
    
    expect(mockModule.register).toHaveBeenCalledTimes(1);
  });
});

