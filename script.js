function openModal(title, desc, img, price) {
  document.getElementById("modalTitle").innerText = title;
  document.getElementById("modalDesc").innerText = desc;
  document.getElementById("modalImg").src = img;
  document.getElementById("modalPrice").innerText = price;
  document.getElementById("productModal").style.display = "block";

  // Gán hành động thêm vào giỏ
  document.querySelector(".btn-buy").onclick = function () {
    addToCart(title, parseInt(price.replace(/\D/g, "")));
  };

  // Reset đánh giá
  document.querySelectorAll("#starRating i").forEach(star => star.classList.remove("active"));
  document.getElementById("reviewComment").value = "";
  document.getElementById("reviewComment").setAttribute("data-product", title);
  document.getElementById("starRating").setAttribute("data-rating", "0");

  // Tải lại đánh giá
  loadReviews(title);
}

function closeModal() {
  document.getElementById("productModal").style.display = "none";
}


// đánh giá

function submitReview() {
  const comment = document.getElementById("reviewComment").value.trim();
  const product = document.getElementById("reviewComment").getAttribute("data-product");
  const rating = parseInt(document.getElementById("starRating").getAttribute("data-rating")) || 0;
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser) {
    alert("Bạn cần đăng nhập để gửi đánh giá.");
    return;
  }

  if (!comment || rating === 0) {
    alert("Hãy nhập nhận xét và chọn số sao.");
    return;
  }

  const reviews = JSON.parse(localStorage.getItem("reviews")) || {};
  if (!reviews[product]) reviews[product] = [];

  reviews[product].push({
    user: currentUser.fullname || "Ẩn danh",
    comment,
    rating,
    date: new Date().toLocaleString()
  });

  localStorage.setItem("reviews", JSON.stringify(reviews));
  loadReviews(product);
  document.getElementById("reviewComment").value = "";
  alert("Cảm ơn bạn đã đánh giá!");
}


// hiển thị đánh giá sản phẩm

function loadReviews(product) {
  const list = document.getElementById("reviewList");
  const reviews = JSON.parse(localStorage.getItem("reviews")) || {};
  const productReviews = reviews[product] || [];

  if (productReviews.length === 0) {
    list.innerHTML = "<p>Chưa có đánh giá nào.</p>";
    return;
  }

  list.innerHTML = productReviews.map(r => `
    <div class="review-item">
      <strong>${r.user}</strong> - ${r.date}<br/>
      ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}
      <p>${r.comment}</p>
    </div>
  `).join("");
}


document.querySelectorAll("#starRating i").forEach(star => {
  star.addEventListener("click", function () {
    const rating = parseInt(this.getAttribute("data-star"));
    document.querySelectorAll("#starRating i").forEach((s, i) => {
      s.classList.toggle("active", i < rating);
    });
    document.getElementById("starRating").setAttribute("data-rating", rating);
  });
});


function closeModal() {
    document.getElementById("productModal").style.display = "none";
}

// Đóng modal khi click ra ngoài
window.onclick = function(event) {
    let modal = document.getElementById("productModal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}


let currentSlide = 0;
const slides = document.querySelectorAll(".slide");

function showSlide(index) {
    slides.forEach((slide, i) => {
        slide.classList.remove("active");
        if (i === index) slide.classList.add("active");
    });
}

function changeSlide(step) {
    currentSlide = (currentSlide + step + slides.length) % slides.length;
    showSlide(currentSlide);
}

// Tự động chạy 5 giây
setInterval(() => {
    changeSlide(1);
}, 5000);

