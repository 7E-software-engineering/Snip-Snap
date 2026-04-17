// File overview: Implements reusable frontend component behavior.

import { renderGalleryGrid } from "./galleryGrid.js";
import { renderEditableGalleryCard } from "./editableGalleryCard.js";

export async function initEditableGallery({ mountEl, userId, onEdit }) {
  try {
    const response = await fetch(`/api/my-photos`);
    if (!response.ok) {
      console.error("Failed to fetch photos:", response.status);
      mountEl.innerHTML = "<p>No gallery photos yet</p>";
      return;
    }

    const photos = await response.json();

    if (!photos || photos.length === 0) {
      mountEl.innerHTML = "<p>No gallery photos yet. Edit existing photos to add them to your gallery!</p>";
      return;
    }

    renderGalleryGrid({
      mountEl,
      items: photos,
      columns: 3,
      renderItem: (photo) => renderEditableGalleryCard(photo, onEdit)
    });
  } catch (error) {
    console.error("Error loading gallery:", error);
    mountEl.innerHTML = "<p>Error loading photos</p>";
  }
}
