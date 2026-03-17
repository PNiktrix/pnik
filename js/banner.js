/**
 * banner.js
 * Builds the scrolling banner from products.json banner array.
 */
const Banner = {
  render(items) {
    const track = document.getElementById('bannerTrack');
    if (!track || !items.length) return;
    // Duplicate for seamless loop
    const doubled = [...items, ...items];
    track.innerHTML = doubled.map(t => `<span>${t}</span>`).join('');
  },
};
