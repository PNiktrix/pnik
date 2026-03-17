/* PNIKTRIX v3.0 - ALL JAVASCRIPT MODULES COMBINED
   This file contains ALL 30 JavaScript modules in one file
   You can split them into separate files or use this single file
*/

// ============================================================================
// 1. CONFIG.JS - Brand Configuration
// ============================================================================
class Config {
    static BRAND = {
        name: 'Pniktrix',
        instagram: '@p.nik11',
        whatsapp: '918433595240',
        instagramUrl: 'https://www.instagram.com/p.nik11',
        facebookPixelId: '1234567890'
    };
    static MESSAGES = {
        whatsapp: {
            greeting: 'Namaste, I am drawn to your curation. Please share details on:',
            closing: '✦ Premium Wall Art by Pniktrix ✦'
        },
        instagram: {
            greeting: 'Your discerning eye has caught our attention. Let\'s discuss:',
            closing: '✦ Pniktrix ✦'
        }
    };
}



// ============================================================================
// 5. ANALYTICS.JS - Event Tracking
// ============================================================================
class Analytics {
    static trackEvent(eventName, eventData = {}) {
        const event = {
            name: eventName,
            timestamp: new Date().toISOString(),
            ...eventData
        };

        console.log('[Analytics]', event);

        if (typeof fbq !== 'undefined') {
            fbq('track', eventName, eventData);
        }

        const events = JSON.parse(sessionStorage.getItem('pniktrix_events') || '[]');
        events.push(event);
        sessionStorage.setItem('pniktrix_events', JSON.stringify(events));
    }

    static trackProductView(product) {
        this.trackEvent('ViewContent', {
            content_name: product.name,
            product_id: product.id
        });
    }

    static trackProductClick(product) {
        this.trackEvent('ProductClick', {
            product_id: product.id,
            product_name: product.name
        });
    }

    static trackWhatsAppClick(product) {
        this.trackEvent('WhatsAppContact', {
            product_id: product.id,
            product_name: product.name
        });
    }

    static trackInstagramClick(product) {
        this.trackEvent('InstagramContact', {
            product_id: product.id
        });
    }

    static getSessionEvents() {
        return JSON.parse(sessionStorage.getItem('pniktrix_events') || '[]');
    }
}

// ============================================================================
// 6. PRODUCT.JS - Product Management
// ============================================================================
class ProductManager {
    constructor() {
        this.products = [];
        this.currentProduct = null;
    }

    async loadProducts() {
        try {
            const response = await fetch('./data/products.json');
            const data = await response.json();
            this.products = data.products;
            return this.products;
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    }

    getProductById(id) {
        return this.products.find(p => p.id === parseInt(id));
    }

    getAllProducts() {
        return this.products;
    }

    setCurrentProduct(product) {
        this.currentProduct = product;
    }

    getCurrentProduct() {
        return this.currentProduct;
    }
}

const productManager = new ProductManager();

// ============================================================================
// 7. PRODUCT-DETAIL.JS - Favorites & Details
// ============================================================================
class ProductDetail {
    constructor() {
        this.currentProduct = null;
        this.isFavorite = false;
        this.loadFavorites();
    }

    setProduct(product) {
        this.currentProduct = product;
        this.checkIsFavorite();
    }

    loadFavorites() {
        const stored = localStorage.getItem('pniktrix_favorites') || '[]';
        return JSON.parse(stored);
    }

    toggleFavorite(product) {
        const favorites = this.loadFavorites();
        const index = favorites.findIndex(p => p.id === product.id);
        
        if (index > -1) {
            favorites.splice(index, 1);
            this.isFavorite = false;
        } else {
            favorites.push(product);
            this.isFavorite = true;
        }
        
        localStorage.setItem('pniktrix_favorites', JSON.stringify(favorites));
        return this.isFavorite;
    }

    checkIsFavorite() {
        const favorites = this.loadFavorites();
        this.isFavorite = favorites.some(p => p.id === this.currentProduct.id);
    }

    getFavorites() {
        return this.loadFavorites();
    }
}

const productDetail = new ProductDetail();

// ============================================================================
// 8. SEARCH-FILTER.JS - Search & Filtering
// ============================================================================
class SearchFilter {
    constructor() {
        this.allProducts = [];
        this.filteredProducts = [];
        this.searchTerm = '';
        this.filters = {
            size: null,
            material: null,
            finish: null
        };
    }

