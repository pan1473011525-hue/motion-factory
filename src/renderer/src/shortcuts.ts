export type ShortcutCommandId =
  | "toggle-playback"
  | "previous-frame"
  | "next-frame"
  | "timeline-start"
  | "timeline-end"
  | "add-marker"
  | "add-segment"
  | "duplicate-layer"
  | "delete-layer"
  | "ripple-delete"
  | "save-project"
  | "undo"
  | "redo"
  | "nudge-left"
  | "nudge-right"
  | "nudge-up"
  | "nudge-down"
  | "nudge-left-large"
  | "nudge-right-large"
  | "nudge-up-large"
  | "nudge-down-large";

export type ShortcutBindingMap = Record<ShortcutCommandId, string[]>;

export const SHORTCUT_COMMANDS: ReadonlyArray<{id: ShortcutCommandId; label: string; group: "播放" | "时间线" | "编辑" | "项目" | "画布"; composerOnly?: boolean}> = [
  {id: "toggle-playback", label: "播放 / 暂停", group: "播放"},
  {id: "previous-frame", label: "上一帧", group: "播放"},
  {id: "next-frame", label: "下一帧", group: "播放"},
  {id: "timeline-start", label: "时间线开头", group: "播放"},
  {id: "timeline-end", label: "时间线结尾", group: "播放"},
  {id: "add-marker", label: "添加标记", group: "时间线", composerOnly: true},
  {id: "add-segment", label: "添加导出分段点", group: "时间线", composerOnly: true},
  {id: "duplicate-layer", label: "复制图层", group: "编辑", composerOnly: true},
  {id: "delete-layer", label: "删除图层", group: "编辑", composerOnly: true},
  {id: "ripple-delete", label: "波纹删除", group: "编辑", composerOnly: true},
  {id: "save-project", label: "保存项目", group: "项目"},
  {id: "undo", label: "撤销", group: "项目"},
  {id: "redo", label: "重做", group: "项目"},
  {id: "nudge-left", label: "组件左移", group: "画布", composerOnly: true},
  {id: "nudge-right", label: "组件右移", group: "画布", composerOnly: true},
  {id: "nudge-up", label: "组件上移", group: "画布", composerOnly: true},
  {id: "nudge-down", label: "组件下移", group: "画布", composerOnly: true},
  {id: "nudge-left-large", label: "组件大步左移", group: "画布", composerOnly: true},
  {id: "nudge-right-large", label: "组件大步右移", group: "画布", composerOnly: true},
  {id: "nudge-up-large", label: "组件大步上移", group: "画布", composerOnly: true},
  {id: "nudge-down-large", label: "组件大步下移", group: "画布", composerOnly: true},
];

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindingMap = {
  "toggle-playback": ["Space"],
  "previous-frame": ["ArrowLeft"],
  "next-frame": ["ArrowRight"],
  "timeline-start": ["Meta+ArrowLeft"],
  "timeline-end": ["Meta+ArrowRight"],
  "add-marker": ["M"],
  "add-segment": ["Shift+M"],
  "duplicate-layer": ["Meta+D"],
  "delete-layer": ["Delete", "Backspace"],
  "ripple-delete": ["Shift+Delete"],
  "save-project": ["Meta+S"],
  undo: ["Meta+Z"],
  redo: ["Meta+Shift+Z"],
  "nudge-left": ["Alt+ArrowLeft"],
  "nudge-right": ["Alt+ArrowRight"],
  "nudge-up": ["Alt+ArrowUp"],
  "nudge-down": ["Alt+ArrowDown"],
  "nudge-left-large": ["Alt+Shift+ArrowLeft"],
  "nudge-right-large": ["Alt+Shift+ArrowRight"],
  "nudge-up-large": ["Alt+Shift+ArrowUp"],
  "nudge-down-large": ["Alt+Shift+ArrowDown"],
};

const keyFromCode = (code: string): string => code.startsWith("Key") ? code.slice(3) : code.startsWith("Digit") ? code.slice(5) : code;

export const keyboardEventToChord = (event: Pick<KeyboardEvent, "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">): string | null => {
  if (["MetaLeft", "MetaRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "ShiftLeft", "ShiftRight"].includes(event.code)) return null;
  const parts: string[] = [];
  if (event.metaKey) parts.push("Meta");
  if (event.ctrlKey) parts.push("Control");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(keyFromCode(event.code));
  return parts.join("+");
};

export const findShortcutCommand = (event: KeyboardEvent, bindings: ShortcutBindingMap): ShortcutCommandId | null => {
  const chord = keyboardEventToChord(event);
  if (!chord) return null;
  return SHORTCUT_COMMANDS.find((command) => bindings[command.id].includes(chord))?.id ?? null;
};

export const shortcutConflicts = (bindings: ShortcutBindingMap, commandId: ShortcutCommandId, chord: string): ShortcutCommandId | null =>
  SHORTCUT_COMMANDS.find((command) => command.id !== commandId && bindings[command.id].includes(chord))?.id ?? null;

export const isEditableShortcutTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));

export const mergeShortcutBindings = (value: unknown): ShortcutBindingMap => {
  if (typeof value !== "object" || value === null) return structuredClone(DEFAULT_SHORTCUT_BINDINGS);
  const source = value as Partial<Record<ShortcutCommandId, unknown>>;
  return Object.fromEntries(SHORTCUT_COMMANDS.map((command) => {
    const stored = source[command.id];
    return [command.id, Array.isArray(stored) && stored.every((item) => typeof item === "string") ? stored : DEFAULT_SHORTCUT_BINDINGS[command.id]];
  })) as ShortcutBindingMap;
};

export const formatShortcut = (chord: string): string => chord.replace("Meta", "⌘").replace("Control", "⌃").replace("Alt", "⌥").replace("Shift", "⇧").replaceAll("+", "").replace("ArrowLeft", "←").replace("ArrowRight", "→").replace("ArrowUp", "↑").replace("ArrowDown", "↓").replace("Space", "空格").replace("Backspace", "退格").replace("Delete", "删除");
