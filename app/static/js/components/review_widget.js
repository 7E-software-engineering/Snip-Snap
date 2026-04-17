// File overview: Implements reusable frontend component behavior.

export class ReviewWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.reviews = [
            { name: "@JoeBingley", rating: 4, text: "Lovely spot, great atmosphere!", images: [], replies: ["Thanks Joe!"] },
            { name: "@AlfredC", rating: 2, text: "Wait time was too long.", images: ["photo1.jpg"], replies: [] }
        ];
        this.selectedRating = 0;
        this.renderBase();
        this.renderReviews();
    }

    renderBase() {
        this.container.innerHTML = `
            <div class="widget-container">
                <div class="widget-header">
                    <span>Reviews</span>
                    <div class="add-review-btn" id="openModal">＋</div>
                </div>
                <div class="review-list" id="reviewList"></div>
            </div>
            <div class="modal-overlay" id="modal">
                <div class="modal-content">
                    <div class="modal-title">Upload a review</div>
                    <div class="star-input" id="starInput">
                        <span data-v="1">★</span><span data-v="2">★</span><span data-v="3">★</span><span data-v="4">★</span><span data-v="5">★</span>
                    </div>
                    <textarea id="reviewText" placeholder="Describe your experience..."></textarea>
                    <div class="photo-label">Attach photos:</div>
                    <input type="file" id="imageInput" multiple accept="image/*">
                    <div class="modal-btns">
                        <button class="btn-upload" id="submitReview">Upload</button>
                        <button class="btn-cancel" id="closeModal">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const modal = this.container.querySelector("#modal");
        this.container.querySelector("#openModal").onclick = () => modal.style.display = "flex";
        this.container.querySelector("#closeModal").onclick = () => {
            modal.style.display = "none";
            this.resetModal();
        };

        const stars = this.container.querySelectorAll("#starInput span");
        stars.forEach(s => {
            s.onclick = () => {
                this.selectedRating = parseInt(s.dataset.v);
                stars.forEach(st => st.classList.toggle("active", st.dataset.v <= this.selectedRating));
            };
        });

        this.container.querySelector("#submitReview").onclick = () => {
            const text = this.container.querySelector("#reviewText").value;
            const files = this.container.querySelector("#imageInput").files;
            if(!text || this.selectedRating === 0) return alert("Please add rating and text");
            
            this.reviews.unshift({
                name: "@You",
                rating: this.selectedRating,
                text: text,
                images: Array.from(files).map(f => f.name),
                replies: []
            });
            modal.style.display = "none";
            this.resetModal();
            this.renderReviews();
        };
    }

    resetModal() {
        this.selectedRating = 0;
        this.container.querySelector("#reviewText").value = "";
        this.container.querySelector("#imageInput").value = "";
        this.container.querySelectorAll("#starInput span").forEach(s => s.classList.remove("active"));
    }

    renderReviews() {
        const list = this.container.querySelector("#reviewList");
        list.innerHTML = this.reviews.map((rev, i) => `
            <div class="review-card">
                <div class="review-name">${rev.name}</div>
                <div class="review-stars">${"★".repeat(rev.rating)}${"☆".repeat(5-rev.rating)}</div>
                <div class="review-text">${rev.text}</div>
                ${rev.images.length ? `<div class="img-row">${rev.images.map(img => `<span class="img-tag">🖼️ ${img}</span>`).join("")}</div>` : ""}
                <div class="faded-actions">
                    <span onclick="document.getElementById('replyArea${i}').style.display='flex'">Reply</span>
                    <span onclick="document.getElementById('editArea${i}').style.display='flex'">Edit</span>
                </div>
                <div class="input-box" id="editArea${i}" style="display:none">
                    <textarea id="editInput${i}">${rev.text}</textarea>
                    <button class="btn-save" onclick="window.widget.saveEdit(${i})">Save Changes</button>
                </div>
                <div class="input-box" id="replyArea${i}" style="display:none">
                    <textarea id="replyInput${i}" placeholder="Write a reply..."></textarea>
                    <button class="btn-save" onclick="window.widget.addReply(${i})">Post Reply</button>
                </div>
                <div class="replies-list">
                    ${rev.replies.map((rep, ri) => `
                        <div class="reply-item">
                            <div>${rep}</div>
                            <div class="faded-actions" style="font-size:11px">
                                <span onclick="document.getElementById('editRep${i}_${ri}').style.display='flex'">Edit</span>
                            </div>
                            <div class="input-box" id="editRep${i}_${ri}" style="display:none">
                                <textarea id="editRepInp${i}_${ri}">${rep}</textarea>
                                <button class="btn-save" onclick="window.widget.saveReply(${i}, ${ri})">Save</button>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `).join("");
    }

    saveEdit(i) {
        this.reviews[i].text = document.getElementById(`editInput${i}`).value;
        this.renderReviews();
    }

    addReply(i) {
        const txt = document.getElementById(`replyInput${i}`).value;
        if(txt) { this.reviews[i].replies.push(txt); this.renderReviews(); }
    }

    saveReply(i, ri) {
        this.reviews[i].replies[ri] = document.getElementById(`editRepInp${i}_${ri}`).value;
        this.renderReviews();
    }
}
