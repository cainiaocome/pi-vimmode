import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { registerVimLifecycle } from "./lifecycle.ts";
import { NativeBlockVimEditor } from "./native-block-vim-editor.ts";

export { loadCurrentRelease } from "./release-notes.ts";

export default function piVimMode(pi: ExtensionAPI) {
  registerVimLifecycle(pi, {
    createEditor: (tui, theme, keybindings, configuration, vimOptions) =>
      new NativeBlockVimEditor(tui, theme, keybindings, configuration, vimOptions),
  });
}
