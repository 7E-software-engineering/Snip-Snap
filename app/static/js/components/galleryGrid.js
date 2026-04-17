// File overview: Implements reusable frontend component behavior.

export function renderGalleryGrid({ mountEl, items, columns, renderItem }) {
  mountEl.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "galleryGrid";
  grid.style.setProperty("--gallery-columns", String(columns));

  for (const item of items) {
    const cell = document.createElement("div");
    cell.className = "galleryGrid__cell";
    cell.appendChild(renderItem(item));
    grid.appendChild(cell);
  }

  mountEl.appendChild(grid);
}