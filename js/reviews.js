/**
 * reviews.js
 * Renders mock/static customer reviews on the product detail page.
 * Replace _mockReviews with a real API call when ready.
 */
const Reviews = {
  _pool: [
    { name: 'Priya S.',    stars: 5, text: 'Absolutely stunning. The quality is beyond what I expected. My living room has been transformed.' },
    { name: 'Rahul M.',   stars: 5, text: 'Packaging was immaculate and eco-friendly. The print colours are rich and vibrant. Highly recommend.' },
    { name: 'Ananya K.',  stars: 4, text: 'Beautiful piece. Delivery was prompt and the frame quality is excellent.' },
    { name: 'Vikram T.',  stars: 5, text: 'Ordered the 24×36 canvas — it's a showstopper. Every guest comments on it.' },
    { name: 'Meera R.',   stars: 5, text: 'The biodegradable packaging shows they really care. Will order again.' },
    { name: 'Arjun D.',   stars: 4, text: 'Very happy with my purchase. The colours are true to the website. Great value.' },
  ],

  render(productId) {
    const el = document.getElementById('reviewsList');
    if (!el) return;
    // Show 3 deterministic reviews based on product id
    const offset = (productId - 1) % this._pool.length;
    const picks  = [
      this._pool[offset % this._pool.length],
      this._pool[(offset + 2) % this._pool.length],
      this._pool[(offset + 4) % this._pool.length],
    ];
    el.innerHTML = picks.map(r => `
      <div class="review-card">
        <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
        <p class="review-text">"${r.text}"</p>
        <p class="review-author">— ${r.name}</p>
      </div>
    `).join('');
  },
};
