import {Check, ChevronDown} from "lucide-react";
import {useCallback, useId, useLayoutEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {findSelectBoundary, moveSelectIndex} from "./select-navigation";
import {getSelectMenuGeometry} from "./select-position";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export const Select: React.FC<{
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  title?: string;
}> = ({value, options, onChange, ariaLabel, disabled = false, className, title}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [position, setPosition] = useState<MenuPosition>({top: 0, left: 0, width: 140, maxHeight: 280});
  const selected = options[selectedIndex];

  const updatePosition = useCallback((): void => {
    const trigger = buttonRef.current;
    const rect = trigger?.getBoundingClientRect();
    if (!trigger || !rect) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const computed = window.getComputedStyle(trigger);
    if (context) context.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    const contentWidth = Math.ceil(Math.max(
      0,
      ...options.map((option) => context?.measureText(option.label).width ?? option.label.length * 10),
    )) + 58;
    setPosition(getSelectMenuGeometry({
      triggerLeft: rect.left,
      triggerBottom: rect.bottom,
      triggerWidth: rect.width,
      contentWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }));
  }, [options]);

  const openMenu = (edge?: "first" | "last"): void => {
    if (disabled) return;
    const fallback = edge
      ? findSelectBoundary(options, edge)
      : selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : findSelectBoundary(options, "first");
    setActiveIndex(fallback);
    setOpen(true);
  };

  const closeMenu = (restoreFocus = false): void => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const choose = (index: number): void => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeMenu(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const handleViewportChange = (): void => updatePosition();
    const handleOutsidePointer = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    document.addEventListener("pointerdown", handleOutsidePointer, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      document.removeEventListener("pointerdown", handleOutsidePointer, true);
    };
  }, [open, updatePosition]);

  useLayoutEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${listboxId}-option-${activeIndex}`)?.scrollIntoView({block: "nearest"});
  }, [activeIndex, listboxId, open]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "Tab") {
      closeMenu();
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        closeMenu(true);
      }
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!open) openMenu(event.key === "Home" ? "first" : "last");
      else setActiveIndex(findSelectBoundary(options, event.key === "Home" ? "first" : "last"));
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open) openMenu(direction === 1 ? "first" : "last");
      else setActiveIndex((current) => moveSelectIndex(options, current, direction));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) openMenu();
      else choose(activeIndex);
    }
  };

  return <>
    <button
      ref={buttonRef}
      type="button"
      role="combobox"
      className={`select-trigger ${className ?? ""}`.trim()}
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listboxId : undefined}
      aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
      disabled={disabled}
      title={title}
      onClick={() => open ? closeMenu() : openMenu()}
      onKeyDown={handleKeyDown}
    >
      <span>{selected?.label ?? "请选择"}</span><ChevronDown aria-hidden="true" />
    </button>
    {open && createPortal(<div
      ref={menuRef}
      id={listboxId}
      className="select-menu"
      data-preserve-composer-selection
      role="listbox"
      aria-label={ariaLabel}
      style={{top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight}}
      onPointerDown={(event) => event.preventDefault()}
    >
      {options.map((option, index) => <button
        type="button"
        id={`${listboxId}-option-${index}`}
        role="option"
        aria-selected={option.value === value}
        className={`${index === activeIndex ? "active" : ""} ${option.value === value ? "selected" : ""}`.trim()}
        disabled={option.disabled}
        key={`${option.value}-${index}`}
        onPointerEnter={() => !option.disabled && setActiveIndex(index)}
        onClick={() => choose(index)}
      ><Check aria-hidden="true" /><span>{option.label}</span></button>)}
    </div>, document.body)}
  </>;
};
