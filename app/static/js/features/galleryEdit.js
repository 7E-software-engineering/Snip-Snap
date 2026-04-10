// Gallery Edit Feature

let galleryEdits = new Map(); // photo_id -> { main_tag_id }
let currentEditingPhoto = null;
let editPhotoTagAutocomplete = null;
let editPhotoTagSelection = null;
let editPhotoNewFile = null;
let editPhotoTagListComponent = null;

export function initGalleryEditFeature() {
  console.log('[GALLERY EDIT] Starting feature initialization');
  
  const editPhotoModal = document.getElementById('editPhotoModal');
  const closeEditPhotoBtn = document.getElementById('closeEditPhotoBtn');
  const cancelEditPhotoBtn = document.getElementById('cancelEditPhotoBtn');
  const editPhotoForm = document.getElementById('editPhotoForm');

  console.log('[GALLERY EDIT] Elements found:', {
    editPhotoModal: !!editPhotoModal,
    closeEditPhotoBtn: !!closeEditPhotoBtn,
    cancelEditPhotoBtn: !!cancelEditPhotoBtn,
    editPhotoForm: !!editPhotoForm
  });

  if (!editPhotoModal || !editPhotoForm) {
    console.error('[GALLERY EDIT] Required elements not found');
    return;
  }

  console.log('[GALLERY EDIT] Initializing gallery edit feature');

  // Close/Cancel buttons
  closeEditPhotoBtn.addEventListener('click', () => {
    console.log('[GALLERY EDIT] Close button clicked');
    editPhotoModal.classList.remove('open');
    resetEditPhotoForm();
  });

  cancelEditPhotoBtn.addEventListener('click', () => {
    console.log('[GALLERY EDIT] Cancel button clicked');
    editPhotoModal.classList.remove('open');
    resetEditPhotoForm();
  });

  // Click outside modal
  editPhotoModal.addEventListener('click', (e) => {
    if (e.target === editPhotoModal) {
      console.log('[GALLERY EDIT] Clicked outside modal');
      editPhotoModal.classList.remove('open');
      resetEditPhotoForm();
    }
  });

  // Form submission
  editPhotoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[GALLERY EDIT] Form submitted');
    
    if (!currentEditingPhoto) {
      showEditPhotoError('No photo selected');
      return;
    }

    if (!editPhotoTagSelection) {
      showEditPhotoError('Please select a main tag');
      return;
    }

    try {
      showEditPhotoLoading(true);
      hideEditPhotoMessages();
      
      // Check if user selected a new photo
      const photoInput = document.getElementById('editPhotoInput');
      if (photoInput && photoInput.files.length > 0) {
        editPhotoNewFile = photoInput.files[0];
      }
      
      // If user selected a new photo, upload it first
      if (editPhotoNewFile) {
        console.log('[GALLERY EDIT] New photo file selected, uploading...');
        
        const img = new Image();
        img.onload = async () => {
          const formData = new FormData();
          formData.append('photo', editPhotoNewFile);
          formData.append('width', img.width);
          formData.append('height', img.height);
          formData.append('photo_id', currentEditingPhoto.photo_id);
          
          const uploadResponse = await fetch('/api/photos/replace', {
            method: 'POST',
            body: formData
          });
          
          const uploadData = await uploadResponse.json();
          
          if (!uploadResponse.ok) {
            showEditPhotoError(uploadData.error || 'Failed to upload new photo');
            showEditPhotoLoading(false);
            return;
          }
          
          console.log('[GALLERY EDIT] Photo uploaded successfully');
          await updatePhotoMainTag();
        };
        
        img.onerror = () => {
          showEditPhotoError('Invalid image file');
          showEditPhotoLoading(false);
        };
        
        img.src = URL.createObjectURL(editPhotoNewFile);
      } else {
        // Just update the main tag
        await updatePhotoMainTag();
      }
      
    } catch (error) {
      console.error('[GALLERY EDIT] Error:', error);
      showEditPhotoError('An error occurred');
      showEditPhotoLoading(false);
    }
  });

  // Load gallery on page load
  console.log('[GALLERY EDIT] Calling loadEditableGallery');
  loadEditableGallery();
  
  console.log('[GALLERY EDIT] Feature initialization complete');
}

