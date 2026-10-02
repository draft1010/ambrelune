const paths = {
  hand: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  axe: "M7 21L15 3M11 6L19 9L22 5L16 2M5 21h4",
  pick: "M11 21l4-16M4 9Q14 0 22 10M10 21h3",
  hoe: "M7 22L16 5M12 3l8 5-2 4-8-5z",
  water: "M5 10h11v10H5zM16 13l5-4 1 2-6 6M6 10V7a3 3 0 016 0v3M2 12H1v6h4",
  build: "M3 11l9-8 9 8M5 10v11h14V10M10 21v-7h4v7",
  journal: "M4 3h16v18H4zM8 3v18M11 8h6M11 12h6M11 16h4",
};
export function toolIcon(id) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id] || paths.hand}"/></svg>`;
}