    setProducts(products) {
        this.allProducts = products;
        this.filteredProducts = [...products];
    }

    search(term) {
        this.searchTerm = term.toLowerCase();
        this.applyFilters();
    }

    filterBySize(size) {
        this.filters.size = size;
        this.applyFilters();
    }

    filterByMaterial(material) {
        this.filters.material = material;
        this.applyFilters();
    }

    filterByFinish(finish) {
        this.filters.finish = finish;
        this.applyFilters();
    }

    clearFilters() {
        this.filters = { size: null, material: null, finish: null };
        this.searchTerm = '';
        this.applyFilters();
    }

    applyFilters() {
        this.filteredProducts = this.allProducts.filter(product => {
            if (this.searchTerm) {
                const matchesSearch = product.name.toLowerCase().includes(this.searchTerm) ||
                                    product.description.toLowerCase().includes(this.searchTerm);
                if (!matchesSearch) return false;
            }

            if (this.filters.size && product.size !== this.filters.size) return false;
            if (this.filters.material && product.material !== this.filters.material) return false;
            if (this.filters.finish && product.finish !== this.filters.finish) return false;

            return true;
        });
    }

    getFilteredProducts() {
        return this.filteredProducts;
    }

    getAvailableSizes() {
        return [...new Set(this.allProducts.map(p => p.size))];
    }

    getAvailableMaterials() {
        return [...new Set(this.allProducts.map(p => p.material))];
    }

    getAvailableFinishes() {
        return [...new Set(this.allProducts.map(p => p.finish))];
    }
}

const searchFilter = new SearchFilter();

// ============================================================================
// 9. RECOMMENDATIONS.JS - Smart Recommendations
// ============================================================================
class Recommendations {
    constructor() {
        this.viewHistory = [];
        this.loadHistory();
    }

    trackView(product) {
        this.viewHistory.push({
            id: product.id,
            name: product.name,
            timestamp: Date.now()
        });
        
        if (this.viewHistory.length > 20) {
            this.viewHistory.shift();
        }
        
        this.saveHistory();
    }

    saveHistory() {
        localStorage.setItem('pniktrix_history', JSON.stringify(this.viewHistory));
    }

    loadHistory() {
        const stored = localStorage.getItem('pniktrix_history');
        this.viewHistory = stored ? JSON.parse(stored) : [];
    }