export async function loadEditableGallery() {
  console.log('[GALLERY EDIT] Loading editable gallery');
  const mountEl = document.getElementById('editable-gallery-mount');
  const loadingEl = document.getElementById('galleryLoading');
  
  if (!mountEl) {
    console.error('[GALLERY EDIT] Mount element not found!');
    return;
  }
  
  console.log('[GALLERY EDIT] Mount element found:', mountEl);
  
  try {
    // Show loading indicator
    if (loadingEl) {
      loadingEl.classList.add('show');
    }
    mountEl.innerHTML = '';
    
    console.log('[GALLERY EDIT] Fetching photos from /api/my-photos');
    const response = await fetch('/api/my-photos');
    console.log('[GALLERY EDIT] Response status:', response.status);
    
    if (!response.ok) {
      console.warn('[GALLERY EDIT] Failed to fetch photos:', response.status);
      mountEl.innerHTML = "<p>No gallery photos yet</p>";
      if (loadingEl) loadingEl.classList.remove('show');
      return;
    }

    const photos = await response.json();
    console.log('[GALLERY EDIT] Loaded', photos.length, 'photos:', photos);

    if (!photos || photos.length === 0) {
      console.log('[GALLERY EDIT] No photos returned');
      const containerDiv = document.createElement('div');
      
      // Show upload button when no photos
      if (0 < 8) {
        const uploadSection = document.createElement('div');
        uploadSection.className = 'gallery-upload-section';
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'gallery-upload-btn';
        uploadBtn.textContent = 'Upload Photo (0/8)';
        uploadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openGalleryUploadModal();
        });
        uploadSection.appendChild(uploadBtn);
        containerDiv.appendChild(uploadSection);
      }
      
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'No gallery photos yet. Upload or edit existing photos to add them to your gallery!';
      containerDiv.appendChild(emptyMsg);
      mountEl.appendChild(containerDiv);
      if (loadingEl) loadingEl.classList.remove('show');
      return;
    }

    console.log('[GALLERY EDIT] Importing gallery components');
    // Render gallery grid  
    const { renderGalleryGrid } = await import('../components/galleryGrid.js');
    const { renderEditableGalleryCard } = await import('../components/editableGalleryCard.js');
    
    console.log('[GALLERY EDIT] Components imported, rendering gallery');

    // Create container for both upload button (if needed) and gallery
    const containerDiv = document.createElement('div');
    containerDiv.className = 'editable-gallery-container';
    
    // Show upload button when less than 8 photos
    if (photos.length < 8) {
      const uploadSection = document.createElement('div');
      uploadSection.className = 'gallery-upload-section';
      const uploadBtn = document.createElement('button');
      uploadBtn.type = 'button';
      uploadBtn.className = 'gallery-upload-btn';
      uploadBtn.textContent = `Upload Photo (${photos.length}/8)`;
      uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openGalleryUploadModal();
      });
      uploadSection.appendChild(uploadBtn);
      containerDiv.appendChild(uploadSection);
    }
    
    const gridContainer = document.createElement('div');
    gridContainer.className = 'gallery-grid-container';
    containerDiv.appendChild(gridContainer);

    renderGalleryGrid({
      mountEl: gridContainer,
      items: photos,
      columns: 3,
      renderItem: (photo) => renderEditableGalleryCard(photo, openEditPhotoModal)
    });
    
    mountEl.appendChild(containerDiv);
    
    // Hide loading indicator
    if (loadingEl) loadingEl.classList.remove('show');
    
    console.log('[GALLERY EDIT] Gallery rendered successfully');
  } catch (error) {
    console.error('[GALLERY EDIT] Error loading gallery:', error);
    console.error('[GALLERY EDIT] Stack:', error.stack);
    mountEl.innerHTML = "<p>Error loading photos</p>";
    if (loadingEl) loadingEl.classList.remove('show');
  }
}

