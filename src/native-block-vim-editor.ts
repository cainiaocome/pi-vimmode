import { CURSOR_MARKER } from "@earendil-works/pi-tui";

import type { CursorStyle } from "./types.ts";

import { VimEditor } from "./vim-editor.ts";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SOFTWARE_BLOCK_CURSOR = new RegExp(
  `${escapeRegExp(CURSOR_MARKER)}\\x1b\\[(?:4;7|7;4|7)m([\\s\\S]*?)\\x1b\\[0m`,
  "g",
);

/**
 * Remove Pi/pi-vimmode's reverse-video cursor cell while preserving the
 * zero-width cursor marker and the character under the cursor.
 */
export function stripSoftwareBlockCursor(lines: string[]): string[] {
  return lines.map((line) =>
    line.replace(
      SOFTWARE_BLOCK_CURSOR,
      (_match, cell: string) => `${CURSOR_MARKER}${cell}`,
    ),
  );
}

type HardwareCursorController = {
  getShowHardwareCursor?: () => boolean;
  setShowHardwareCursor?: (visible: boolean) => void;
};

/**
 * VimEditor normally paints block cursors as a reverse-video character cell.
 * On Pi versions that also keep the hardware cursor visible, that can render
 * as two adjacent blocks. Prefer the terminal-native block cursor whenever
 * the editor is focused and the TUI exposes hardware-cursor control.
 */
export class NativeBlockVimEditor extends VimEditor {
  private nativeCursorAgentBusy = false;

  private hardwareCursorController(): HardwareCursorController | undefined {
    return (this as unknown as { tui?: HardwareCursorController }).tui;
  }

  private useNativeBlockCursor(style: CursorStyle): boolean {
    const tui = this.hardwareCursorController();
    return (
      style === "block" &&
      this.focused === true &&
      !this.nativeCursorAgentBusy &&
      typeof tui?.setShowHardwareCursor === "function"
    );
  }

  private showHardwareCursor(): void {
    const tui = this.hardwareCursorController();
    if (typeof tui?.setShowHardwareCursor !== "function") return;
    if (typeof tui.getShowHardwareCursor === "function" && tui.getShowHardwareCursor()) return;
    tui.setShowHardwareCursor(true);
  }

  override setAgentBusy(active: boolean): void {
    this.nativeCursorAgentBusy = active;
    super.setAgentBusy(active);
  }

  override render(width: number): string[] {
    const nativeBlockCursor = this.useNativeBlockCursor(this.getCurrentCursorStyle());
    if (nativeBlockCursor) this.showHardwareCursor();

    const lines = super.render(width);
    return nativeBlockCursor ? stripSoftwareBlockCursor(lines) : lines;
  }
}
