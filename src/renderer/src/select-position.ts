export type SelectMenuGeometry = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export const getSelectMenuGeometry = ({
  triggerLeft,
  triggerBottom,
  triggerWidth,
  contentWidth,
  viewportWidth,
  viewportHeight,
}: {
  triggerLeft: number;
  triggerBottom: number;
  triggerWidth: number;
  contentWidth: number;
  viewportWidth: number;
  viewportHeight: number;
}): SelectMenuGeometry => {
  const viewportPadding = 8;
  const menuGap = 5;
  const width = Math.min(
    Math.max(112, triggerWidth, contentWidth),
    Math.min(320, viewportWidth - viewportPadding * 2),
  );
  const centeredLeft = triggerLeft + (triggerWidth - width) / 2;
  const left = Math.min(
    Math.max(viewportPadding, centeredLeft),
    viewportWidth - width - viewportPadding,
  );
  const top = triggerBottom + menuGap;
  return {
    top,
    left,
    width,
    maxHeight: Math.max(40, viewportHeight - top - viewportPadding),
  };
};
