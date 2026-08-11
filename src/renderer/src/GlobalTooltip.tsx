import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";

type TooltipState = {
  label: string;
  x: number;
  y: number;
  above: boolean;
};

const getTooltipTarget = (target: EventTarget | null): HTMLElement | null => {
  const element = target instanceof Element
    ? target.closest<HTMLElement>("button, [role='button'], [data-tooltip]")
    : null;
  if (!element || element.closest(".select-menu [role='option']")) return null;
  return element;
};

export const GlobalTooltip: React.FC = () => {
  const timerRef = useRef<number | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    let pointerPressed = false;
    const clear = (): void => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      targetRef.current = null;
      setTooltip(null);
    };
    const show = (target: HTMLElement): void => {
      if (targetRef.current === target) return;
      clear();
      const nativeTitle = target.getAttribute("title");
      if (nativeTitle) {
        target.dataset.tooltipNative = nativeTitle;
        target.removeAttribute("title");
      }
      const label = target.dataset.tooltip ?? target.getAttribute("aria-label") ?? nativeTitle ?? target.dataset.tooltipNative;
      if (!label) return;
      targetRef.current = target;
      timerRef.current = window.setTimeout(() => {
        if (!target.isConnected || targetRef.current !== target) return;
        if (target.getAttribute("aria-expanded") === "true" || document.querySelector(".select-menu")) {
          clear();
          return;
        }
        const rect = target.getBoundingClientRect();
        const above = rect.bottom + 44 > window.innerHeight;
        setTooltip({
          label,
          x: Math.min(window.innerWidth - 128, Math.max(128, rect.left + rect.width / 2)),
          y: above ? rect.top - 8 : rect.bottom + 8,
          above,
        });
      }, 480);
    };
    const handlePointerOver = (event: PointerEvent): void => {
      const target = getTooltipTarget(event.target);
      if (target) show(target);
    };
    const handlePointerOut = (event: PointerEvent): void => {
      const target = targetRef.current;
      if (!target) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      clear();
    };
    const handlePointerDown = (): void => {
      pointerPressed = true;
      clear();
    };
    const handlePointerUp = (): void => {
      pointerPressed = false;
    };
    const handlePointerCancel = (): void => {
      pointerPressed = false;
      clear();
    };
    const handleFocusIn = (event: FocusEvent): void => {
      if (pointerPressed) return;
      const target = getTooltipTarget(event.target);
      if (target) show(target);
    };
    const handleFocusOut = (): void => clear();
    document.addEventListener("pointerover", handlePointerOver, true);
    document.addEventListener("pointerout", handlePointerOut, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("pointercancel", handlePointerCancel, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    return () => {
      clear();
      document.removeEventListener("pointerover", handlePointerOver, true);
      document.removeEventListener("pointerout", handlePointerOut, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", handlePointerCancel, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("resize", clear);
    };
  }, []);

  return tooltip ? createPortal(<div
    className={`global-tooltip ${tooltip.above ? "above" : "below"}`}
    role="tooltip"
    style={{left: tooltip.x, top: tooltip.y}}
  >{tooltip.label}</div>, document.body) : null;
};
