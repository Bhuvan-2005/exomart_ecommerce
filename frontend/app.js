let cart = [];
let wishlist = [];
let allProducts = [];
let featuredProducts = [];
let currentProduct = null;
let isDarkMode = false;
let pendingPayment = null;
let selectedPaymentMethod = 'card';

// API endpoints
const API_ENDPOINT = (window.EXOMART_CONFIG && window.EXOMART_CONFIG.API_ENDPOINT) ||
    'https://pzhzdsqarb.execute-api.us-east-1.amazonaws.com/prod';
let USER_ID = null;
const FALLBACK_PRODUCT_IMAGE = 'https://via.placeholder.com/400/667eea/ffffff?text=ExoMart';
const CURRENCY_SYMBOL = '₹';

function formatCurrency(amount) {
    const value = Number(amount) || 0;
    return `${CURRENCY_SYMBOL}${value.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function escapeHtml(value) {
    if (typeof value !== 'string') return value;
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeImageUrl(url) {
    if (typeof url !== 'string') return '';
    return url.trim();
}

function getProductImages(product = {}) {
    const primary = normalizeImageUrl(product.image || '');
    const candidateArrays = [product.images, product.gallery, product.additionalImages];
    const collected = [];

    if (primary) {
        collected.push(primary);
    }

    candidateArrays.forEach((list) => {
        if (Array.isArray(list)) {
            list.forEach((item) => {
                const normalized = normalizeImageUrl(item);
                if (normalized) {
                    collected.push(normalized);
                }
            });
        }
    });

    const unique = Array.from(new Set(collected));
    if (!unique.length) {
        unique.push(FALLBACK_PRODUCT_IMAGE);
    }
    return unique;
}

function getProductPrimaryImage(product = {}) {
    return getProductImages(product)[0];
}

function getSessionUser() {
    try {
        return JSON.parse(localStorage.getItem('loggedInUser')) || null;
    } catch (error) {
        console.error('Failed to parse session user', error);
        return null;
    }
}

function setSessionUser(user) {
    if (!user) {
        localStorage.removeItem('loggedInUser');
        return;
    }
    localStorage.setItem('loggedInUser', JSON.stringify(user));
}

function getCartUserId() {
    const user = getSessionUser();
    if (user && user.userId) {
        USER_ID = user.userId;
        return USER_ID;
    }

    if (!USER_ID) {
        USER_ID = 'guest-' + Math.random().toString(36).substring(7);
    }

    return USER_ID;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('ExoMart initialized!');
    console.log('API:', API_ENDPOINT);

    const sessionUser = getSessionUser();
    if (sessionUser && sessionUser.userId) {
        USER_ID = sessionUser.userId;
    }

    // Update auth UI (login/logout visibility)
    updateAuthUI();

    const requestedSection = localStorage.getItem('requestedSection');
    if (requestedSection) {
        localStorage.removeItem('requestedSection');
        if (document.getElementById(requestedSection)) {
            switchSection(requestedSection);
        }
    }

    // Hide loading screen after 2 seconds
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) loader.classList.add('hidden');
    }, 2000);
    
    // Load products
    loadProducts();
    
    // Initialize other features
    initializeFeatures();
    
    // Initialize Lex chat
    setTimeout(() => {
        if (typeof initializeLexChat === 'function') {
            initializeLexChat();
        }
    }, 1000);
    
    // Show back to top button on scroll
    window.addEventListener('scroll', handleScroll);
});

// --- AUTH UI HANDLER ---
// Updates Login / Logout visibility and small greeting
function updateAuthUI() {
    try {
        const user = getSessionUser();
        const loginLink = document.getElementById('login-link');
        const logoutLink = document.getElementById('logout-link');

        if (loginLink && logoutLink) {
            if (user) {
                loginLink.style.display = 'none';
                logoutLink.style.display = 'inline-flex';
            } else {
                loginLink.style.display = 'inline-flex';
                logoutLink.style.display = 'none';
            }
        }

        // Optionally show a small greeting on top-right
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            // Remove existing greet if any
            const existingGreet = document.querySelector('.user-greet');
            if (existingGreet) existingGreet.remove();

            if (user && user.name) {
                const span = document.createElement('span');
                span.className = 'user-greet';
                span.textContent = user.name;
                span.style.marginLeft = '0.75rem';
                span.style.fontWeight = '600';
                navActions.appendChild(span);
            }
        }
    } catch (e) {
        console.error('updateAuthUI error:', e);
    }

    renderAccountSection();
}

// AUTH: Check user auth status (no redirect) - kept for compatibility in other workflows
function checkAuthStatus() {
    try {
        // Only toggle UI; do NOT redirect to login. Dashboard is default.
        updateAuthUI();
    } catch (e) {
        console.error('Auth check error:', e);
    }
}

// AUTH: Logout function
function logout() {
    try {
        setSessionUser(null);
        localStorage.removeItem('authToken');
        USER_ID = null;
        // Clear local session-related state if needed (cart/wishlist kept or cleared depending on design)
        // For now we keep cart/wishlist in-memory, but you can clear them if required:
        // cart = []; wishlist = []; updateCartCount(); updateWishlistCount(); renderCart();
        updateAuthUI();
        showToast('Logged out successfully', 'success');
        // Return to dashboard (index.html)
        if (window.location.pathname && !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'index.html';
        } else {
            // if already on index, ensure sections react accordingly
            showHome();
        }
        renderAccountSection();
    } catch (e) {
        console.error('Logout error:', e);
    }
}

// Initialize app features
function initializeFeatures() {
    // Check for saved preferences
    checkUserPreferences();
    
    
    // Initialize search suggestions
    initializeSearchSuggestions();
}

// Check user preferences
function checkUserPreferences() {
    // Check for dark mode preference
    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference === 'true') {
        isDarkMode = true;
        enableDarkMode();
    } else if (darkModePreference === 'false') {
        isDarkMode = false;
        disableDarkMode();
    } else {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            isDarkMode = true;
            enableDarkMode();
        } else {
            isDarkMode = false;
            disableDarkMode();
        }
    }
}

// Load products from API
async function loadProducts() {
    try {
        const response = await fetch(`${API_ENDPOINT}/products`);
        const data = await response.json();
        
        if (data.success && data.products && data.products.length > 0) {
            allProducts = data.products;
            
            // Add rating to products (simulated)
            allProducts.forEach(product => {
                product.rating = (Math.random() * 2 + 3).toFixed(1); // Random rating between 3.0 and 5.0
                product.reviews = Math.floor(Math.random() * 100) + 1; // Random number of reviews
                product.discount = Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 10 : 0; // Random discount for some products
            });
            
            // Display products
            displayProducts(allProducts);
            
            // Set featured products (first 6 products)
            featuredProducts = allProducts.slice(0, 6);
            displayFeaturedProducts(featuredProducts);
            
            // Populate categories
            populateCategories();
            renderCategories();
        } else {
            const grid = document.getElementById('products-grid');
            if (grid) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem;">No products found. Add some via Admin!</p>';
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load products', 'error');
        
        // Load sample products for demo
        loadSampleProducts();
    }
}

// Load sample products for demo
function loadSampleProducts() {
    allProducts = [
        {
            id: '1',
            name: 'Premium Wireless Headphones',
            description: 'High-quality wireless headphones with noise cancellation and long battery life.',
            price: 199.99,
            category: 'Electronics',
            stock: 50,
            image: 'https://picsum.photos/seed/headphones-main/600/450.jpg',
            images: [
                'https://picsum.photos/seed/headphones-main/600/450.jpg',
                'https://picsum.photos/seed/headphones-detail-1/600/450.jpg',
                'https://picsum.photos/seed/headphones-detail-2/600/450.jpg',
                'https://picsum.photos/seed/headphones-case/600/450.jpg'
            ],
            rating: 4.5,
            reviews: 87,
            discount: 20
        },
        {
            id: '2',
            name: 'Smart Watch Pro',
            description: 'Advanced smartwatch with health monitoring, GPS, and water resistance.',
            price: 299.99,
            category: 'Electronics',
            stock: 30,
            image: 'https://picsum.photos/seed/smartwatch-main/600/450.jpg',
            images: [
                'https://picsum.photos/seed/smartwatch-main/600/450.jpg',
                'https://picsum.photos/seed/smartwatch-face/600/450.jpg',
                'https://picsum.photos/seed/smartwatch-band/600/450.jpg',
                'https://picsum.photos/seed/smartwatch-box/600/450.jpg'
            ],
            rating: 4.7,
            reviews: 124,
            discount: 0
        },
        {
            id: '3',
            name: 'Ultra HD Webcam',
            description: 'Professional 4K webcam with auto-focus and built-in microphone.',
            price: 149.99,
            category: 'Electronics',
            stock: 75,
            image: 'https://picsum.photos/seed/webcam-main/600/450.jpg',
            images: [
                'https://picsum.photos/seed/webcam-main/600/450.jpg',
                'https://picsum.photos/seed/webcam-angle-1/600/450.jpg',
                'https://picsum.photos/seed/webcam-angle-2/600/450.jpg'
            ],
            rating: 4.3,
            reviews: 56,
            discount: 15
        },
        {
            id: '4',
            name: 'Portable SSD 1TB',
            description: 'High-speed portable SSD with 1TB capacity and USB-C connectivity.',
            price: 179.99,
            category: 'Electronics',
            stock: 40,
            image: 'https://picsum.photos/seed/ssd-main/600/450.jpg',
            images: [
                'https://picsum.photos/seed/ssd-main/600/450.jpg',
                'https://picsum.photos/seed/ssd-cable/600/450.jpg',
                'https://picsum.photos/seed/ssd-case/600/450.jpg'
            ],
            rating: 4.8,
            reviews: 92,
            discount: 0
        },
        {
            id: '5',
            name: 'Wireless Gaming Mouse',
            description: 'Precision gaming mouse with customizable RGB lighting and programmable buttons.',
            price: 89.99,
            category: 'Electronics',
            stock: 60,
            image: 'https://picsum.photos/seed/mouse-main/600/450.jpg',
            images: [
                'https://picsum.photos/seed/mouse-main/600/450.jpg',
                'https://picsum.photos/seed/mouse-side/600/450.jpg',
                'https://picsum.photos/seed/mouse-rgb/600/450.jpg'
            ],
            rating: 4.6,
            reviews: 78,
            discount: 10
        },
        {
            id: '6',
            name: 'Mechanical Keyboard',
            description: 'Premium mechanical keyboard with RGB backlighting and tactile switches.',
            price: 129.99,
            category: 'Electronics',
            stock: 35,
            image: 'https://picsum.photos/seed/keyboard-main/600/450.jpg',
            images: [
                'https://picsum.photos/seed/keyboard-main/600/450.jpg',
                'https://picsum.photos/seed/keyboard-profile/600/450.jpg',
                'https://picsum.photos/seed/keyboard-rgb/600/450.jpg'
            ],
            rating: 4.7,
            reviews: 103,
            discount: 25
        }
    ];
    
    // Display products
    displayProducts(allProducts);
    
    // Set featured products (first 6 products)
    featuredProducts = allProducts.slice(0, 6);
    displayFeaturedProducts(featuredProducts);
    
    // Populate categories
    populateCategories();
    renderCategories();
}

// Display products in grid
function displayProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem;">No products match your search.</p>';
        return;
    }
    
    grid.innerHTML = products.map(p => createProductCard(p)).join('');
}

// Display featured products
function displayFeaturedProducts(products) {
    const grid = document.getElementById('featured-products-grid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem;">No featured products available.</p>';
        return;
    }
    
    grid.innerHTML = products.map(p => createProductCard(p)).join('');
}

// Create product card HTML
function createProductCard(product) {
    const priceValue = Number(product.price) || 0;
    const discountValue = Number(product.discount) || 0;
    const discountedPriceValue = discountValue > 0
        ? (priceValue * (1 - discountValue / 100))
        : priceValue;
    const formattedPrice = formatCurrency(priceValue);
    const formattedDiscountedPrice = formatCurrency(discountedPriceValue);

    const stockCount = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0;
    const stockClass = stockCount > 10 ? 'in-stock' : 'low-stock';
    const stockLabel = stockCount > 10
        ? `In Stock (${stockCount})`
        : stockCount > 0
            ? `Only ${stockCount} left!`
            : 'Out of Stock';

    const images = getProductImages(product);
    const primaryImage = escapeHtml(images[0] || FALLBACK_PRODUCT_IMAGE);
    const productIdAttr = String(product.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const safeName = escapeHtml(product.name || 'Product');
    const safeCategory = escapeHtml(product.category || 'General');
    const safeDescription = escapeHtml(product.description || '');
    const ratingValue = Number(product.rating) || 0;
    const reviewCount = Number(product.reviews) || 0;
    const speechName = (product.name || '').replace(/'/g, "\\'");
    const speechDescription = (product.description || '').replace(/'/g, "\\'");

    return `
        <div class="product-card" onclick="quickViewProduct('${productIdAttr}')">
            <div class="product-image-container">
                <img src="${primaryImage}" 
                     class="product-image" alt="${safeName}">
                <div class="product-actions">
                    <div class="action-icon" onclick="event.stopPropagation(); event.preventDefault(); addToWishlist('${productIdAttr}'); return false;">
                        <i class="fas fa-heart"></i>
                    </div>
                    <div class="action-icon" onclick="event.stopPropagation(); event.preventDefault(); quickViewProduct('${productIdAttr}'); return false;">
                        <i class="fas fa-eye"></i>
                    </div>
                    <div class="action-icon" onclick="event.stopPropagation(); event.preventDefault(); compareProduct('${productIdAttr}'); return false;">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                </div>
                <span class="stock-badge ${stockClass}">
                    ${stockLabel}
                </span>
                ${discountValue > 0 ? `<div class="discount-badge">-${discountValue}%</div>` : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${safeCategory}</div>
                <h3 class="product-name">${safeName}</h3>
                <p class="product-description">${safeDescription}</p>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(ratingValue)}
                    </div>
                    <span class="rating-count">(${reviewCount})</span>
                </div>
                <div class="product-footer">
                    <div class="product-price-section">
                        ${discountValue > 0
                            ? `<span class="product-price">${formattedDiscountedPrice}</span>
                               <span class="original-price">${formattedPrice}</span>`
                            : `<span class="product-price">${formattedPrice}</span>`
                        }
                    </div>
                    <div class="product-action-buttons">
                        <button class="btn btn-primary btn-product-action" onclick="event.stopPropagation(); event.preventDefault(); addToCart('${productIdAttr}'); return false;">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                        <button class="btn btn-outline btn-product-action" onclick="event.stopPropagation(); event.preventDefault(); addToWishlist('${productIdAttr}'); return false;">
                            <i class="fas fa-heart"></i> Wishlist
                        </button>
                        <button class="btn btn-secondary btn-product-action" onclick="handleListenClick(event, '${productIdAttr}')">
                            <i class="fas fa-volume-up"></i> Listen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Generate star rating HTML
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let starsHTML = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (halfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }
    
    return starsHTML;
}

