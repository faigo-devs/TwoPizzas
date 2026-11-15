import type { ClientAction, ErrorCode, Framework, PlayerView } from '../../core/index.ts';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

export type TransportKind = 'remote' | 'local';

export type FailureCode = ErrorCode | 'network';

/**
 * What a transport tells the store: its status, each new view, an error code and the seat once it is known.
 */
export interface TransportHandlers {
  onStatus(status: ConnectionStatus): void;
  onView(view: PlayerView): void;
  onError(code: FailureCode, fatal: boolean): void;
}

/**
 * The interface the store drives: the remote room over a socket and the local room in the browser both implement it.
 */
export interface Transport {
  readonly kind: TransportKind;
  start(): void;
  send(action: ClientAction): void;
  close(): void;
  skip?(): void;
}

export interface TransportOptions {
  framework: Framework;
  handlers: TransportHandlers;
}
