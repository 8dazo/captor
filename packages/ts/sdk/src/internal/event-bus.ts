import type { CaptarEvent } from "@captar/types";

type Listener = (event: CaptarEvent) => void | Promise<void>;

export class EventBus {
  private readonly listeners = new Set<Listener>();
  private readonly listenerErrors: unknown[] = [];

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async emit(event: CaptarEvent): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await listener(event);
      } catch (error) {
        // User telemetry listeners are observability hooks, not part of provider
        // execution semantics. Keep dispatching remaining listeners and retain a
        // diagnostic record rather than failing the model/tool call.
        this.listenerErrors.push(error);
      }
    }
  }

  getListenerErrors(): readonly unknown[] {
    return this.listenerErrors;
  }
}