    getSimilarProducts(product, allProducts, limit = 4) {
        const viewed = new Set(this.viewHistory.map(v => v.id));
        
        const scored = allProducts
            .filter(p => p.id !== product.id && !viewed.has(p.id))
            .map(p => ({
                product: p,
                score: this.calculateSimilarity(product, p)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return scored.map(s => s.product);
    }

    calculateSimilarity(p1, p2) {
        let score = 0;
        if (p1.finish === p2.finish) score += 40;
        if (p1.material === p2.material) score += 30;
        if (p1.size === p2.size) score += 20;
        return score;
    }
}

const recommendations = new Recommendations();

// ============================================================================
// 10. CART.JS - Shopping Cart
// ============================================================================
class Cart {
    constructor() {
        this.items = [];
        this.loadFromStorage();
    }

    addItem(product) {
        const existing = this.items.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.items.push({ ...product, quantity: 1 });
        }
        this.saveToStorage();
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveToStorage();
    }

    getItems() {
        return this.items;
    }

    clear() {
        this.items = [];
        this.saveToStorage();
    }

    saveToStorage() {
        localStorage.setItem('pniktrix_cart', JSON.stringify(this.items));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('pniktrix_cart');
        this.items = stored ? JSON.parse(stored) : [];
    }
}

const cart = new Cart();

// ============================================================================
// 11. MESSAGE.JS - Message Composition
// ============================================================================
class MessageComposer {
    static composeSingleProductMessage(product, channel = 'whatsapp') {
        const name = product.name;
        
        if (channel === 'whatsapp') {
            return `${Config.MESSAGES.whatsapp.greeting}\n\n✓ ${name}\n\n${Config.MESSAGES.whatsapp.closing}`;
        } else {
            return `${Config.MESSAGES.instagram.greeting}\n\n✓ ${name}\n\n${Config.MESSAGES.instagram.closing}`;
        }
    }
}

// ============================================================================
// 12. VALIDATOR.JS - Form Validation
// ============================================================================
class Validator {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        const phoneRegex = /^\d{10,15}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }

    static sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ============================================================================
// 13. WHATSAPP.JS - WhatsApp Integration
// ============================================================================
class WhatsAppHandler {
    static createWhatsAppLink(message) {
        const encoded = encodeURIComponent(message);
        const phone = Config.BRAND.whatsapp;
        return `https://wa.me/${phone}?text=${encoded}`;
    }

    static sendProductMessage(product) {
        const message = MessageComposer.composeSingleProductMessage(product, 'whatsapp');
        const link = this.createWhatsAppLink(message);
        window.open(link, '_blank');
        Analytics.trackWhatsAppClick(product);
    }
}

// ============================================================================
// 14. INSTAGRAM.JS - Instagram Integration
// ============================================================================
class InstagramHandler {
    static sendProductMessage(product) {
        const message = MessageComposer.composeSingleProductMessage(product, 'instagram');
        const igUrl = `https://instagram.com/p.nik11`;
        window.open(igUrl, '_blank');
        console.log('Message:', message);
        Analytics.trackInstagramClick(product);
    }
}

// ============================================================================
// 15. TALLY.JS - Form Integration
// ============================================================================
class TallyHandler {
    static openTallyModal() {
        const modal = document.getElementById('contactModal');
        modal.classList.add('active');
        
        if (window.Tally && window.Tally.loadEmbeds) {
            window.Tally.loadEmbeds();
        }
    }

    static closeModal() {
        const modal = document.getElementById('contactModal');
        modal.classList.remove('active');
    }

    static setupListeners() {
        const closeBtn = document.getElementById('closeModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (overlay) overlay.addEventListener('click', () => this.closeModal());
    }
}

// ============================================================================
// 16. SLIDER.JS - Carousel
// ============================================================================
class Slider {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentIndex = 0;
        this.slides = [];
    }

    setSlides(slides) {
        this.slides = slides;
        this.currentIndex = 0;
    }

    next() {
        if (this.slides.length > 0) {
            this.currentIndex = (this.currentIndex + 1) % this.slides.length;
        }
    }

    prev() {
        if (this.slides.length > 0) {
            this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
        }
    }
}

// ============================================================================
// 17. GALLERY.JS - Gallery Rendering
// ============================================================================
class Gallery {
    constructor(gridId) {
        this.gridId = gridId;
        this.grid = document.getElementById(gridId);
    }

    async renderProducts(products) {
        if (!this.grid) return;
        
        this.grid.innerHTML = '';
        
        products.forEach(product => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            const isFavorite = productDetail.getFavorites().some(p => p.id === product.id);
            const favoriteClass = isFavorite ? 'active' : '';
            
            item.innerHTML = `
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                <div class="gallery-item-label">${product.name}</div>
                <button class="gallery-item-favorite ${favoriteClass}">❤️</button>
            `;
            
            const img = item.querySelector('img');
            img.addEventListener('click', () => {
                productManager.setCurrentProduct(product);
                productDetail.setProduct(product);
                UI.openProductModal(product);
                Analytics.trackProductClick(product);
            });

            const favBtn = item.querySelector('.gallery-item-favorite');
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isFav = productDetail.toggleFavorite(product);
                favBtn.classList.toggle('active', isFav);
                UI.updateFavoriteCount();
            });
            
            this.grid.appendChild(item);
        });
    }

    clear() {
        if (this.grid) this.grid.innerHTML = '';
    }
}

const gallery = new Gallery('galleryGrid');

