import { renderGalleryGrid } from "./galleryGrid.js";
import { renderEditableGalleryCard } from "./editableGalleryCard.js";

export async function initEditableGallery({ mountEl, userId, onEdit, onUploadClick }) {
  try {
    const response = await fetch(`/api/my-photos`);
    if (!response.ok) {
      console.error("Failed to fetch photos:", response.status);
      mountEl.innerHTML = "<p>No gallery photos yet</p>";
      return;
    }

    const photos = await response.json();
    const photoCount = photos ? photos.length : 0;

    // Create container for gallery content
    const container = document.createElement('div');
    container.className = 'editable-gallery-container';

    // If less than 8 photos, show upload button
    if (photoCount < 8) {
      const uploadSection = document.createElement('div');
      uploadSection.className = 'gallery-upload-section';
      
      const uploadBtn = document.createElement('button');
      uploadBtn.type = 'button';
      uploadBtn.className = 'gallery-upload-btn';
      uploadBtn.textContent = `Upload Photo (${photoCount}/8)`;
      uploadBtn.addEventListener('click', () => {
        if (onUploadClick) {
          onUploadClick();
        }
      });
      
      uploadSection.appendChild(uploadBtn);
      container.appendChild(uploadSection);
    }

    // Add gallery grid
    if (!photos || photos.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'No gallery photos yet. Upload or edit existing photos to add them to your gallery!';
      container.appendChild(emptyMsg);
    } else {
      const gridContainer = document.createElement('div');
      gridContainer.className = 'gallery-grid-container';
      container.appendChild(gridContainer);
      
      renderGalleryGrid({
        mountEl: gridContainer,
        items: photos,
        columns: 3,
        renderItem: (photo) => renderEditableGalleryCard(photo, onEdit)
      });
    }

    mountEl.innerHTML = '';
    mountEl.appendChild(container);
  } catch (error) {
    console.error("Error loading gallery:", error);
    mountEl.innerHTML = "<p>Error loading photos</p>";
  }
}
