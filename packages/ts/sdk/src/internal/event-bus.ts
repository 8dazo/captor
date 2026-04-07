import type { CaptarEvent } from "@captar/types";

type Listener = (event: CaptarEvent) => void | Promise<void>;

export class EventBus {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async emit(event: CaptarEvent): Promise<void> {
    for (const listener of this.listeners) {
      await listener(event);
    }
  }
}
