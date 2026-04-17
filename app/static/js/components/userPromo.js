// File overview: Implements reusable frontend component behavior.

export function renderUserPromo(container, data = {}, options = {}) {
  const el = typeof container === "string" ? document.querySelector(container) : container;
  if (!el) return;

  const size = Math.min(40, Math.max(32, Number(options.avatarSize) || 36));
  const name = data.name || "Unknown";
  const role = (data.role || "").toLowerCase();
  const shop = data.barbershop_name || "";
  const imageUrl = data.profile_image_url || "";

  const row = document.createElement("div");
  row.className = "user-promo";
  row.style.setProperty("--user-promo-avatar-size", `${size}px`);

  const avatar = document.createElement("div");
  avatar.className = "user-promo__avatar";

  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = `${name} profile`;
    img.loading = "lazy";
    img.onerror = () => {
      avatar.innerHTML = `<svg viewBox="0 0 24 24" width="${Math.floor(size * 0.6)}" height="${Math.floor(size * 0.6)}"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    };
    avatar.appendChild(img);
  } else {
    avatar.innerHTML = `<svg viewBox="0 0 24 24" width="${Math.floor(size * 0.6)}" height="${Math.floor(size * 0.6)}"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }

  const text = document.createElement("div");
  text.className = "user-promo__text";

  const nameEl = document.createElement("div");
  nameEl.className = "user-promo__name";
  nameEl.textContent = name;
  text.appendChild(nameEl);

  if (role === "barber" && shop) {
    const subtext = document.createElement("div");
    subtext.className = "user-promo__subtext";
    subtext.textContent = shop;
    text.appendChild(subtext);
  }

  row.appendChild(avatar);
  row.appendChild(text);

  el.textContent = "";
  el.appendChild(row);
}
