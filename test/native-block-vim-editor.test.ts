import { CURSOR_MARKER } from "@earendil-works/pi-tui";
import { expect, test } from "bun:test";

import { createVimConfigPlan, DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { CURSOR_BLOCK_START } from "../src/render.ts";
import {
  NativeBlockVimEditor,
  stripSoftwareBlockCursor,
} from "../src/native-block-vim-editor.ts";

const editorTheme = {
  borderColor: (text: string) => text,
  selectList: {
    selectedText: (text: string) => text,
    description: (text: string) => text,
    noMatch: (text: string) => text,
    scrollInfo: (text: string) => text,
  },
} as any;

const editorKeybindings = {
  matches() {
    return false;
  },
  getKeys() {
    return [];
  },
  getDefinition() {
    return { defaultKeys: [] };
  },
  getConflicts() {
    return [];
  },
} as any;

function createEditor() {
  const writes: string[] = [];
  const hardwareCursorChanges: boolean[] = [];
  let hardwareCursorVisible = false;
  const tui = {
    terminal: {
      rows: 24,
      columns: 80,
      write: (data: string) => writes.push(data),
    },
    requestRender() {},
    getShowHardwareCursor() {
      return hardwareCursorVisible;
    },
    setShowHardwareCursor(visible: boolean) {
      hardwareCursorVisible = visible;
      hardwareCursorChanges.push(visible);
    },
  } as any;
  const options = { ...DEFAULT_VIM_OPTIONS, startMode: "normal" as const };
  const plan = createVimConfigPlan(options, []);
  const editor = new NativeBlockVimEditor(tui, editorTheme, editorKeybindings, {
    plan,
    diagnostics: { warnings: [] },
  });
  editor.focused = true;
  return {
    editor,
    writes,
    hardwareCursorChanges,
    getHardwareCursorVisible: () => hardwareCursorVisible,
  };
}

test("strips both Pi and pi-vimmode software block cursor styling", () => {
  expect(
    stripSoftwareBlockCursor([`${CURSOR_MARKER}\x1b[7m \x1b[0m`]),
  ).toEqual([`${CURSOR_MARKER} `]);
  expect(
    stripSoftwareBlockCursor([`${CURSOR_MARKER}\x1b[4;7mx\x1b[0m`]),
  ).toEqual([`${CURSOR_MARKER}x`]);
});

test("focused normal mode uses only the terminal-native block cursor", () => {
  const { editor, writes, hardwareCursorChanges, getHardwareCursorVisible } = createEditor();

  const rendered = editor.render(20).join("\n");

  expect(editor.getCurrentCursorStyle()).toBe("block");
  expect(writes.at(-1)).toBe("\x1b[2 q");
  expect(getHardwareCursorVisible()).toBe(true);
  expect(hardwareCursorChanges).toEqual([true]);
  expect(rendered).toContain(CURSOR_MARKER);
  expect(rendered).not.toContain(CURSOR_BLOCK_START);
});

test("busy state keeps the existing software block fallback", () => {
  const { editor, hardwareCursorChanges, getHardwareCursorVisible } = createEditor();
  editor.render(20);

  editor.setAgentBusy(true);
  const rendered = editor.render(20).join("\n");

  expect(getHardwareCursorVisible()).toBe(false);
  expect(hardwareCursorChanges).toEqual([true, false]);
  expect(rendered).toContain(CURSOR_BLOCK_START);
});