export function openEditPhotoModal(photo) {
  console.log('[GALLERY EDIT] Opening modal for photo:', photo.photo_id);
  currentEditingPhoto = photo;
  editPhotoTagSelection = null;
  editPhotoNewFile = null;

  // Show current photo preview
  const previewEl = document.getElementById('editPhotoPreview');
  previewEl.innerHTML = `<img src="${photo.image_url}" style="max-width: 100%; max-height: 300px; border-radius: 8px;">`;

  // Set up file input for changing the photo
  const photoInput = document.getElementById('editPhotoInput');
  const previewNewEl = document.getElementById('editPhotoPreviewNew');
  
  if (photoInput) {
    photoInput.value = ''; // Clear any previous selection
    previewNewEl.innerHTML = ''; // Clear preview
    
    // File input change handler
    photoInput.onchange = function() {
      const file = this.files[0];
      console.log('[GALLERY EDIT] New file selected:', file?.name);
      
      previewNewEl.innerHTML = '';
      
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const box = document.createElement('div');
          box.className = 'image-box';
          
          const img = document.createElement('img');
          img.src = e.target.result;
          
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'remove-btn';
          removeBtn.innerHTML = '×';
          removeBtn.onclick = (evt) => {
            evt.preventDefault();
            photoInput.value = '';
            previewNewEl.innerHTML = '';
            editPhotoNewFile = null;
          };
          
          box.appendChild(img);
          box.appendChild(removeBtn);
          previewNewEl.appendChild(box);
        };
        reader.readAsDataURL(file);
        editPhotoNewFile = file;
      }
    };
  } else {
    console.error('[GALLERY EDIT] editPhotoInput element not found');
  }

  // Load tags and initialize autocomplete
  loadEditPhotoTags();

  // Show modal
  const editPhotoModal = document.getElementById('editPhotoModal');
  editPhotoModal.classList.add('open');
}

async function loadEditPhotoTags() {
  try {
    const response = await fetch('/api/discover/search_items');
    const data = await response.json();
    const tags = data.items.filter(item => item.type === 'tag');
    
    console.log('[GALLERY EDIT] Loaded', tags.length, 'tags');

    const tagSearchContainer = document.getElementById('editPhotoTagSearchContainer');
    const selectedTagContainer = document.getElementById('editPhotoSelectedTag');
    
    tagSearchContainer.innerHTML = '';
    selectedTagContainer.innerHTML = '';

    // Initialize TagList
    if (!editPhotoTagListComponent) {
      editPhotoTagListComponent = new window.TagList({
        mountEl: selectedTagContainer,
        initialItems: []
      });
    }
    
    // Create autocomplete
    editPhotoTagAutocomplete = window.createSearchBarAutocomplete(
      tagSearchContainer,
      (selectedItem) => {
        console.log('[GALLERY EDIT] Tag selected:', selectedItem);
        editPhotoTagSelection = selectedItem;
        editPhotoTagListComponent.set_items([selectedItem]);
      },
      tags,
      { placeholder: 'Search and select main tag...' }
    );
  } catch (error) {
    console.error('[GALLERY EDIT] Error loading tags:', error);
  }
}

