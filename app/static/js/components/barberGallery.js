// File overview: Implements reusable frontend component behavior.

import { renderGalleryGrid } from "./galleryGrid.js";
import { renderBarberGalleryCard } from "./barberGalleryCard.js";

export async function initBarberGallery({ mountEl, barberId }) {
  try {
    const response = await fetch(`/api/barber/${barberId}/photos`);
    if (!response.ok) {
      console.error("Failed to fetch barber photos:", response.status);
      mountEl.innerHTML = "<p>No photos available</p>";
      return;
    }

    const photos = await response.json();

    if (!photos || photos.length === 0) {
      mountEl.innerHTML = "<p>No photos yet</p>";
      return;
    }

    renderGalleryGrid({
      mountEl,
      items: photos,
      columns: 2,
      renderItem: renderBarberGalleryCard
    });
  } catch (error) {
    console.error("Error loading barber gallery:", error);
    mountEl.innerHTML = "<p>Error loading photos</p>";
  }
}

export async function initBarbershopGallery({ mountEl, barbershopId }) {
  try {
    const response = await fetch(`/api/barbershop/${barbershopId}/photos`);
    if (!response.ok) {
      console.error("Failed to fetch barbershop photos:", response.status);
      mountEl.innerHTML = "<p>No photos available</p>";
      return;
    }

    const photos = await response.json();

    if (!photos || photos.length === 0) {
      mountEl.innerHTML = "<p>No photos yet</p>";
      return;
    }

    renderGalleryGrid({
      mountEl,
      items: photos,
      columns: 2,
      renderItem: renderBarberGalleryCard
    });
  } catch (error) {
    console.error("Error loading barbershop gallery:", error);
    mountEl.innerHTML = "<p>Error loading photos</p>";
  }
}