// Populate category filter
function populateCategories() {
    const categories = [...new Set(allProducts.map(p => p.category))];
    const select = document.getElementById('category-filter');
    if (!select) return;
    select.innerHTML = '<option value="">All Categories</option>' + 
        categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

// Search products
function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    
    if (query.length > 2) {
        // Show search suggestions
        showSearchSuggestions(query);
    } else {
        // Hide search suggestions
        const suggestionsEl = document.getElementById('search-suggestions');
        if (suggestionsEl) suggestionsEl.classList.remove('active');
    }
}

// Perform search
function performSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    const query = input.value.toLowerCase();
    
    if (query) {
        const filtered = allProducts.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
        
        displayProducts(filtered);
        showProducts();
        
        // Hide search suggestions
        const suggestionsEl = document.getElementById('search-suggestions');
        if (suggestionsEl) suggestionsEl.classList.remove('active');
    }
}

// Show search suggestions
function showSearchSuggestions(query) {
    const suggestions = allProducts.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    ).slice(0, 5);
    
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (!suggestionsContainer) return;
    
    if (suggestions.length > 0) {
        suggestionsContainer.innerHTML = suggestions.map(p => `
            <div class="suggestion-item" onclick="selectSuggestion('${p.id}')">
                <img src="${p.image || 'https://via.placeholder.com/40/667eea/ffffff?text=' + encodeURIComponent(p.name)}" alt="${p.name}">
                <div>
                    <div>${p.name}</div>
                    <div style="font-size: 0.9em; color: var(--text-light);">${formatCurrency(p.price)}</div>
                </div>
            </div>
        `).join('');
        
        suggestionsContainer.classList.add('active');
    } else {
        suggestionsContainer.innerHTML = '<div class="suggestion-item">No products found</div>';
        suggestionsContainer.classList.add('active');
    }
}