async function updatePhotoMainTag() {
  console.log('[GALLERY EDIT] Updating main tag');
  
  const response = await fetch(`/api/photos/${currentEditingPhoto.photo_id}/update-tag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      main_tag_id: editPhotoTagSelection.id
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    showEditPhotoError(data.error || 'Failed to save');
    showEditPhotoLoading(false);
    return;
  }

  console.log('[GALLERY EDIT] Successfully saved');
  
  // Track the edit
  galleryEdits.set(currentEditingPhoto.photo_id, {
    main_tag_id: editPhotoTagSelection.id
  });

  showEditPhotoSuccess('Photo updated successfully!');
  
  showEditPhotoLoading(false);
  
  setTimeout(() => {
    const editPhotoModal = document.getElementById('editPhotoModal');
    editPhotoModal.classList.remove('open');
    resetEditPhotoForm();
    loadEditableGallery();
  }, 1500);
}

function resetEditPhotoForm() {
  currentEditingPhoto = null;
  editPhotoTagSelection = null;
  editPhotoNewFile = null;
  
  document.getElementById('editPhotoPreview').innerHTML = '';
  document.getElementById('editPhotoPreviewNew').innerHTML = '';
  document.getElementById('editPhotoTagSearchContainer').innerHTML = '';
  
  const photoInput = document.getElementById('editPhotoInput');
  if (photoInput) {
    photoInput.value = '';
  }
  
  if (editPhotoTagListComponent) {
    editPhotoTagListComponent.set_items([]);
  }
  
  document.getElementById('editPhotoErrorMessage').classList.remove('show');
  document.getElementById('editPhotoSuccessMessage').classList.remove('show');
}

function showEditPhotoError(message) {
  const errorEl = document.getElementById('editPhotoErrorMessage');
  errorEl.textContent = message;
  errorEl.classList.add('show');
}

function showEditPhotoSuccess(message) {
  const successEl = document.getElementById('editPhotoSuccessMessage');
  successEl.textContent = message;
  successEl.classList.add('show');
}

function hideEditPhotoMessages() {
  document.getElementById('editPhotoErrorMessage').classList.remove('show');
  document.getElementById('editPhotoSuccessMessage').classList.remove('show');
}

function showEditPhotoLoading(show) {
  const loading = document.getElementById('editPhotoLoading');
  if (show) {
    loading.classList.add('show');
  } else {
    loading.classList.remove('show');
  }
}

// Gallery Upload Modal Functions
let galleryUploadFile = null;
let galleryUploadTagSelection = null;
let galleryUploadTagListComponent = null;
let galleryUploadTagAutocomplete = null;

export function openGalleryUploadModal() {
  console.log('[GALLERY EDIT] Opening gallery upload modal');
  
  // Create modal if it doesn't exist
  let uploadGalleryModal = document.getElementById('uploadGalleryModal');
  if (!uploadGalleryModal) {
    createGalleryUploadModal();
    uploadGalleryModal = document.getElementById('uploadGalleryModal');
  }
  
  // Reset form
  resetGalleryUploadForm();
  
  // Load tags for gallery upload
  loadGalleryUploadTags();
  
  // Show modal
  uploadGalleryModal.classList.add('open');
}

function createGalleryUploadModal() {
  console.log('[GALLERY EDIT] Creating gallery upload modal');
  
  const modalHTML = `
    <div class="modal" id="uploadGalleryModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Upload Gallery Photo</h2>
          <button class="close-btn" id="closeGalleryUploadBtn">&times;</button>
        </div>

        <div class="error-message" id="galleryUploadErrorMessage"></div>
        <div class="success-message" id="galleryUploadSuccessMessage"></div>

        <form id="uploadGalleryForm">
          <!-- Photo Input -->
          <div class="form-group">
            <label for="galleryPhotoInput">Select Photo</label>
            <input type="file" id="galleryPhotoInput" name="photo" accept="image/*" required>
          </div>

          <!-- Preview -->
          <div id="galleryPhotoPreview"></div>

          <!-- Main Tag Selection (Optional) -->
          <div class="form-group">
            <label>Main Tag (Optional)</label>
            <div id="galleryTagSearchContainer"></div>
            <div id="gallerySelectedTag" style="margin-top: 12px; min-height: 40px;"></div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancelGalleryUploadBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">Upload</button>
          </div>

          <div class="loading" id="galleryUploadLoading">
            <p>Uploading...</p>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Set up event listeners
  const uploadGalleryModal = document.getElementById('uploadGalleryModal');
  const closeBtn = document.getElementById('closeGalleryUploadBtn');
  const cancelBtn = document.getElementById('cancelGalleryUploadBtn');
  const uploadForm = document.getElementById('uploadGalleryForm');
  const photoInput = document.getElementById('galleryPhotoInput');
  const preview = document.getElementById('galleryPhotoPreview');
  
  closeBtn.addEventListener('click', () => {
    console.log('[GALLERY EDIT] Gallery upload modal close clicked');
    uploadGalleryModal.classList.remove('open');
    resetGalleryUploadForm();
  });
  
  cancelBtn.addEventListener('click', () => {
    console.log('[GALLERY EDIT] Gallery upload modal cancel clicked');
    uploadGalleryModal.classList.remove('open');
    resetGalleryUploadForm();
  });
  
  uploadGalleryModal.addEventListener('click', (e) => {
    if (e.target === uploadGalleryModal) {
      console.log('[GALLERY EDIT] Gallery upload modal clicked outside');
      uploadGalleryModal.classList.remove('open');
      resetGalleryUploadForm();
    }
  });
  
  // File input handling
  photoInput.addEventListener('change', function() {
    preview.innerHTML = '';
    const file = this.files[0];
    
    console.log('[GALLERY EDIT] File selected:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });
    
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const box = document.createElement('div');
        box.className = 'image-box';
        
        const img = document.createElement('img');
        img.src = e.target.result;
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = (evt) => {
          evt.preventDefault();
          photoInput.value = '';
          preview.innerHTML = '';
          galleryUploadFile = null;
        };
        
        box.appendChild(img);
        box.appendChild(removeBtn);
        preview.appendChild(box);
      };
      reader.readAsDataURL(file);
      galleryUploadFile = file;
    }
  });
  
  // Form submission
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[GALLERY EDIT] Gallery upload form submitted');
    
    if (!galleryUploadFile) {
      showGalleryUploadError('Please select a photo');
      return;
    }
    
    try {
      showGalleryUploadLoading(true);
      hideGalleryUploadMessages();
      
      // Get image dimensions
      const img = new Image();
      img.onload = async () => {
        const formData = new FormData();
        formData.append('photo', galleryUploadFile);
        formData.append('width', img.width);
        formData.append('height', img.height);
        
        // Add main tag if selected
        if (galleryUploadTagSelection) {
          formData.append('main_tag_id', galleryUploadTagSelection.id);
          console.log('[GALLERY EDIT] Adding main tag:', galleryUploadTagSelection.id);
        }
        
        const uploadResponse = await fetch('/api/photos/upload-gallery', {
          method: 'POST',
          body: formData
        });
        
        const uploadData = await uploadResponse.json();
        
        if (!uploadResponse.ok) {
          showGalleryUploadError(uploadData.error || 'Failed to upload photo');
          showGalleryUploadLoading(false);
          return;
        }
        
        console.log('[GALLERY EDIT] Gallery photo uploaded successfully:', uploadData);
        showGalleryUploadSuccess('Photo uploaded successfully!');
        showGalleryUploadLoading(false);
        
        setTimeout(() => {
          uploadGalleryModal.classList.remove('open');
          resetGalleryUploadForm();
          loadEditableGallery();
        }, 1500);
      };
      
      img.src = URL.createObjectURL(galleryUploadFile);
    } catch (error) {
      console.error('[GALLERY EDIT] Error uploading gallery photo:', error);
      showGalleryUploadError('Error uploading photo: ' + error.message);
      showGalleryUploadLoading(false);
    }
  });
}

