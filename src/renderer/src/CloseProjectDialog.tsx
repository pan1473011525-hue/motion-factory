import {AlertTriangle, LogOut, Save, X} from "lucide-react";
import {useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import type {CloseProjectDecision} from "../../shared/contracts";

export const CloseProjectDialog: React.FC<{
  open: boolean;
  projectName: string;
  onDecision: (decision: CloseProjectDecision) => void;
}> = ({open, projectName, onDecision}) => {
  const dialogRef = useRef<HTMLElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    saveButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDecision("cancel");
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      if (focusable.length === 0) return;
      const currentIndex = focusable.indexOf(document.activeElement as HTMLButtonElement);
      if (event.shiftKey && currentIndex <= 0) {
        event.preventDefault();
        focusable.at(-1)?.focus();
      } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
        event.preventDefault();
        focusable[0]?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onDecision, open]);

  if (!open) return null;
  return createPortal(<div className="app-modal-backdrop">
    <section ref={dialogRef} className="close-project-dialog" role="alertdialog" aria-modal="true" aria-labelledby="close-project-title" aria-describedby="close-project-description">
      <header>
        <span className="close-dialog-icon" aria-hidden="true"><AlertTriangle /></span>
        <div><h2 id="close-project-title">保存本次项目？</h2><p>{projectName}</p></div>
      </header>
      <p id="close-project-description">当前项目有未保存的修改。自动恢复快照不能代替项目文件。</p>
      <footer>
        <button type="button" className="dialog-cancel-action" onClick={() => onDecision("cancel")} aria-label="取消退出"><X />取消</button>
        <button type="button" className="dialog-discard-action" onClick={() => onDecision("discard")} aria-label="不保存并退出"><LogOut />不保存</button>
        <button ref={saveButtonRef} type="button" className="dialog-primary-action" onClick={() => onDecision("save")} aria-label="保存并退出"><Save />保存并退出</button>
      </footer>
    </section>
  </div>, document.body);
};
