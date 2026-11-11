/**
 * Debug Logging Utility
 *
 * Provides namespaced logging that only outputs in development mode.
 * In production, all calls are no-ops.
 *
 * Usage:
 *   import { debug } from '@/lib/debug';
 *   debug.graph('Loading graph with', nodeCount, 'nodes');
 *   debug.auth('Session validated');
 */

const isDev = process.env.NODE_ENV === "development";

type LogFn = (...args: unknown[]) => void;

interface Debug {
  /** Graph-related operations (loading, filtering, pathfinding) */
  graph: LogFn;
  /** Authentication and session operations */
  auth: LogFn;
  /** Canvas and visualization operations */
  canvas: LogFn;
  /** API calls and responses */
  api: LogFn;
  /** Search and command operations */
  search: LogFn;
  /** General debug output */
  log: LogFn;
  /** Warnings (always logged) */
  warn: LogFn;
  /** Errors (always logged) */
  error: LogFn;
}

function createLogger(namespace: string): LogFn {
  return (...args: unknown[]) => {
    if (isDev) {
      console.log(`[${namespace}]`, ...args);
    }
  };
}

function createWarning(namespace: string): LogFn {
  return (...args: unknown[]) => {
    console.warn(`[${namespace}]`, ...args);
  };
}

function createError(namespace: string): LogFn {
  return (...args: unknown[]) => {
    console.error(`[${namespace}]`, ...args);
  };
}

export const debug: Debug = {
  graph: createLogger("Graph"),
  auth: createLogger("Auth"),
  canvas: createLogger("Canvas"),
  api: createLogger("API"),
  search: createLogger("Search"),
  log: createLogger("Debug"),
  warn: createWarning("Warning"),
  error: createError("Error"),
};

/**
 * Conditional debug logging - only runs the callback in development
 * Useful for expensive-to-compute debug info
 *
 * Usage:
 *   debugIf(() => `Found ${items.length} items: ${items.map(i => i.id).join(', ')}`);
 */
export function debugIf(
  fn: () => string,
  namespace: keyof Debug = "log",
): void {
  if (isDev) {
    debug[namespace](fn());
  }
}