// Select search suggestion
function selectSuggestion(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        const input = document.getElementById('search-input');
        if (input) input.value = product.name;
        const suggestionsEl = document.getElementById('search-suggestions');
        if (suggestionsEl) suggestionsEl.classList.remove('active');
        quickViewProduct(productId);
    }
}

// Filter products by category
function filterByCategory(category) {
    if (category === 'Hot Deals') {
        showDeals();
        return;
    }
    
    const filtered = allProducts.filter(p => p.category === category);
    displayProducts(filtered);
    showProducts();
}

// Filter products
function filterProducts() {
    const categoryEl = document.getElementById('category-filter');
    const category = categoryEl ? categoryEl.value : '';
    displayProducts(category ? allProducts.filter(p => p.category === category) : allProducts);
}

// Sort products
function sortProducts() {
    const sortEl = document.getElementById('sort-select');
    const sortBy = sortEl ? sortEl.value : '';
    let sorted = [...allProducts];
    
    switch (sortBy) {
        case 'price-low':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'rating':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        case 'newest':
            sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
    }
    
    displayProducts(sorted);
}

// Quick view product
function quickViewProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    currentProduct = product;
    
    const priceValue = Number(product.price) || 0;
    const discountValue = Number(product.discount) || 0;
    const discountedPriceValue = discountValue > 0
        ? (priceValue * (1 - discountValue / 100))
        : priceValue;
    const formattedPrice = formatCurrency(priceValue);
    const formattedDiscountedPrice = formatCurrency(discountedPriceValue);
    const reviewCount = Number(product.reviews) || 0;
    const ratingValue = Number(product.rating) || 0;
    const stockCount = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0;
    const quantityMax = stockCount > 0 ? stockCount : 9999;

    const productImages = getProductImages(product);
    const mainImage = escapeHtml(productImages[0] || FALLBACK_PRODUCT_IMAGE);
    const thumbnailsHtml = productImages
        .map((img, index) => `
                <img src="${escapeHtml(img)}" 
                     class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeImage(this)" alt="${escapeHtml(product.name || 'Product')}">
            `)
        .join('');

    const safeName = escapeHtml(product.name || 'Product');
    const safeDescription = escapeHtml(product.description || '');
    
    const modalContent = document.getElementById('product-quick-view');
    if (!modalContent) return;
    modalContent.innerHTML = `
        <div class="product-gallery">
            <div class="product-gallery-image-wrapper">
                <img src="${mainImage}" 
                     class="main-image" id="main-image" alt="${safeName}">
                ${discountValue > 0 ? `<div class="discount-badge modal-discount-badge">-${discountValue}%</div>` : ''}
            </div>
            <div class="thumbnail-images">
                ${thumbnailsHtml}
            </div>
        </div>
        <div class="product-details">
            <h2 class="product-title">${safeName}</h2>
            <div class="product-rating">
                <div class="stars">
                    ${generateStars(ratingValue)}
                </div>
                <span class="rating-count">(${reviewCount} reviews)</span>
            </div>
            <div class="product-price-section">
                ${discountValue > 0 
                    ? `<span class="current-price">${formattedDiscountedPrice}</span>
                       <span class="original-price">${formattedPrice}</span>`
                    : `<span class="current-price">${formattedPrice}</span>`
                }
            </div>
            <p class="product-description">${safeDescription}</p>
            <div class="product-actions">
                <div class="product-action-row">
                    <div class="quantity-selector">
                        <button class="quantity-btn" onclick="event.stopPropagation(); event.preventDefault(); decreaseQuantity(); return false;" type="button">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" id="product-quantity" class="quantity-input" value="1" min="1" max="${quantityMax}" onclick="event.stopPropagation();">
                        <button class="quantity-btn" onclick="event.stopPropagation(); event.preventDefault(); increaseQuantity(); return false;" type="button">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="btn btn-primary btn-large" onclick="addToCartFromModal(event)">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
                <button class="btn btn-outline btn-large" onclick="addToWishlistFromModal(event)">
                    <i class="fas fa-heart"></i> Add to Wishlist
                </button>
            </div>
            <div class="product-features">
                <div class="benefit-item">
                    <i class="fas fa-truck"></i>
                    <span>Free Shipping on orders over ₹4,000</span>
                </div>
                <div class="benefit-item">
                    <i class="fas fa-shield-alt"></i>
                    <span>1 Year Warranty</span>
                </div>
                <div class="benefit-item">
                    <i class="fas fa-undo"></i>
                    <span>30-Day Return Policy</span>
                </div>
            </div>
        </div>
    `;
    
    // Show modal
    document.getElementById('product-modal').classList.add('active');
}

// Change product image in quick view
function changeImage(thumbnail) {
    // Update main image
    const mainImage = document.getElementById('main-image');
    if (mainImage) mainImage.src = thumbnail.src;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    thumbnail.classList.add('active');
}

// Close product modal
function closeProductModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('active');
}

// Increase quantity in modal
function increaseQuantity() {
    const input = document.getElementById('product-quantity');
    if (!input) return;
    const max = parseInt(input.getAttribute('max'));
    if (parseInt(input.value) < max) {
        input.value = parseInt(input.value) + 1;
    }
}

// Decrease quantity in modal
function decreaseQuantity() {
    const input = document.getElementById('product-quantity');
    if (!input) return;
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

// Add to cart from modal
function addToCartFromModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!currentProduct) return;
    
    const quantityInput = document.getElementById('product-quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
    addToCart(currentProduct.id, quantity);
    closeProductModal();
}

// Add to wishlist from modal
function addToWishlistFromModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!currentProduct) return;
    
    addToWishlist(currentProduct.id);
    closeProductModal();
}

