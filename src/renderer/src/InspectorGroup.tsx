import {ChevronRight} from "lucide-react";
import {useId, useState} from "react";

export const InspectorGroup: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}> = ({title, children, defaultOpen = false, className = ""}) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className={`inspector-section inspector-group ${open ? "inspector-group-open" : ""} ${className}`.trim()}>
      <button
        type="button"
        className="inspector-group-trigger"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{title}</span>
        <ChevronRight aria-hidden="true" />
      </button>
      {open && <div id={contentId} className="inspector-group-content">{children}</div>}
    </section>
  );
};