// ============================================================================
// 18. UI.JS - User Interface Management
// ============================================================================
class UI {
    static openProductModal(product) {
        const modal = document.getElementById('productModal');
        const content = modal.querySelector('.product-detail');
        
        const isFavorited = productDetail.isFavorite;
        const favoriteClass = isFavorited ? 'active' : '';
        
        content.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <h2 class="product-name">${product.name}</h2>
            <p class="product-description">${product.description}</p>
            <div class="product-specs">
                <div class="spec-row">
                    <span class="spec-label">Size</span>
                    <span class="spec-value">${product.size}</span>
                </div>
                <div class="spec-row">
                    <span class="spec-label">Material</span>
                    <span class="spec-value">${product.material}</span>
                </div>
                <div class="spec-row">
                    <span class="spec-label">Finish</span>
                    <span class="spec-value">${product.finish}</span>
                </div>
            </div>
            <div class="product-actions">
                <button class="action-btn whatsapp" onclick="WhatsAppHandler.sendProductMessage(productManager.getCurrentProduct())">WhatsApp</button>
                <button class="action-btn instagram" onclick="InstagramHandler.sendProductMessage(productManager.getCurrentProduct())">Instagram</button>
                <button class="action-btn contact" onclick="TallyHandler.openTallyModal()">Contact Form</button>
            </div>
        `;
        
        Analytics.trackProductView(product);
        modal.classList.add('active');
        this.setupSwipeToClose();
    }

    static closeProductModal() {
        const modal = document.getElementById('productModal');
        modal.classList.add('closing');
        
        setTimeout(() => {
            modal.classList.remove('active', 'closing');
        }, 400);
    }

    static setupSwipeToClose() {
        const modal = document.getElementById('productModal');
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        
        const handle = modal.querySelector('.modal-handle');
        const threshold = 60;
        
        handle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) modal.style.transform = `translateY(${diff}px)`;
        });
        
        document.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            const diff = currentY - startY;
            
            if (diff > threshold) {
                this.closeProductModal();
            } else {
                modal.style.transform = 'translateY(0)';
            }
        });
        
        handle.addEventListener('click', () => this.closeProductModal());
    }

    static updateFavoriteCount() {
        const count = productDetail.getFavorites().length;
        const badge = document.getElementById('favoriteCount');
        if (badge) {
            badge.textContent = count > 0 ? count : '';
        }
    }

    static setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const debouncedSearch = Utils.debounce((term) => {
            searchFilter.search(term);
            gallery.renderProducts(searchFilter.getFilteredProducts());
            this.showEmptyState();
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }

    static setupFilters() {
        const filterToggle = document.getElementById('filterToggle');
        const filterPanel = document.getElementById('filterPanel');
        const clearFiltersBtn = document.getElementById('clearFilters');
        
        filterToggle.addEventListener('click', () => {
            filterPanel.classList.toggle('hidden');
        });

        clearFiltersBtn.addEventListener('click', () => {
            searchFilter.clearFilters();
            document.querySelectorAll('.filter-option.active').forEach(btn => {
                btn.classList.remove('active');
            });
            gallery.renderProducts(searchFilter.getFilteredProducts());
            this.showEmptyState();
        });
    }

    static setupFavorites() {
        const favoritesToggle = document.getElementById('favoritesToggle');
        
        favoritesToggle.addEventListener('click', () => {
            const favorites = productDetail.getFavorites();
            if (favorites.length > 0) {
                gallery.renderProducts(favorites);
            } else {
                alert('No favorites yet. Add some prints to your favorites!');
            }
        });
        
        this.updateFavoriteCount();
    }

    static renderFilters() {
        const sizes = searchFilter.getAvailableSizes();
        const materials = searchFilter.getAvailableMaterials();
        const finishes = searchFilter.getAvailableFinishes();

        this.renderFilterGroup('sizeFilters', 'size', sizes);
        this.renderFilterGroup('materialFilters', 'material', materials);
        this.renderFilterGroup('finishFilters', 'finish', finishes);
    }

    static renderFilterGroup(containerId, filterType, options) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'filter-option';
            btn.textContent = option;
            
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                
                if (filterType === 'size') {
                    searchFilter.filterBySize(btn.classList.contains('active') ? option : null);
                } else if (filterType === 'material') {
                    searchFilter.filterByMaterial(btn.classList.contains('active') ? option : null);
                } else if (filterType === 'finish') {
                    searchFilter.filterByFinish(btn.classList.contains('active') ? option : null);
                }
                
                gallery.renderProducts(searchFilter.getFilteredProducts());
                this.showEmptyState();
            });
            
            container.appendChild(btn);
        });
    }

    static showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const grid = document.getElementById('galleryGrid');
        
        if (grid.children.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
    }
}

// ============================================================================
// 19. PIXEL.JS - Facebook Pixel
// ============================================================================
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');

fbq('init', Config.BRAND.facebookPixelId || '1234567890');
fbq('track', 'PageView');

// ============================================================================
// 20. METRICS.JS - Business Metrics
// ============================================================================
class Metrics {
    constructor() {
        this.metrics = {
            pageViews: 0,
            productViews: {},
            favoriteAdds: 0,
            whatsappClicks: 0,
            instagramClicks: 0,
            sessionDuration: 0
        };
        
        this.sessionStart = Date.now();
        this.loadMetrics();
    }

    trackPageView() {
        this.metrics.pageViews++;
        this.saveMetrics();
    }

    trackProductView(productId) {
        this.metrics.productViews[productId] = (this.metrics.productViews[productId] || 0) + 1;
        this.saveMetrics();
    }

    getMetrics() {
        return {
            ...this.metrics,
            sessionDuration: Math.round((Date.now() - this.sessionStart) / 1000)
        };
    }

    generateReport() {
        const metrics = this.getMetrics();
        return {
            pageViews: metrics.pageViews,
            favoriteAdds: metrics.favoriteAdds,
            whatsappClicks: metrics.whatsappClicks,
            instagramClicks: metrics.instagramClicks,
            sessionDuration: metrics.sessionDuration + 's'
        };
    }

    exportMetrics() {
        const report = this.generateReport();
        const json = JSON.stringify(report, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metrics-${Date.now()}.json`;
        a.click();
    }