// Add product to cart (requires login)
async function addToCart(productId, quantity = 1) {
    // Check login
    const user = getSessionUser();
    if (!user) {
        showToast('Please login to add items to cart', 'info');
        // Optionally open login modal or redirect to login page:
        // window.location.href = 'login.html';
        return;
    }

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const existing = cart.find(i => i.productId === productId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ 
            productId, 
            name: product.name, 
            price: parseFloat(product.price), // Ensure price is a number
            image: product.image,
            quantity 
        });
    }
    
    updateCartCount();
    showToast(`Added to cart!`, 'success');
    
    try {
        await fetch(`${API_ENDPOINT}/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: getCartUserId(), productId, quantity })
        });
    } catch (e) {
        console.error('Error updating cart on server:', e);
    }
}

// Add product to wishlist (requires login)
function addToWishlist(productId) {
    // Check login
    const user = getSessionUser();
    if (!user) {
        showToast('Please login to add items to wishlist', 'info');
        return;
    }

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const existing = wishlist.find(i => i.productId === productId);
    if (existing) {
        showToast(`${product.name} is already in your wishlist!`, 'info');
        return;
    }
    
    wishlist.push({ 
        productId, 
        name: product.name, 
        price: parseFloat(product.price), // Ensure price is a number
        image: product.image
    });
    
    updateWishlistCount();
    renderWishlist();
    showToast(`Added to wishlist!`, 'success');
}

// Compare product
function compareProduct(productId) {
    // This would open a comparison modal or navigate to a comparison page
    showToast('Product comparison feature coming soon!', 'info');
}

// Update cart count
function updateCartCount() {
    const count = cart.reduce((sum, i) => sum + i.quantity, 0);
    const el = document.getElementById('cart-count');
    if (el) el.textContent = count;
    const menuEl = document.getElementById('cart-count-menu');
    if (menuEl) menuEl.textContent = count;
}

// Update wishlist count
function updateWishlistCount() {
    const count = wishlist.length;
    const el = document.getElementById('wishlist-count');
    if (el) el.textContent = count;
    const menuEl = document.getElementById('wishlist-count-menu');
    if (menuEl) menuEl.textContent = count;
}

function renderWishlist() {
    const container = document.getElementById('wishlist-items');
    if (!container) return;

    if (wishlist.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 3rem;">No favourites yet. Explore products and add the ones you love!</p>';
        return;
    }

    container.innerHTML = wishlist.map(item => {
        const price = Number(item.price) || 0;
        const productIdAttr = String(item.productId).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const safeName = escapeHtml(item.name || 'Product');
        const safeImage = escapeHtml(item.image || FALLBACK_PRODUCT_IMAGE);
        return `
        <div class="wishlist-card glass-panel">
            <div class="wishlist-card-image">
                <img src="${safeImage}" alt="${safeName}">
            </div>
            <div class="wishlist-card-details">
                <h3>${safeName}</h3>
                <p class="wishlist-price">${formatCurrency(price)}</p>
                <div class="wishlist-actions">
                    <button class="btn btn-primary" onclick="moveWishlistToCart('${productIdAttr}')">
                        <i class="fas fa-cart-plus"></i> Move to Cart
                    </button>
                    <button class="btn btn-outline" onclick="removeFromWishlist('${productIdAttr}')">
                        <i class="fas fa-times"></i> Remove
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function removeFromWishlist(productId, silent = false) {
    const item = wishlist.find(i => i.productId === productId);
    if (!item) return;

    wishlist = wishlist.filter(i => i.productId !== productId);
    updateWishlistCount();
    renderWishlist();

    if (!silent) {
        showToast(`${item.name} removed from wishlist`, 'info');
    }
}

function moveWishlistToCart(productId) {
    const user = getSessionUser();
    if (!user) {
        showToast('Please login to move items to cart', 'info');
        return;
    }

    const item = wishlist.find(i => i.productId === productId);
    if (!item) return;

    addToCart(productId);
    removeFromWishlist(productId, true);
}

// Render cart
function renderCart() {
    const container = document.getElementById('cart-items');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 3rem;">Cart is empty</p>';
        const subtotalEl = document.getElementById('cart-subtotal');
        const taxEl = document.getElementById('cart-tax');
        const totalEl = document.getElementById('cart-total');
        if (subtotalEl) subtotalEl.textContent = formatCurrency(0);
        if (taxEl) taxEl.textContent = formatCurrency(0);
        if (totalEl) totalEl.textContent = formatCurrency(0);
        return;
    }
    
    let subtotal = 0;
    container.innerHTML = cart.map(item => {
        // Ensure price is a valid number
        const price = parseFloat(item.price) || 0;
        const total = price * item.quantity;
        subtotal += total;
        return `
            <div class="cart-item">
                <img src="${item.image || 'https://via.placeholder.com/100/667eea/ffffff?text=' + encodeURIComponent(item.name)}" 
                     class="cart-item-image" alt="${item.name}">
                <div class="cart-item-details">
                    <h3 class="cart-item-name">${item.name}</h3>
                    <p class="cart-item-price">${formatCurrency(price)}</p>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateCartItemQuantity('${item.productId}', -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItemQuantity('${item.productId}', 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="cart-item-total">
                    <h3>${formatCurrency(total)}</h3>
                    <button class="btn-text" onclick="removeFromCart('${item.productId}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');
    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (taxEl) taxEl.textContent = formatCurrency(tax);
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

function renderAccountSection() {
    const container = document.getElementById('account-details');
    if (!container) return;

    const user = getSessionUser();

    if (!user) {
        container.innerHTML = `
        <div class="account-card glass-panel">
            <h3>Welcome to ExoMart</h3>
            <p class="account-subtext">Sign in to access your orders, saved addresses, and loyalty rewards.</p>
            <div class="account-actions">
                <a class="btn btn-primary" href="login.html">
                    <i class="fas fa-sign-in-alt"></i> Login to Continue
                </a>
                <a class="btn btn-outline" href="signup.html">
                    <i class="fas fa-user-plus"></i> Create New Account
                </a>
            </div>
        </div>`;
        return;
    }

    const safeName = escapeHtml(user.name || 'Customer');
    const safeEmail = escapeHtml(user.email || 'Not provided');
    const providerRaw = user.provider ? user.provider.charAt(0).toUpperCase() + user.provider.slice(1) : 'Password';
    const safeProvider = escapeHtml(providerRaw);
    const createdDate = user.createdAt ? new Date(user.createdAt) : null;
    const lastLoginDate = user.lastLoginAt ? new Date(user.lastLoginAt) : null;

    const createdAt = createdDate && !Number.isNaN(createdDate.getTime())
        ? createdDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Just now';

    const lastLogin = lastLoginDate && !Number.isNaN(lastLoginDate.getTime())
        ? lastLoginDate.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : 'Active now';

    container.innerHTML = `
        <div class="account-summary glass-panel">
            <div>
                <h3>${safeName}</h3>
                <p class="account-subtext">${safeEmail}</p>
            </div>
            <div class="account-meta">
                <div>
                    <span class="account-meta-label">Member Since</span>
                    <span>${createdAt}</span>
                </div>
                <div>
                    <span class="account-meta-label">Signed in via</span>
                    <span>${safeProvider}</span>
                </div>
                <div>
                    <span class="account-meta-label">Last Active</span>
                    <span>${lastLogin}</span>
                </div>
            </div>
            <div class="account-summary-actions">
                <button class="btn btn-outline" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        </div>

        <div class="account-grid">
            <div class="account-card glass-panel">
                <h4><i class="fas fa-box"></i> Recent Orders</h4>
                <p class="account-subtext">Orders will appear here once you start shopping.</p>
                <button class="btn btn-primary" onclick="showCart()">
                    <i class="fas fa-shopping-cart"></i> View Cart
                </button>
            </div>
            <div class="account-card glass-panel">
                <h4><i class="fas fa-map-marker-alt"></i> Saved Addresses</h4>
                <p class="account-subtext">Securely add and manage your delivery locations.</p>
                <button class="btn btn-outline" onclick="showCustomerService()">
                    <i class="fas fa-plus-circle"></i> Update Address
                </button>
            </div>
            <div class="account-card glass-panel">
                <h4><i class="fas fa-star"></i> Rewards</h4>
                <p class="account-subtext">Earn loyalty points on every order. Program launching soon!</p>
            </div>
        </div>
    `;
}

function renderCategories() {
    const container = document.getElementById('categories-grid');
    if (!container) return;

    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

    if (categories.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 3rem;">No categories available yet. Add products to see them organised here.</p>';
        return;
    }

    const icons = ['fa-laptop', 'fa-mobile-alt', 'fa-headphones', 'fa-tshirt', 'fa-chair', 'fa-bolt', 'fa-leaf', 'fa-gamepad', 'fa-book', 'fa-gem'];

    container.innerHTML = categories.sort().map((category, index) => {
        const count = allProducts.filter(p => p.category === category).length;
        const safeCategory = escapeHtml(category);
        const productCountLabel = count === 1 ? '1 product' : `${count} products`;
        const icon = icons[index % icons.length] || 'fa-box';
        const categoryAttr = category.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

        return `
            <div class="category-card glass-panel" onclick="viewCategory('${categoryAttr}')">
                <div class="category-icon-wrap">
                    <i class="fas ${icon}"></i>
                </div>
                <div>
                    <h4>${safeCategory}</h4>
                    <p>${productCountLabel}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderPaymentSection() {
    const container = document.getElementById('payment-container');
    if (!container) return;

    const user = getSessionUser();

    if (!pendingPayment || !user) {
        container.innerHTML = `
            <div class="payment-empty glass-panel">
                <h3>Ready to checkout?</h3>
                <p>Review your cart and start the payment flow once you are ready.</p>
                <button class="btn btn-primary" onclick="showCart()">
                    <i class="fas fa-shopping-cart"></i> Review Cart
                </button>
            </div>`;
        return;
    }

    const itemsMarkup = pendingPayment.items.map(item => `
        <div class="payment-item">
            <div>
                <h4>${escapeHtml(item.name)}</h4>
                <p>${item.quantity} × ${formatCurrency(item.unitPrice)}</p>
            </div>
            <div class="payment-item-total">${formatCurrency(item.lineTotal)}</div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="payment-layout">
            <div class="payment-summary glass-panel">
                <h3>Order Summary</h3>
                <div class="payment-items">
                    ${itemsMarkup}
                </div>
                <div class="payment-totals">
                    <div><span>Subtotal</span><span>${formatCurrency(pendingPayment.subtotal)}</span></div>
                    <div><span>Tax (10%)</span><span>${formatCurrency(pendingPayment.tax)}</span></div>
                    <div class="payment-total"><span>Total payable</span><span>${formatCurrency(pendingPayment.total)}</span></div>
                </div>
                <p class="payment-note">All prices inclusive of GST. You’ll receive a payment receipt via email.</p>
            </div>
            <div class="payment-form glass-panel">
                <h3>Payment Method</h3>
                <div class="payment-options-grid">
                    <div class="payment-option-card ${selectedPaymentMethod === 'card' ? 'active' : ''}" onclick="selectPaymentMethod('card')">
                        <i class="fas fa-credit-card"></i>
                        <h4>Cards</h4>
                        <p>Pay securely using Visa, Mastercard, RuPay and Amex.</p>
                    </div>
                    <div class="payment-option-card ${selectedPaymentMethod === 'netbanking' ? 'active' : ''}" onclick="selectPaymentMethod('netbanking')">
                        <i class="fas fa-university"></i>
                        <h4>Net Banking</h4>
                        <p>Pay directly via your preferred bank.</p>
                    </div>
                    <div class="payment-option-card ${selectedPaymentMethod === 'upi' ? 'active' : ''}" onclick="selectPaymentMethod('upi')">
                        <i class="fas fa-mobile-alt"></i>
                        <h4>UPI / Wallets</h4>
                        <p>Instant payouts through UPI apps and leading wallets.</p>
                    </div>
                </div>
                <form id="payment-form">
                    <div id="card-payment-form">
                        <div class="form-group">
                            <label for="card-name">Cardholder Name</label>
                            <input type="text" id="card-name" placeholder="As printed on card">
                        </div>
                        <div class="form-group">
                            <label for="card-number">Card Number</label>
                            <input type="text" id="card-number" placeholder="0000 0000 0000 0000" maxlength="19">
                        </div>
                        <div class="payment-form-row">
                            <div class="form-group">
                                <label for="card-expiry">Expiry</label>
                                <input type="text" id="card-expiry" placeholder="MM/YY" maxlength="5">
                            </div>
                            <div class="form-group">
                                <label for="card-cvv">CVV</label>
                                <input type="password" id="card-cvv" placeholder="123" maxlength="4">
                            </div>
                        </div>
                    </div>
                    <div id="netbanking-payment-form" style="display: none;">
                        <div class="form-group">
                            <label for="bank-select">Select Bank</label>
                            <select id="bank-select">
                                <option value="">Choose your bank</option>
                                <option value="HDFC">HDFC Bank</option>
                                <option value="ICICI">ICICI Bank</option>
                                <option value="SBI">State Bank of India</option>
                                <option value="Axis">Axis Bank</option>
                                <option value="Kotak">Kotak Mahindra Bank</option>
                                <option value="PNB">Punjab National Bank</option>
                                <option value="BOI">Bank of India</option>
                                <option value="Canara">Canara Bank</option>
                                <option value="Union">Union Bank of India</option>
                                <option value="IDFC">IDFC First Bank</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="netbanking-account">Account Holder Name</label>
                            <input type="text" id="netbanking-account" placeholder="As per bank records">
                        </div>
                    </div>
                    <div id="upi-payment-form" style="display: none;">
                        <div class="form-group">
                            <label for="upi-id">UPI ID / Phone Number</label>
                            <input type="text" id="upi-id" placeholder="yourname@paytm or 9876543210">
                        </div>
                        <div class="form-group">
                            <label for="upi-provider">UPI Provider</label>
                            <select id="upi-provider">
                                <option value="">Select provider</option>
                                <option value="Google Pay">Google Pay</option>
                                <option value="PhonePe">PhonePe</option>
                                <option value="Paytm">Paytm</option>
                                <option value="BHIM">BHIM UPI</option>
                                <option value="Amazon Pay">Amazon Pay</option>
                                <option value="Cred">CRED</option>
                                <option value="Mobikwik">MobiKwik</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="billing-email">Billing Email</label>
                        <input type="email" id="billing-email" placeholder="you@example.com" value="${escapeHtml(user.email || '')}" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-large">
                        <i class="fas fa-shield-alt"></i> Pay ${formatCurrency(pendingPayment.total)}
                    </button>
                    <button type="button" class="btn btn-outline" style="margin-left: 0.75rem;" onclick="showCart()">
                        <i class="fas fa-arrow-left"></i> Back to Cart
                    </button>
                    <p class="payment-secure"><i class="fas fa-lock"></i> Payments secured with bank-grade encryption.</p>
                </form>
            </div>
        </div>
    `;

    const form = document.getElementById('payment-form');
    if (form && !form.dataset.bound) {
        form.addEventListener('submit', processPayment);
        form.dataset.bound = 'true';
    }

    updatePaymentFormVisibility();
    setupPaymentFormHandlers();
}

function setupPaymentFormHandlers() {
    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s+/g, '');
            if (value.length > 16) value = value.slice(0, 16);
            const formatted = value.replace(/(.{4})/g, '$1 ').trim();
            e.target.value = formatted;
        });
    }

    const cardExpiryInput = document.getElementById('card-expiry');
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    renderPaymentSection();
}

function updatePaymentFormVisibility() {
    const cardForm = document.getElementById('card-payment-form');
    const netbankingForm = document.getElementById('netbanking-payment-form');
    const upiForm = document.getElementById('upi-payment-form');

    if (cardForm) {
        cardForm.style.display = selectedPaymentMethod === 'card' ? 'block' : 'none';
        const cardFields = cardForm.querySelectorAll('input');
        cardFields.forEach(field => {
            if (selectedPaymentMethod === 'card') {
                field.setAttribute('required', 'required');
            } else {
                field.removeAttribute('required');
            }
        });
    }
    
    if (netbankingForm) {
        netbankingForm.style.display = selectedPaymentMethod === 'netbanking' ? 'block' : 'none';
        const netbankingFields = netbankingForm.querySelectorAll('input, select');
        netbankingFields.forEach(field => {
            if (selectedPaymentMethod === 'netbanking') {
                field.setAttribute('required', 'required');
            } else {
                field.removeAttribute('required');
            }
        });
    }
    
    if (upiForm) {
        upiForm.style.display = selectedPaymentMethod === 'upi' ? 'block' : 'none';
        const upiFields = upiForm.querySelectorAll('input, select');
        upiFields.forEach(field => {
            if (selectedPaymentMethod === 'upi') {
                field.setAttribute('required', 'required');
            } else {
                field.removeAttribute('required');
            }
        });
    }
}

async function processPayment(event) {
    event.preventDefault();

    const user = getSessionUser();
    if (!user || !pendingPayment) {
        showToast('Payment session expired. Please try again.', 'error');
        showCart();
        return;
    }

    const payButton = event.target.querySelector('button[type="submit"]');
    const payableDisplay = formatCurrency(pendingPayment.total);
    if (payButton) {
        payButton.disabled = true;
        payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    const billingEmail = document.getElementById('billing-email').value.trim();

    let paymentData = {};
    let method = selectedPaymentMethod;

    if (method === 'card') {
        const cardName = document.getElementById('card-name').value.trim();
        const cardNumber = document.getElementById('card-number').value.replace(/\s+/g, '');
        const cardExpiry = document.getElementById('card-expiry').value.trim();
        const cardCvv = document.getElementById('card-cvv').value.trim();

        if (!cardName || cardNumber.length < 12 || !cardExpiry || !cardCvv) {
            showToast('Please fill all card details', 'error');
            if (payButton) {
                payButton.disabled = false;
                payButton.innerHTML = `<i class="fas fa-shield-alt"></i> Pay ${payableDisplay}`;
            }
            return;
        }

        paymentData = {
            card: {
                name: cardName,
                number: cardNumber,
                expiry: cardExpiry,
                cvv: cardCvv,
            },
        };
    } else if (method === 'netbanking') {
        const bank = document.getElementById('bank-select').value.trim();
        const accountName = document.getElementById('netbanking-account').value.trim();

        if (!bank || !accountName) {
            showToast('Please select bank and enter account holder name', 'error');
            if (payButton) {
                payButton.disabled = false;
                payButton.innerHTML = `<i class="fas fa-shield-alt"></i> Pay ${payableDisplay}`;
            }
            return;
        }

        paymentData = {
            netbanking: {
                bank,
                accountName,
            },
        };
    } else if (method === 'upi') {
        const upiId = document.getElementById('upi-id').value.trim();
        const upiProvider = document.getElementById('upi-provider').value.trim();

        if (!upiId || !upiProvider) {
            showToast('Please enter UPI ID and select provider', 'error');
            if (payButton) {
                payButton.disabled = false;
                payButton.innerHTML = `<i class="fas fa-shield-alt"></i> Pay ${payableDisplay}`;
            }
            return;
        }

        const isValidUPI = /^[\w.-]+@[\w]+|^\d{10}$/.test(upiId);
        if (!isValidUPI) {
            showToast('Please enter a valid UPI ID (e.g., name@paytm) or phone number', 'error');
            if (payButton) {
                payButton.disabled = false;
                payButton.innerHTML = `<i class="fas fa-shield-alt"></i> Pay ${payableDisplay}`;
            }
            return;
        }

        paymentData = {
            upi: {
                id: upiId,
                provider: upiProvider,
            },
        };
    }

    try {
        const payload = {
            userId: user.userId,
            orderId: pendingPayment.orderId || null,
            amount: pendingPayment.total,
            currency: 'INR',
            method,
            items: pendingPayment.items,
            metadata: {
                email: billingEmail,
            },
            ...paymentData,
        };

        const response = await fetch(`${API_ENDPOINT}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Payment failed');
        }

        const receipt = {
            paymentId: data.payment.paymentId,
            status: data.payment.status,
            amount: data.payment.amount,
            currency: data.payment.currency,
            method: data.payment.method,
            card: data.payment.card || null,
            netbanking: data.payment.netbanking || null,
            upi: data.payment.upi || null,
            processedAt: data.payment.processedAt,
            subtotal: pendingPayment.subtotal,
            tax: pendingPayment.tax,
            total: pendingPayment.total,
            items: pendingPayment.items,
            user: {
                name: user.name,
                email: user.email,
            },
        };

        localStorage.setItem('lastPaymentReceipt', JSON.stringify(receipt));

        cart = [];
        pendingPayment = null;
        updateCartCount();
        renderCart();

        window.location.href = 'payment-success.html';
    } catch (error) {
        console.error('Payment error:', error);
        showToast(error.message || 'Unable to process payment', 'error');
    } finally {
        if (payButton) {
            payButton.disabled = false;
            payButton.innerHTML = `<i class="fas fa-shield-alt"></i> Pay ${payableDisplay}`;
        }
    }
}

// Update cart item quantity
function updateCartItemQuantity(productId, change) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        renderCart();
        updateCartCount();
    }
}

// Remove from cart
function removeFromCart(productId) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    cart = cart.filter(i => i.productId !== productId);
    renderCart();
    updateCartCount();
    showToast(`${item.name} removed from cart`, 'info');
}

// Clear cart
function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        renderCart();
        updateCartCount();
        showToast('Cart cleared', 'info');
    }
}

// Checkout
function checkout() {
    // require login for checkout
    const user = getSessionUser();
    if (!user) {
        showToast('Please login to proceed to checkout', 'info');
        return;
    }

    if (cart.length === 0) {
        showToast('Cart is empty!', 'error');
        return;
    }
    
    const breakdown = cart.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.price) || 0,
        lineTotal: (Number(item.price) || 0) * item.quantity,
    }));

    const subtotal = breakdown.reduce((sum, i) => sum + i.lineTotal, 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    pendingPayment = {
        subtotal,
        tax,
        total,
        items: breakdown,
    };

    selectedPaymentMethod = 'card';
    renderPaymentSection();
    switchSection('payment-section');
}

// Add product (admin)
async function addProduct(e) {
    e.preventDefault();
    
    const primaryImageInput = document.getElementById('product-image');
    const galleryInput = document.getElementById('product-gallery');
    const primaryImage = primaryImageInput && primaryImageInput.value ? primaryImageInput.value.trim() : '';
    const galleryImages = galleryInput && galleryInput.value
        ? galleryInput.value
            .split(',')
            .map(url => url.trim())
            .filter(Boolean)
        : [];

    const product = {
        name: document.getElementById('product-name').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value),
        category: document.getElementById('product-category').value,
        stock: parseInt(document.getElementById('product-stock').value),
        image: primaryImage || undefined,
        images: galleryImages.length ? galleryImages : undefined
    };
    
    try {
        const response = await fetch(`${API_ENDPOINT}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`${product.name} added!`, 'success');
            e.target.reset();
            loadProducts();
        } else {
            showToast('Failed to add product', 'error');
        }
    } catch (error) {
        showToast('Error adding product', 'error');
    }
}

// Delete product (admin)
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const response = await fetch(`${API_ENDPOINT}/products/${productId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Product deleted successfully', 'success');
            // Refresh product list after deletion
            loadProducts();
            updateAdminStats();
            // Refresh admin products list
            renderAdminProducts();
        } else {
            showToast('Failed to delete product', 'error');
        }
    } catch (error) {
        console.error('Delete product error:', error);
        showToast('Error deleting product', 'error');
    }
}

// Render admin products list
function renderAdminProducts() {
    const container = document.getElementById('admin-products-list');
    if (!container) return;
    
    if (allProducts.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No products found</p>';
        return;
    }
    
    container.innerHTML = allProducts.map(product => {
        const productImages = getProductImages(product);
        const primaryImage = escapeHtml(productImages[0]);
        const safeName = escapeHtml(product.name || 'Product');
        const safeCategory = escapeHtml(product.category || 'General');
        const priceValue = Number(product.price) || 0;
        const stockValue = Number(product.stock) || 0;
        const imageCount = productImages.length;
        const productIdAttr = String(product.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

        return `
        <div class="admin-product-item">
            <img src="${primaryImage}" 
                 class="admin-product-image" alt="${safeName}">
            <div class="admin-product-details">
                <h4>${safeName}</h4>
                <p>Category: ${safeCategory}</p>
                <p>Price: ${formatCurrency(priceValue)}</p>
                <p>Stock: ${stockValue}</p>
                <p>Images: ${imageCount}</p>
            </div>
            <div class="admin-product-actions">
                <button class="btn btn-danger" onclick="deleteProduct('${productIdAttr}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// Update admin stats
function updateAdminStats() {
    const prodEl = document.getElementById('admin-products');
    if (prodEl) prodEl.textContent = allProducts.length;
    const revenue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const revEl = document.getElementById('admin-revenue');
    if (revEl) revEl.textContent = formatCurrency(revenue);
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;
    
    // Set message and type
    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;
    
    // Set icon based on type
    const icon = toast.querySelector('i');
    if (icon) {
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
        } else if (type === 'info') {
            icon.className = 'fas fa-info-circle';
        }
    }
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close premium banner
function closeBanner() {
    const banner = document.getElementById('premium-banner');
    if (banner) banner.style.display = 'none';
}

// Toggle dark mode
function toggleDarkMode() {
    if (isDarkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
}

// Enable dark mode
function enableDarkMode() {
    document.body.classList.add('dark-mode');
    const icon = document.getElementById('dark-mode-icon');
    if (icon) icon.className = 'fas fa-sun';
    localStorage.setItem('darkMode', 'true');
    isDarkMode = true;
}

// Disable dark mode
function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    const icon = document.getElementById('dark-mode-icon');
    if (icon) icon.className = 'fas fa-moon';
    localStorage.setItem('darkMode', 'false');
    isDarkMode = false;
}

// Toggle navigation menu dropdown
function toggleNavMenu(event) {
    if (event) {
        event.stopPropagation();
    }
    const dropdown = document.getElementById('nav-menu-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close navigation menu dropdown
function closeNavMenu() {
    const dropdown = document.getElementById('nav-menu-dropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('nav-menu-dropdown');
    const menuBtn = document.querySelector('.nav-menu-btn');
    if (dropdown && menuBtn && !dropdown.contains(event.target) && !menuBtn.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// Initialize search suggestions
function initializeSearchSuggestions() {
    // Close search suggestions when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.nav-search')) {
            const suggestions = document.getElementById('search-suggestions');
            if (suggestions) suggestions.classList.remove('active');
        }
    });
}

// Handle scroll events
function handleScroll() {
    const backToTopButton = document.getElementById('back-to-top');
    const mainNav = document.getElementById('main-nav');
    
    // Show/hide back to top button
    if (backToTopButton) {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('show');
        } else {
            backToTopButton.classList.remove('show');
        }
    }
    
    // Add scrolled class to main nav
    if (mainNav) {
        if (window.scrollY > 50) {
            mainNav.classList.add('scrolled');
        } else {
            mainNav.classList.remove('scrolled');
        }
    }
}

// Scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Toggle mobile menu
function toggleMobileMenu() {
    // This would toggle a mobile menu in a real implementation
    showToast('Mobile menu coming soon!', 'info');
}

// Navigation functions
function showHome() {
    switchSection('home-section');
}

function showProducts() {
    switchSection('products-section');
}

function showCart() {
    switchSection('cart-section');
}

function showAdmin() {
    switchSection('admin-section');
}

function showWishlist() {
    switchSection('wishlist-section');
}

function showAccount() {
    switchSection('account-section');
}

function showQuickLinks() {
    switchSection('quicklinks-section');
}

function showCategories() {
    switchSection('categories-section');
}

function showCustomerService() {
    switchSection('customer-service-section');
}

function showDeals() {
    // Filter products with discounts
    const deals = allProducts.filter(p => p.discount > 0);
    displayProducts(deals);
    showProducts();
}

function showAllProducts() {
    displayProducts(allProducts);
    showProducts();
}

function viewCategory(category) {
    filterByCategory(category);
}

// Footer Quick Links Handlers
function showAboutUs() {
    showCustomerService();
    showToast('About Us: ExoMart is a premium e-commerce platform by Team Alchemists at VIT Chennai. We provide quality products with fast campus delivery.', 'info');
}

function showContact() {
    showCustomerService();
    showToast('Contact us at support@exomart.com or call +91 94911 49955. Available 8 AM - 10 PM IST.', 'info');
}

function showFAQs() {
    showCustomerService();
    showToast('FAQs: Check the Customer Service section for frequently asked questions and answers.', 'info');
}

function showTerms() {
    showToast('Terms & Conditions: By using ExoMart, you agree to our terms of service. For detailed terms, contact support@exomart.com', 'info');
}

function showPrivacy() {
    showToast('Privacy Policy: We respect your privacy. Your data is securely stored and never shared. For details, contact support@exomart.com', 'info');
}

// Footer Category Handlers
function filterCategoryFromFooter(category) {
    // Map footer category names to actual category names in database
    const categoryMap = {
        'Home & Living': 'Home',
        'Electronics': 'Electronics',
        'Fashion': 'Fashion',
        'Sports': 'Sports',
        'Books': 'Books'
    };
    
    const actualCategory = categoryMap[category] || category;
    filterByCategory(actualCategory);
}

// Footer Customer Service Handlers
function showTrackOrder() {
    const user = getSessionUser();
    if (!user) {
        showToast('Please login to track your orders', 'warning');
        window.location.href = 'login.html';
        return;
    }
    showAccount();
    showToast('Track your orders from the Recent Orders section in your Account.', 'info');
}

function showReturns() {
    showCustomerService();
    showToast('Returns: Initiate returns within 30 days. Check Customer Service section for details.', 'info');
}

function showShippingInfo() {
    showCustomerService();
    showToast('Shipping Info: Campus Express provides same-day delivery to VIT Chennai. Check Customer Service for details.', 'info');
}

function showPaymentMethods() {
    if (cart.length === 0) {
        showToast('Add items to cart to see payment methods', 'info');
        showCart();
    } else {
        checkout();
    }
}

function showGiftCards() {
    showToast('Gift Cards: Coming soon! Gift cards will be available for purchase.', 'info');
}

// Handle Listen button click with proper event handling
function handleListenClick(event, productId) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  const product = allProducts.find(p => p.id === productId);
  if (!product) {
    showToast('Product not found', 'error');
    return false;
  }
  
  const priceValue = Number(product.price) || 0;
  const speechName = escapeHtml(product.name || 'Product');
  const speechDescription = escapeHtml(product.description || '');
  
  playTextToSpeech(`Product: ${speechName}. ${speechDescription} Price: ${priceValue} rupees`);
  return false;
}

// AWS Polly Text-to-Speech Integration
async function playTextToSpeech(text) {
  try {
    showToast('Generating speech...', 'info');
    
    const response = await fetch(`${API_ENDPOINT}/polly/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Speech synthesis failed.');
    }
    
    const audioBase64 = await response.text();
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    
    audio.onloadeddata = () => {
      showToast('Playing audio...', 'success');
    };
    
    audio.onerror = () => {
      showToast('Error playing audio', 'error');
    };
    
    audio.play();
  } catch (error) {
    console.error('Polly playback error:', error);
    showToast('Failed to play text-to-speech', 'error');
  }
}


function switchSection(id) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    

    document.querySelectorAll('.nav-action-btn').forEach(link => {
        if (link.dataset && link.dataset.section === id) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    if (id === 'cart-section') {
        renderCart();
    } else if (id === 'wishlist-section') {
        renderWishlist();
    } else if (id === 'account-section') {
        renderAccountSection();
    } else if (id === 'admin-section') {
        updateAdminStats();
        renderAdminProducts();
    } else if (id === 'categories-section') {
        renderCategories();
    } else if (id === 'payment-section') {
        renderPaymentSection();
    }
}

// ==================== AMAZON LEX CHAT INTEGRATION ====================

let lexChatSessionId = null;
let lexChatOpen = false;
let lexUnreadCount = 0;

// Initialize Lex chat
function initializeLexChat() {
    const user = getSessionUser();
    const userId = user ? user.userId : 'guest';
    lexChatSessionId = `exomart-${userId}-${Date.now()}`;
    
    // Load saved session if available
    const savedSession = localStorage.getItem('lexChatSessionId');
    if (savedSession) {
        lexChatSessionId = savedSession;
    } else {
        localStorage.setItem('lexChatSessionId', lexChatSessionId);
    }
    
    // Check if chat was open previously
    const wasOpen = localStorage.getItem('lexChatOpen') === 'true';
    if (wasOpen) {
        toggleLexChat();
    }
}

// Toggle chat widget visibility
function toggleLexChat() {
    const widget = document.getElementById('lex-chat-widget');
    const toggle = document.getElementById('lex-chat-toggle');
    const toggleIcon = document.getElementById('lex-chat-toggle-icon');
    
    if (!widget || !toggle) return;
    
    lexChatOpen = !lexChatOpen;
    
    if (lexChatOpen) {
        widget.classList.add('active');
        toggle.classList.add('active');
        if (toggleIcon) {
            toggleIcon.className = 'fas fa-times';
        }
        lexUnreadCount = 0;
        updateLexChatBadge();
        localStorage.setItem('lexChatOpen', 'true');
        
        // Focus input
        setTimeout(() => {
            const input = document.getElementById('lex-chat-input');
            if (input) input.focus();
        }, 100);
    } else {
        widget.classList.remove('active');
        toggle.classList.remove('active');
        if (toggleIcon) {
            toggleIcon.className = 'fas fa-comments';
        }
        localStorage.setItem('lexChatOpen', 'false');
    }
}

// Handle Enter key in chat input
function handleLexChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendLexMessage();
    }
}

// Send message to Lex
async function sendLexMessage() {
    const input = document.getElementById('lex-chat-input');
    const sendBtn = document.getElementById('lex-chat-send-btn');
    
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    // Disable input and button
    input.disabled = true;
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    // Add user message to chat
    addLexMessage(message, 'user');
    input.value = '';
    
    // Show typing indicator
    const typingId = addLexTypingIndicator();
    
    try {
        const user = getSessionUser();
        const userId = user ? user.userId : 'guest';
        
        const response = await fetch(`${API_ENDPOINT}/lex/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                sessionId: lexChatSessionId,
                userId: userId,
            }),
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        removeLexTypingIndicator(typingId);
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to get response');
        }
        
        // Update session ID if provided
        if (data.sessionId) {
            lexChatSessionId = data.sessionId;
            localStorage.setItem('lexChatSessionId', lexChatSessionId);
        }
        
        // Handle intent-specific actions first (this may add its own messages)
        let shouldShowLexMessage = true;
        
        if (data.intent) {
            // Check if we successfully handled the intent
            const handled = handleLexIntent(data.intent, data.slots, data.message);
            // If we handled it and it's an action intent, don't show the generic Lex message
            const actionIntents = ['AddToCart', 'RemoveFromCart', 'AddToWishlist', 'SearchProducts', 'ViewCart', 'ViewDeals', 'ViewWishlist', 'ThankYou', 'Thanks', 'NoThanks', 'Yes', 'YesHelp', 'No', 'NoHelp'];
            if (handled && actionIntents.includes(data.intent)) {
                shouldShowLexMessage = false;
            }
        }
        
        // Only show Lex message if we didn't handle it or if it's just informational
        if (shouldShowLexMessage && data.message && !data.message.includes("couldn't process") && !data.message.includes("apologize")) {
            addLexMessage(data.message, 'bot', data.intent, data.slots);
        } else if (shouldShowLexMessage && (data.isElicitingSlot || data.isConfirmingIntent)) {
            // Show message if Lex is asking for more info
            addLexMessage(data.message, 'bot', data.intent, data.slots);
        }
        
    } catch (error) {
        console.error('Lex chat error:', error);
        removeLexTypingIndicator(typingId);
        addLexMessage('Sorry, I encountered an error. Please try again or contact support.', 'bot', null, null, true);
    } finally {
        // Re-enable input and button
        input.disabled = false;
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
        input.focus();
    }
}

