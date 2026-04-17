// File overview: Implements reusable frontend component behavior.

/**
 * Renders an editable gallery card for dashboard
 */
export function renderEditableGalleryCard(photo, onEdit) {
  const card = document.createElement('div');
  card.className = 'editable-gallery-card';

  const media = document.createElement('div');
  media.className = 'editable-gallery-card__media';

  const img = document.createElement('img');
  img.src = photo.image_url;
  img.alt = `Photo ${photo.photo_id}`;
  
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'editable-gallery-card__edit-btn';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', (e) => {
    e.preventDefault();
    onEdit(photo);
  });

  media.appendChild(img);
  media.appendChild(editBtn);

  card.appendChild(media);

  return card;
}