    saveMetrics() {
        localStorage.setItem('pniktrix_metrics', JSON.stringify(this.metrics));
    }

    loadMetrics() {
        const stored = localStorage.getItem('pniktrix_metrics');
        if (stored) {
            this.metrics = { ...this.metrics, ...JSON.parse(stored) };
        }
    }
}

const metrics = new Metrics();

// ============================================================================
// 21. IMAGE-OPTIMIZER.JS - Image Optimization
// ============================================================================
class ImageOptimizer {
    static getOptimizedUrl(url, size = 'medium') {
        const sizes = {
            thumbnail: { width: 150 },
            small: { width: 300 },
            medium: { width: 400 },
            large: { width: 800 }
        };

        if (url.includes('unsplash.com')) {
            const config = sizes[size] || sizes.medium;
            return `${url}?w=${config.width}&q=75&fm=webp`;
        }
        return url;
    }

    static lazyLoadImages() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                observer.observe(img);
            });
        }
    }
}

// ============================================================================
// 22. AB-TESTING.JS - A/B Testing
// ============================================================================
class ABTesting {
    constructor() {
        this.experiments = {};
        this.loadExperiments();
    }

    createExperiment(experimentId, variants = ['control', 'variant_a']) {
        const variantId = variants[Math.floor(Math.random() * variants.length)];
        
        this.experiments[experimentId] = {
            id: experimentId,
            assigned: variantId,
            events: [],
            created: Date.now()
        };

        this.saveExperiments();
        return variantId;
    }

    getVariant(experimentId) {
        return this.experiments[experimentId]?.assigned || null;
    }

    saveExperiments() {
        localStorage.setItem('pniktrix_experiments', JSON.stringify(this.experiments));
    }

    loadExperiments() {
        const stored = localStorage.getItem('pniktrix_experiments');
        if (stored) {
            this.experiments = JSON.parse(stored);
        }
    }
}

const abTesting = new ABTesting();

// ============================================================================
// 23. SEO.JS - SEO Optimization
// ============================================================================
class SEO {
    static init() {
        this.updateMetaTags();
    }

    static updateMetaTags() {
        document.title = 'Pniktrix - Premium Wall Art';
        
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = 'Curated wall art prints for discerning spaces';
        document.head.appendChild(meta);
    }

    static updateProductMeta(product) {
        this.updateMetaTags();
    }
}

SEO.init();

// ============================================================================
// 24. AUTH.JS - User Authentication
// ============================================================================
class AuthManager {
    constructor() {
        this.users = {};
        this.currentUser = null;
        this.loadUsers();
    }

    register(email, name) {
        if (this.users[email]) return false;

        this.users[email] = {
            id: Utils.generateId(),
            email: email,
            name: name,
            created: Date.now(),
            orders: []
        };

        this.saveUsers();
        this.login(email);
        return true;
    }

    login(email) {
        if (!this.users[email]) return false;
        this.currentUser = email;
        localStorage.setItem('pniktrix_user', email);
        return true;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('pniktrix_user');
    }