// Add message to chat UI
function addLexMessage(text, type = 'bot', intent = null, slots = null, isError = false) {
    const messagesContainer = document.getElementById('lex-chat-messages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `lex-message lex-message-${type}`;
    
    if (type === 'bot') {
        const avatar = document.createElement('div');
        avatar.className = 'lex-message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        messageDiv.appendChild(avatar);
    }
    
    const content = document.createElement('div');
    content.className = 'lex-message-content';
    if (isError) {
        content.classList.add('lex-message-error');
    }
    
    const textP = document.createElement('p');
    textP.textContent = text;
    content.appendChild(textP);
    
    // Add quick action buttons for certain intents
    if (intent && type === 'bot' && !isError) {
        addLexQuickActions(content, intent, slots);
    }
    
    messageDiv.appendChild(content);
    
    if (type === 'user') {
        messagesContainer.appendChild(messageDiv);
    } else {
        messagesContainer.appendChild(messageDiv);
    }
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // If chat is closed, increment unread count
    if (!lexChatOpen && type === 'bot') {
        lexUnreadCount++;
        updateLexChatBadge();
    }
}

// Add typing indicator
function addLexTypingIndicator() {
    const messagesContainer = document.getElementById('lex-chat-messages');
    if (!messagesContainer) return null;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'lex-message lex-message-bot lex-typing-indicator';
    typingDiv.id = 'lex-typing-' + Date.now();
    
    const avatar = document.createElement('div');
    avatar.className = 'lex-message-avatar';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    typingDiv.appendChild(avatar);
    
    const content = document.createElement('div');
    content.className = 'lex-message-content';
    content.innerHTML = '<div class="lex-typing-dots"><span></span><span></span><span></span></div>';
    typingDiv.appendChild(content);
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return typingDiv.id;
}

// Remove typing indicator
function removeLexTypingIndicator(typingId) {
    if (!typingId) return;
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
}

// Handle Lex intents and perform actions
// Returns true if intent was successfully handled
function handleLexIntent(intent, slots, message) {
    let handled = false;
    
    // Handle different intents
    if (intent === 'SearchProducts' || intent === 'FindProduct') {
        // Extract product name or category from slots
        const productName = slots?.ProductName?.value?.originalValue || slots?.productName?.value?.originalValue;
        const category = slots?.Category?.value?.originalValue || slots?.category?.value?.originalValue;
        
        if (productName) {
            // Search for product
            const input = document.getElementById('search-input');
            if (input) {
                input.value = productName;
                performSearch();
                showProducts();
                addLexMessage(`I've searched for "${productName}" for you. Check the products section!`, 'bot');
                handled = true;
            }
        } else if (category) {
            filterByCategory(category);
            showProducts();
            addLexMessage(`I've filtered products by "${category}" for you.`, 'bot');
            handled = true;
        }
    } else if (intent === 'AddToCart' || intent === 'AddItem') {
        const productName = slots?.ProductName?.value?.originalValue || slots?.productName?.value?.originalValue;
        if (productName) {
            // Try to find product and add to cart
            const product = allProducts.find(p => 
                p.name.toLowerCase().includes(productName.toLowerCase())
            );
            if (product) {
                addToCart(product.id);
                addLexMessage(`I've added "${product.name}" to your cart!`, 'bot');
                handled = true;
            } else {
                // Product not found
                addLexMessage(`I couldn't find a product matching "${productName}". Please check the product name and try again.`, 'bot');
                handled = true;
            }
        }
    } else if (intent === 'ViewCart' || intent === 'CheckCart') {
        showCart();
        addLexMessage('I\'ve opened your cart for you!', 'bot');
        handled = true;
    } else if (intent === 'ViewWishlist') {
        showWishlist();
        addLexMessage('I\'ve opened your wishlist for you!', 'bot');
        handled = true;
    } else if (intent === 'ViewDeals' || intent === 'ShowDeals') {
        showDeals();
        addLexMessage('I\'ve shown you the hot deals!', 'bot');
        handled = true;
    } else if (intent === 'RemoveFromCart' || intent === 'RemoveItem') {
        const productName = slots?.ProductName?.value?.originalValue || slots?.productName?.value?.originalValue;
        if (productName) {
            // Try to find product in cart and remove it
            const product = allProducts.find(p => 
                p.name.toLowerCase().includes(productName.toLowerCase())
            );
            if (product) {
                const cartItem = cart.find(item => item.productId === product.id);
                if (cartItem) {
                    removeFromCart(product.id);
                    addLexMessage(`I've removed "${product.name}" from your cart.`, 'bot');
                    handled = true;
                } else {
                    addLexMessage(`"${product.name}" is not in your cart.`, 'bot');
                    handled = true;
                }
            } else {
                addLexMessage(`I couldn't find a product matching "${productName}".`, 'bot');
                handled = true;
            }
        }
    } else if (intent === 'AddToWishlist' || intent === 'SaveToWishlist') {
        const productName = slots?.ProductName?.value?.originalValue || slots?.productName?.value?.originalValue;
        if (productName) {
            // Try to find product and add to wishlist
            const product = allProducts.find(p => 
                p.name.toLowerCase().includes(productName.toLowerCase())
            );
            if (product) {
                addToWishlist(product.id);
                addLexMessage(`I've added "${product.name}" to your wishlist!`, 'bot');
                handled = true;
            } else {
                addLexMessage(`I couldn't find a product matching "${productName}". Please check the product name and try again.`, 'bot');
                handled = true;
            }
        }
    } else if (intent === 'ThankYou' || intent === 'Thanks' || intent === 'NoThanks') {
        addLexMessage('You\'re welcome! Is there anything else I can help you with?', 'bot');
        handled = true;
    } else if (intent === 'Yes' || intent === 'YesHelp') {
        addLexMessage('Great! What would you like me to help you with? You can search for products, add items to cart, view deals, and more!', 'bot');
        handled = true;
    } else if (intent === 'No' || intent === 'NoHelp') {
        addLexMessage('Thank you for using ExoMart! Have a great day!', 'bot');
        handled = true;
    }
    
    // Add follow-up question after successful actions
    if (handled && (intent === 'AddToCart' || intent === 'RemoveFromCart' || intent === 'AddToWishlist')) {
        setTimeout(() => {
            addLexMessage('Is there anything else I can help you with?', 'bot');
        }, 1500);
    }
    
    return handled;
}

// Add quick action buttons
function addLexQuickActions(content, intent, slots) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'lex-quick-actions';
    
    if (intent === 'SearchProducts' || intent === 'FindProduct') {
        const viewProductsBtn = document.createElement('button');
        viewProductsBtn.className = 'lex-quick-action-btn';
        viewProductsBtn.textContent = 'View All Products';
        viewProductsBtn.onclick = () => {
            showProducts();
            addLexMessage('I\'ve opened the products section for you!', 'bot');
        };
        actionsDiv.appendChild(viewProductsBtn);
    } else if (intent === 'AddToCart' || intent === 'RemoveFromCart' || intent === 'AddToWishlist') {
        // Show quick actions after cart/wishlist operations
        const viewCartBtn = document.createElement('button');
        viewCartBtn.className = 'lex-quick-action-btn';
        viewCartBtn.textContent = 'View Cart';
        viewCartBtn.onclick = () => {
            showCart();
            addLexMessage('I\'ve opened your cart for you!', 'bot');
        };
        actionsDiv.appendChild(viewCartBtn);
        
        const viewWishlistBtn = document.createElement('button');
        viewWishlistBtn.className = 'lex-quick-action-btn';
        viewWishlistBtn.textContent = 'View Wishlist';
        viewWishlistBtn.onclick = () => {
            showWishlist();
            addLexMessage('I\'ve opened your wishlist for you!', 'bot');
        };
        actionsDiv.appendChild(viewWishlistBtn);
    } else if (intent === 'ThankYou' || intent === 'Yes') {
        // Show help options
        const searchBtn = document.createElement('button');
        searchBtn.className = 'lex-quick-action-btn';
        searchBtn.textContent = 'Search Products';
        searchBtn.onclick = () => {
            showProducts();
            addLexMessage('I\'ve opened the products section for you!', 'bot');
        };
        actionsDiv.appendChild(searchBtn);
        
        const dealsBtn = document.createElement('button');
        dealsBtn.className = 'lex-quick-action-btn';
        dealsBtn.textContent = 'View Deals';
        dealsBtn.onclick = () => {
            showDeals();
            addLexMessage('I\'ve shown you the hot deals!', 'bot');
        };
        actionsDiv.appendChild(dealsBtn);
    }
    
    if (actionsDiv.children.length > 0) {
        content.appendChild(actionsDiv);
    }
}

// Update chat badge
function updateLexChatBadge() {
    const badge = document.getElementById('lex-chat-badge');
    if (badge) {
        if (lexUnreadCount > 0) {
            badge.textContent = lexUnreadCount > 99 ? '99+' : lexUnreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Lex chat initialization is handled in the main DOMContentLoaded event above
