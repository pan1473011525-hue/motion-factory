import {useMemo, useState} from "react";
import {Keyboard, RotateCcw, X} from "lucide-react";
import {
  DEFAULT_SHORTCUT_BINDINGS,
  SHORTCUT_COMMANDS,
  formatShortcut,
  keyboardEventToChord,
  shortcutConflicts,
  type ShortcutBindingMap,
  type ShortcutCommandId,
} from "./shortcuts";

export const ShortcutSettings: React.FC<{
  open: boolean;
  bindings: ShortcutBindingMap;
  onClose: () => void;
  onChange: (bindings: ShortcutBindingMap) => void;
}> = ({open, bindings, onClose, onChange}) => {
  const [query, setQuery] = useState("");
  const [recording, setRecording] = useState<ShortcutCommandId | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const visible = useMemo(() => SHORTCUT_COMMANDS.filter((command) => `${command.label} ${command.group}`.toLocaleLowerCase("zh-CN").includes(query.trim().toLocaleLowerCase("zh-CN"))), [query]);
  if (!open) return null;
  return <section className="shortcut-settings-popover" aria-label="键盘快捷键设置">
    <header><div><Keyboard /><span><strong>键盘快捷键</strong><small>点击键位后直接按下新的组合键</small></span></div><button type="button" className="icon-btn" onClick={onClose} title="关闭快捷键设置" aria-label="关闭快捷键设置"><X /></button></header>
    <div className="shortcut-settings-tools"><input type="search" placeholder="搜索命令" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" onClick={() => {onChange(structuredClone(DEFAULT_SHORTCUT_BINDINGS)); setConflict(null);}}><RotateCcw />全部恢复默认</button></div>
    {conflict && <p className="shortcut-conflict" role="alert">{conflict}</p>}
    <div className="shortcut-command-list">{visible.map((command) => <div className="shortcut-command-row" key={command.id}><span><strong>{command.label}</strong><small>{command.group}{command.composerOnly ? " · 自由编排" : ""}</small></span><button type="button" className={`shortcut-recorder ${recording === command.id ? "recording" : ""}`} onClick={() => {setRecording(command.id); setConflict(null);}} onKeyDown={(event) => {
      if (recording !== command.id) return;
      event.preventDefault();
      event.stopPropagation();
      const chord = keyboardEventToChord(event.nativeEvent);
      if (!chord) return;
      const conflictId = shortcutConflicts(bindings, command.id, chord);
      if (conflictId) {
        const conflictCommand = SHORTCUT_COMMANDS.find((candidate) => candidate.id === conflictId);
        setConflict(`${formatShortcut(chord)} 已用于“${conflictCommand?.label ?? conflictId}”，请先清除冲突或使用其他组合键。`);
        return;
      }
      onChange({...bindings, [command.id]: [chord]});
      setRecording(null);
      setConflict(null);
    }}>{recording === command.id ? "请按键…" : bindings[command.id].length > 0 ? bindings[command.id].map(formatShortcut).join(" / ") : "未设置"}</button><button type="button" className="shortcut-row-reset icon-btn" disabled={bindings[command.id].join() === DEFAULT_SHORTCUT_BINDINGS[command.id].join()} onClick={() => onChange({...bindings, [command.id]: [...DEFAULT_SHORTCUT_BINDINGS[command.id]]})} title={`恢复${command.label}默认键位`} aria-label={`恢复${command.label}默认键位`}><RotateCcw /></button><button type="button" className="shortcut-row-clear icon-btn" disabled={bindings[command.id].length === 0} onClick={() => onChange({...bindings, [command.id]: []})} title={`清除${command.label}快捷键`} aria-label={`清除${command.label}快捷键`}><X /></button></div>)}</div>
  </section>;
};