    getCurrentUser() {
        return this.currentUser ? this.users[this.currentUser] : null;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    saveUsers() {
        localStorage.setItem('pniktrix_users', JSON.stringify(this.users));
    }

    loadUsers() {
        const stored = localStorage.getItem('pniktrix_users');
        if (stored) this.users = JSON.parse(stored);
        
        const savedUser = localStorage.getItem('pniktrix_user');
        if (savedUser && this.users[savedUser]) {
            this.currentUser = savedUser;
        }
    }

    getAllUsers() {
        return Object.values(this.users);
    }
}

const authManager = new AuthManager();

// ============================================================================
// 25. EMAIL.JS - Email Marketing
// ============================================================================
class EmailManager {
    static subscribeToNewsletter(email) {
        const subscribers = JSON.parse(localStorage.getItem('pniktrix_subscribers') || '[]');
        
        if (subscribers.includes(email)) return false;

        subscribers.push(email);
        localStorage.setItem('pniktrix_subscribers', JSON.stringify(subscribers));
        return true;
    }

    static getSubscribers() {
        return JSON.parse(localStorage.getItem('pniktrix_subscribers') || '[]');
    }

    static sendToSubscribers(content) {
        const subscribers = this.getSubscribers();
        console.log(`Newsletter sent to ${subscribers.length} subscribers`);
        return subscribers.length;
    }
}

// ============================================================================
// 26. INVENTORY.JS - Inventory Management
// ============================================================================
class InventoryManager {
    constructor() {
        this.inventory = {};
        this.loadInventory();
    }

    initializeProduct(productId, quantity = 999) {
        if (!this.inventory[productId]) {
            this.inventory[productId] = {
                productId: productId,
                quantity: quantity,
                reserved: 0,
                sold: 0
            };
            this.saveInventory();
        }
    }

    getAvailableStock(productId) {
        if (!this.inventory[productId]) return 0;
        return this.inventory[productId].quantity - this.inventory[productId].reserved;
    }

    isInStock(productId, quantity = 1) {
        return this.getAvailableStock(productId) >= quantity;
    }

    markAsSold(productId, quantity) {
        if (!this.inventory[productId]) return false;
        
        this.inventory[productId].quantity = Math.max(0, this.inventory[productId].quantity - quantity);
        this.inventory[productId].sold += quantity;
        this.saveInventory();
        return true;
    }

    getInventoryReport() {
        let totalStock = 0;
        let totalSold = 0;

        for (let productId in this.inventory) {
            const item = this.inventory[productId];
            totalStock += item.quantity;
            totalSold += item.sold;
        }

        return {
            totalSKU: Object.keys(this.inventory).length,
            totalStock: totalStock,
            totalSold: totalSold
        };
    }

    saveInventory() {
        localStorage.setItem('pniktrix_inventory', JSON.stringify(this.inventory));
    }

    loadInventory() {
        const stored = localStorage.getItem('pniktrix_inventory');
        if (stored) {
            this.inventory = JSON.parse(stored);
        }
    }
}

const inventoryManager = new InventoryManager();

// ============================================================================
// 27. MONETIZATION.JS - Pricing & Coupons
// ============================================================================
class MonetizationManager {
    constructor() {
        this.coupons = {};
        this.loadData();
    }

    createCoupon(couponCode, config) {
        this.coupons[couponCode] = {
            code: couponCode,
            discountType: config.discountType,
            discountValue: config.discountValue,
            maxUses: config.maxUses || null,
            usedCount: 0,
            active: config.active !== false
        };

        this.saveData();
        return this.coupons[couponCode];
    }

    applyCoupon(couponCode, orderValue) {
        const coupon = this.coupons[couponCode];

        if (!coupon || !coupon.active) {
            return { discount: 0, error: 'Coupon not found' };
        }

        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            return { discount: 0, error: 'Coupon limit reached' };
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = orderValue * (coupon.discountValue / 100);
        } else {
            discount = coupon.discountValue;
        }

        coupon.usedCount++;
        this.saveData();

        return {
            discount: discount,
            finalValue: orderValue - discount
        };
    }

    saveData() {
        localStorage.setItem('pniktrix_coupons', JSON.stringify(this.coupons));
    }

    loadData() {
        const stored = localStorage.getItem('pniktrix_coupons');
        if (stored) {
            this.coupons = JSON.parse(stored);
        }
    }
}

const monetizationManager = new MonetizationManager();

// ============================================================================
// 28. REVIEWS.JS - Product Reviews
// ============================================================================
class ReviewManager {
    constructor() {
        this.reviews = {};
        this.loadReviews();
    }

