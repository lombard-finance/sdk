/**
 * Monitoring Utilities
 *
 * @module shared/monitoring
 */

export {
  createPollingMonitor,
  type DepositInfo,
  monitorDeposit,
  type MonitorOptions,
  type MonitorProgress,
  type NetworkMode,
} from './depositMonitor';

// Re-export existing utilities
export {
  createEventEmitter,
  type EventEmitter,
  type EventHandler,
} from './createEventEmitter';
export {
  createProgressEmitter,
  type ProgressEmitter,
} from './createProgressEmitter';
