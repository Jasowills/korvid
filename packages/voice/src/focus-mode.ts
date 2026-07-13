import { EventEmitter } from "node:events";

export interface HeldItem {
  id: string;
  type: "reminder" | "suggestion" | "notification" | "status";
  message: string;
  priority: number;
  createdAt: number;
  originalScheduledAt?: number;
}

export interface FocusMode {
  isActive(): boolean;
  activate(options?: { durationMs?: number; reason?: string }): void;
  deactivate(): HeldItem[];
  getHeldItems(): HeldItem[];
  holdItem(item: Omit<HeldItem, "id" | "createdAt">): void;
  isSuppressed(itemType: string): boolean;
  onStateChange(cb: (active: boolean) => void): void;
}

export function createFocusMode(): FocusMode {
  const emitter = new EventEmitter();
  let active = false;
  let activatedAt = 0;
  let deactivateTimer: ReturnType<typeof setTimeout> | null = null;
  const heldItems: HeldItem[] = [];
  let idCounter = 0;

  function genId(): string {
    return `held-${Date.now()}-${(idCounter++).toString(36)}`;
  }

  function activate(options?: { durationMs?: number; reason?: string }) {
    active = true;
    activatedAt = Date.now();
    console.log(`[focus] Lockdown activated${options?.reason ? `: ${options.reason}` : ""}`);

    if (options?.durationMs) {
      if (deactivateTimer) clearTimeout(deactivateTimer);
      deactivateTimer = setTimeout(() => {
        console.log(`[focus] Lockdown auto-deactivated after ${options.durationMs}ms`);
        deactivate();
      }, options.durationMs);
    }

    emitter.emit("stateChange", true);
  }

  function deactivate(): HeldItem[] {
    active = false;
    if (deactivateTimer) {
      clearTimeout(deactivateTimer);
      deactivateTimer = null;
    }

    const items = [...heldItems];
    heldItems.length = 0;
    console.log(`[focus] Lockdown deactivated, surfacing ${items.length} held items`);

    emitter.emit("stateChange", false);
    return items;
  }

  function holdItem(item: Omit<HeldItem, "id" | "createdAt">) {
    if (!active) return;

    heldItems.push({
      ...item,
      id: genId(),
      createdAt: Date.now(),
    });
    console.log(`[focus] Held item: ${item.message.slice(0, 50)}`);
  }

  function isSuppressed(itemType: string): boolean {
    if (!active) return false;
    // Direct requests are never suppressed
    if (itemType === "direct_request") return false;
    // Urgent items are never suppressed
    if (itemType === "urgent") return false;
    return true;
  }

  return {
    isActive: () => active,
    activate,
    deactivate,
    getHeldItems: () => [...heldItems],
    holdItem,
    isSuppressed,
    onStateChange: (cb) => emitter.on("stateChange", cb),
  };
}
