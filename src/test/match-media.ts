const matchesViewportWidth = (query: string, width: number): boolean => {
  const minWidth = /min-width:\s*(\d+)px/.exec(query);
  const maxWidth = /max-width:\s*(\d+)px/.exec(query);
  return (
    (!!minWidth && width >= Number(minWidth[1])) ||
    (!!maxWidth && width <= Number(maxWidth[1]))
  );
};

// jsdom lacks matchMedia, which Ant Design uses for responsive behavior. Width queries are
// answered for the given viewport width; every other query (such as the color scheme) is false.
export const createMatchMedia =
  (viewportWidth: number) =>
  (query: string): MediaQueryList => ({
    matches: matchesViewportWidth(query, viewportWidth),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