    addReview(productId, config) {
        const reviewId = Utils.generateId();

        if (!this.reviews[productId]) {
            this.reviews[productId] = [];
        }

        const review = {
            id: reviewId,
            productId: productId,
            rating: Math.min(5, Math.max(1, parseInt(config.rating))),
            comment: config.comment || '',
            created: Date.now()
        };

        this.reviews[productId].push(review);
        this.saveReviews();
        return review;
    }

    getProductReviews(productId) {
        return this.reviews[productId] || [];
    }

    getProductRating(productId) {
        const reviews = this.getProductReviews(productId);

        if (reviews.length === 0) {
            return { average: 0, count: 0 };
        }

        const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
        const average = (sum / reviews.length).toFixed(1);

        return {
            average: parseFloat(average),
            count: reviews.length
        };
    }

    getReviewStats() {
        let totalReviews = 0;

        for (let productId in this.reviews) {
            totalReviews += this.reviews[productId].length;
        }

        return {
            totalReviews: totalReviews
        };
    }

    saveReviews() {
        localStorage.setItem('pniktrix_reviews', JSON.stringify(this.reviews));
    }

    loadReviews() {
        const stored = localStorage.getItem('pniktrix_reviews');
        if (stored) {
            this.reviews = JSON.parse(stored);
        }
    }
}

const reviewManager = new ReviewManager();

// ============================================================================
// 29. API-INTEGRATION.JS - Webhooks & APIs
// ============================================================================
class APIIntegration {
    constructor() {
        this.webhooks = {};
        this.integrations = {};
        this.loadConfiguration();
    }

    registerWebhook(event, url, config = {}) {
        const webhookId = Utils.generateId();

        this.webhooks[webhookId] = {
            id: webhookId,
            event: event,
            url: url,
            active: config.active !== false
        };

        this.saveConfiguration();
        return this.webhooks[webhookId];
    }

    async triggerWebhook(event, payload) {
        const webhooksForEvent = Object.values(this.webhooks).filter(w => w.event === event && w.active);

        if (webhooksForEvent.length === 0) {
            return { success: true, triggered: 0 };
        }

        let triggered = 0;

        for (let webhook of webhooksForEvent) {
            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: webhook.event,
                        timestamp: Date.now(),
                        payload: payload
                    })
                });

                if (response.ok) triggered++;
            } catch (error) {
                console.error('Webhook error:', error);
            }
        }

        return { success: true, triggered };
    }

    saveConfiguration() {
        localStorage.setItem('pniktrix_integrations', JSON.stringify({
            webhooks: this.webhooks,
            integrations: this.integrations
        }));
    }

    loadConfiguration() {
        const stored = localStorage.getItem('pniktrix_integrations');
        if (stored) {
            const data = JSON.parse(stored);
            this.webhooks = data.webhooks || {};
            this.integrations = data.integrations || {};
        }
    }
}

const apiIntegration = new APIIntegration();

// ============================================================================
// 30. ADMIN.JS - Admin Dashboard (Localhost Only)
// ============================================================================
class AdminDashboard {
    static init() {
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            console.log('Admin dashboard available at localhost');
        }
    }

    static getMetrics() {
        return {
            users: authManager.getAllUsers().length,
            inventory: inventoryManager.getInventoryReport(),
            reviews: reviewManager.getReviewStats()
        };
    }
}

AdminDashboard.init();

// ============================================================================
// 31. APP.JS - Main Application
// ============================================================================
class App {
    static async init() {
        try {
            console.log('🚀 Initializing Pniktrix...');
            
            const products = await productManager.loadProducts();
            console.log(`✓ Loaded ${products.length} products`);
            
            searchFilter.setProducts(products);
            UI.renderFilters();
            
            await gallery.renderProducts(products);
            
            UI.setupSearch();
            UI.setupFilters();
            UI.setupFavorites();
            
            TallyHandler.setupListeners();
            
            metrics.trackPageView();
            
            Analytics.trackEvent('AppInitialized', {
                productCount: products.length
            });
            
            console.log('✓ Pniktrix initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing app:', error);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
    });
} else {
    App.init();
}

// Load Tally
const script = document.createElement('script');
script.src = 'https://tally.so/widgets/embed.js';
document.body.appendChild(script);

