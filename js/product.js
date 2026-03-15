// ============================================================
// product.js — Product Model & Repository
// ============================================================
// Product     : represents one wall art item
// ProductRepository : loads products from JSON, provides access
// ============================================================

class Product {
  constructor({ id, name, price, image, tag = "", category = "All", images = [] }) {
    this.id       = id;
    this.name     = name;
    this.price    = price;
    this.image    = image;        // primary thumbnail — always shown first
    this.tag      = tag;
    this.category = category;

    const allImgs = images.length ? images : [image];

    // cardImages — used for auto-slide on the grid card
    // Only first image + up to 2 extra (s1, s2) = max 3 total
    // Keeps the card slide fast and not overwhelming
    this.cardImages = allImgs.slice(0, 3);

    // zoomImages — all images shown inside the zoom viewer popup
    // Can be as many as you add (s1, s2, s3, s4 ...)
    this.zoomImages = allImgs;
  }

  get displayPrice() { return `Rs. ${this.price}`; }
}


class ProductRepository {
  constructor(jsonPath) {
    this._path = jsonPath;
    this._list = [];
  }

  // Load products from products.json
  async load() {
    const res  = await fetch(this._path);
    const data = await res.json();
    this._list = data.map(d => new Product(d));
    return this._list;
  }

  all()    { return this._list; }
  byId(id) { return this._list.find(p => p.id === id); }

  // Products used in the hero slider (top N from config)
  heroSlides(count) { return this._list.slice(0, count); }

  // Used when products.json cannot be fetched (e.g. local testing)
  static fallback() {
    return [
      { id:1, name:"Golden Horizon",  price:"799", image:"https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80", tag:"Popular" },
      { id:2, name:"Midnight Forest", price:"899", image:"https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=600&q=80" },
      { id:3, name:"Desert Bloom",    price:"749", image:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80", tag:"New" },
      { id:4, name:"Ocean Calm",      price:"849", image:"https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&q=80" },
      { id:5, name:"Urban Lines",     price:"999", image:"https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80", tag:"Trending" },
      { id:6, name:"Soft Botanicals", price:"699", image:"https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80" },
    ].map(d => new Product(d));
  }
}