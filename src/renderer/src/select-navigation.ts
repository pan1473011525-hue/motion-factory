export type SelectNavigationOption = {disabled?: boolean};

export const findSelectBoundary = (
  options: SelectNavigationOption[],
  edge: "first" | "last",
): number => {
  const indices = edge === "first"
    ? options.map((_option, index) => index)
    : options.map((_option, index) => index).reverse();
  return indices.find((index) => !options[index]?.disabled) ?? -1;
};

export const moveSelectIndex = (
  options: SelectNavigationOption[],
  currentIndex: number,
  direction: 1 | -1,
): number => {
  if (options.length === 0) return -1;
  let index = currentIndex;
  for (let attempt = 0; attempt < options.length; attempt += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
};
