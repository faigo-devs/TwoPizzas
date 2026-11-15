import type { MergeRule } from '../types.ts';

export const ReviewSettings: readonly (readonly [string, readonly string[]])[] = [
  ['request_timeout', ['15s', '30s', '45s', '60s']],
  ['retries', ['2', '3', '5']],
  ['rate_limit', ['60', '120', '240']],
  ['port', ['8080', '8443', '9090']],
  ['log_level', ['short', 'detailed', 'off']],
  ['cache', ['on', 'off']],
  ['environment', ['test', 'staging', 'production']],
  ['version', ['2.3.9', '2.4.0', '2.4.1']],
  ['max_connections', ['20', '50', '100']],
  ['backup', ['daily', 'weekly', 'monthly']],
  ['compression', ['on', 'off']],
  ['session_expiry', ['15m', '30m', '60m']],
  ['batch_size', ['100', '250', '500']],
  ['worker_threads', ['4', '8', '16']],
  ['tls', ['on', 'off']],
  ['queue_depth', ['100', '500', '1000']],
];

export const Components: readonly string[] = [
  'database',
  'auth',
  'api',
  'queue',
  'cache',
  'web',
  'workers',
  'monitoring',
];

export const Indicators: readonly (readonly [string, readonly [string, string]])[] = [
  ['errors', ['low', 'high']],
  ['memory', ['free', 'full']],
  ['queue', ['empty', 'full']],
  ['latency', ['normal', 'high']],
  ['disk', ['free', 'full']],
  ['traffic', ['usual', 'double']],
];

export const Actions: readonly string[] = [
  'restart_workers',
  'roll_back_release',
  'add_instance',
  'flush_cache',
  'free_disk_space',
  'notify_and_wait',
  'rotate_credentials',
  'scale_down',
];

export const MergeSettings: readonly (readonly [string, readonly number[]])[] = [
  ['request_timeout', [15, 30, 45, 60, 90]],
  ['retries', [2, 3, 4, 5, 6]],
  ['rate_limit', [60, 120, 180, 240, 300]],
  ['max_connections', [20, 40, 50, 80, 100]],
  ['batch_size', [100, 200, 250, 400, 500]],
  ['session_expiry', [15, 20, 30, 45, 60]],
  ['worker_threads', [2, 4, 8, 12, 16]],
  ['port', [8080, 8081, 8443, 9000, 9090]],
  ['queue_depth', [100, 200, 500, 800, 1000]],
  ['cache_ttl', [30, 60, 120, 300, 600]],
];

export const MergeRules: readonly MergeRule[] = ['max', 'min', 'side_a', 'side_b'];