function resetGalleryUploadForm() {
  galleryUploadFile = null;
  galleryUploadTagSelection = null;
  
  const photoInput = document.getElementById('galleryPhotoInput');
  const preview = document.getElementById('galleryPhotoPreview');
  const selectedTag = document.getElementById('gallerySelectedTag');
  
  if (photoInput) photoInput.value = '';
  if (preview) preview.innerHTML = '';
  if (selectedTag) selectedTag.innerHTML = '';
  
  // Reset tag list component
  if (galleryUploadTagListComponent) {
    galleryUploadTagListComponent.set_items([]);
  }
  
  hideGalleryUploadMessages();
}

async function loadGalleryUploadTags() {
  try {
    const response = await fetch('/api/discover/search_items');
    const data = await response.json();
    const tags = data.items.filter(item => item.type === 'tag');
    
    console.log('[GALLERY EDIT] Loaded', tags.length, 'tags for gallery upload');

    const tagSearchContainer = document.getElementById('galleryTagSearchContainer');
    const selectedTagContainer = document.getElementById('gallerySelectedTag');
    
    if (!tagSearchContainer || !selectedTagContainer) {
      console.error('[GALLERY EDIT] Tag containers not found');
      return;
    }
    
    tagSearchContainer.innerHTML = '';
    selectedTagContainer.innerHTML = '';

    // Initialize TagList
    if (!galleryUploadTagListComponent) {
      galleryUploadTagListComponent = new window.TagList({
        mountEl: selectedTagContainer,
        initialItems: []
      });
    } else {
      galleryUploadTagListComponent.set_items([]);
    }
    
    // Create autocomplete
    galleryUploadTagAutocomplete = window.createSearchBarAutocomplete(
      tagSearchContainer,
      (selectedItem) => {
        console.log('[GALLERY EDIT] Gallery upload tag selected:', selectedItem);
        galleryUploadTagSelection = selectedItem;
        galleryUploadTagListComponent.set_items([selectedItem]);
      },
      tags,
      { placeholder: 'Search and select main tag...' }
    );
  } catch (error) {
    console.error('[GALLERY EDIT] Error loading tags for gallery upload:', error);
  }
}

function showGalleryUploadError(message) {
  const errorEl = document.getElementById('galleryUploadErrorMessage');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }
}

function showGalleryUploadSuccess(message) {
  const successEl = document.getElementById('galleryUploadSuccessMessage');
  if (successEl) {
    successEl.textContent = message;
    successEl.classList.add('show');
  }
}

function hideGalleryUploadMessages() {
  const errorEl = document.getElementById('galleryUploadErrorMessage');
  const successEl = document.getElementById('galleryUploadSuccessMessage');
  if (errorEl) errorEl.classList.remove('show');
  if (successEl) successEl.classList.remove('show');
}

function showGalleryUploadLoading(show) {
  const loading = document.getElementById('galleryUploadLoading');
  if (loading) {
    if (show) {
      loading.classList.add('show');
    } else {
      loading.classList.remove('show');
    }
  }
}
