let cart = [];
let wishlist = [];
let allProducts = [];
let featuredProducts = [];
let currentProduct = null;
let isDarkMode = false;

// API endpoints
const API_ENDPOINT = 'https://pzhzdsqarb.execute-api.us-east-1.amazonaws.com/prod';
const USER_ID = 'user-' + Math.random().toString(36).substring(7);

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('ExoMart initialized!');
    console.log('API:', API_ENDPOINT);

    // Update auth UI (login/logout visibility)
    updateAuthUI();

    // Hide loading screen after 2 seconds
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) loader.classList.add('hidden');
    }, 2000);
    
    // Load products
    loadProducts();
    
    // Initialize other features
    initializeFeatures();
    
    // Show back to top button on scroll
    window.addEventListener('scroll', handleScroll);
});

// --- AUTH UI HANDLER ---
// Updates Login / Logout visibility and small greeting
function updateAuthUI() {
    try {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
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
                span.textContent = `👋 ${user.name}`;
                span.style.marginLeft = '0.75rem';
                span.style.fontWeight = '600';
                navActions.appendChild(span);
            }
        }
    } catch (e) {
        console.error('updateAuthUI error:', e);
    }
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
        localStorage.removeItem('loggedInUser');
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
    } catch (e) {
        console.error('Logout error:', e);
    }
}

// Initialize app features
function initializeFeatures() {
    // Check for saved preferences
    checkUserPreferences();
    
    // Initialize currency converter
    initializeCurrencyConverter();
    
    // Initialize language selector
    initializeLanguageSelector();
    
    // Initialize search suggestions
    initializeSearchSuggestions();
}

// Check user preferences
function checkUserPreferences() {
    // Check for dark mode preference
    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference === 'true') {
        enableDarkMode();
    }
    
    // Check for currency preference
    const currencyPreference = localStorage.getItem('currency');
    if (currencyPreference) {
        const el = document.getElementById('currency-select');
        if (el) el.value = currencyPreference;
    }
    
    // Check for language preference
    const languagePreference = localStorage.getItem('language');
    if (languagePreference) {
        const el = document.getElementById('language-select');
        if (el) el.value = languagePreference;
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
            image: 'https://picsum.photos/seed/headphones/400/300.jpg',
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
            image: 'https://picsum.photos/seed/smartwatch/400/300.jpg',
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
            image: 'https://picsum.photos/seed/webcam/400/300.jpg',
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
            image: 'https://picsum.photos/seed/ssd/400/300.jpg',
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
            image: 'https://picsum.photos/seed/mouse/400/300.jpg',
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
            image: 'https://picsum.photos/seed/keyboard/400/300.jpg',
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
    const discountedPrice = product.discount > 0 
        ? (product.price * (1 - product.discount / 100)).toFixed(2) 
        : product.price.toFixed(2);
    
    return `
        <div class="product-card" onclick="quickViewProduct('${product.id}')">
            <div class="product-image-container">
                <img src="${product.image || 'https://via.placeholder.com/400/667eea/ffffff?text=' + encodeURIComponent(product.name)}" 
                     class="product-image" alt="${product.name}">
                <div class="product-actions">
                    <div class="action-icon" onclick="event.stopPropagation(); addToWishlist('${product.id}')">
                        <i class="fas fa-heart"></i>
                    </div>
                    <div class="action-icon" onclick="event.stopPropagation(); quickViewProduct('${product.id}')">
                        <i class="fas fa-eye"></i>
                    </div>
                    <div class="action-icon" onclick="event.stopPropagation(); compareProduct('${product.id}')">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                </div>
                <span class="stock-badge ${product.stock > 10 ? 'in-stock' : 'low-stock'}">
                    ${product.stock > 10 ? `In Stock (${product.stock})` : `Only ${product.stock} left!`}
                </span>
                ${product.discount > 0 ? `<div class="discount-badge">-${product.discount}%</div>` : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(product.rating)}
                    </div>
                    <span class="rating-count">(${product.reviews})</span>
                </div>
                <div class="product-footer">
                    <div>
                        ${product.discount > 0 
                            ? `<span class="product-price">$${discountedPrice}</span>
                               <span class="original-price">$${product.price.toFixed(2)}</span>`
                            : `<span class="product-price">$${product.price.toFixed(2)}</span>`
                        }
                    </div>
            <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart('${product.id}')">
                <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
            <button class="btn btn-secondary" style="margin-top: 0.5rem;" onclick="event.stopPropagation(); playTextToSpeech('Product: ${product.name.replace(/'/g, "\\'")}. ${product.description.replace(/'/g, "\\'")} Price: ${product.price} dollars')">
                <i class="fas fa-volume-up"></i> Listen
            </button>
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
                    <div style="font-size: 0.9em; color: var(--text-light);">$${p.price.toFixed(2)}</div>
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
    
    const discountedPrice = product.discount > 0 
        ? (product.price * (1 - product.discount / 100)).toFixed(2) 
        : product.price.toFixed(2);
    
    const modalContent = document.getElementById('product-quick-view');
    if (!modalContent) return;
    modalContent.innerHTML = `
        <div class="product-gallery">
            <img src="${product.image || 'https://via.placeholder.com/400/667eea/ffffff?text=' + encodeURIComponent(product.name)}" 
                 class="main-image" id="main-image" alt="${product.name}">
            <div class="thumbnail-images">
                <img src="${product.image || 'https://via.placeholder.com/400/667eea/ffffff?text=' + encodeURIComponent(product.name)}" 
                     class="thumbnail active" onclick="changeImage(this)" alt="${product.name}">
                <img src="https://picsum.photos/seed/${product.id}-1/400/300.jpg" 
                     class="thumbnail" onclick="changeImage(this)" alt="${product.name}">
                <img src="https://picsum.photos/seed/${product.id}-2/400/300.jpg" 
                     class="thumbnail" onclick="changeImage(this)" alt="${product.name}">
                <img src="https://picsum.photos/seed/${product.id}-3/400/300.jpg" 
                     class="thumbnail" onclick="changeImage(this)" alt="${product.name}">
            </div>
        </div>
        <div class="product-details">
            <h2 class="product-title">${product.name}</h2>
            <div class="product-rating">
                <div class="stars">
                    ${generateStars(product.rating)}
                </div>
                <span class="rating-count">(${product.reviews} reviews)</span>
            </div>
            <div class="product-price-section">
                ${product.discount > 0 
                    ? `<span class="current-price">$${discountedPrice}</span>
                       <span class="original-price">$${product.price.toFixed(2)}</span>
                       <span class="discount-badge">-${product.discount}%</span>`
                    : `<span class="current-price">$${product.price.toFixed(2)}</span>`
                }
            </div>
            <p class="product-description">${product.description}</p>
            <div class="product-options">
                <div class="option-group">
                    <div class="option-label">Quantity:</div>
                    <div class="quantity-selector">
                        <button class="quantity-btn" onclick="decreaseQuantity()">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" id="product-quantity" class="quantity-input" value="1" min="1" max="${product.stock}">
                        <button class="quantity-btn" onclick="increaseQuantity()">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn btn-primary btn-large" onclick="addToCartFromModal()">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
                <button class="btn btn-outline btn-large" onclick="addToWishlistFromModal()">
                    <i class="fas fa-heart"></i> Add to Wishlist
                </button>
            </div>
            <div class="product-features">
                <div class="benefit-item">
                    <i class="fas fa-truck"></i>
                    <span>Free Shipping on orders over $50</span>
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
function closeProductModal() {
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
function addToCartFromModal() {
    if (!currentProduct) return;
    
    const quantityInput = document.getElementById('product-quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
    addToCart(currentProduct.id, quantity);
    closeProductModal();
}

// Add to wishlist from modal
function addToWishlistFromModal() {
    if (!currentProduct) return;
    
    addToWishlist(currentProduct.id);
    closeProductModal();
}

// Add product to cart (requires login)
async function addToCart(productId, quantity = 1) {
    // Check login
    const user = JSON.parse(localStorage.getItem('loggedInUser'));
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
    showToast(`${product.name} added to cart!`, 'success');
    
    try {
        await fetch(`${API_ENDPOINT}/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: USER_ID, productId, quantity })
        });
    } catch (e) {
        console.error('Error updating cart on server:', e);
    }
}

// Add product to wishlist (requires login)
function addToWishlist(productId) {
    // Check login
    const user = JSON.parse(localStorage.getItem('loggedInUser'));
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
    showToast(`${product.name} added to wishlist!`, 'success');
}

// Compare product
function compareProduct(productId) {
    // This would open a comparison modal or navigate to a comparison page
    showToast('Product comparison feature coming soon!', 'info');
}

// Update cart count
function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = cart.reduce((sum, i) => sum + i.quantity, 0);
}

// Update wishlist count
function updateWishlistCount() {
    const el = document.getElementById('wishlist-count');
    if (el) el.textContent = wishlist.length;
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
        if (subtotalEl) subtotalEl.textContent = '$0.00';
        if (taxEl) taxEl.textContent = '$0.00';
        if (totalEl) totalEl.textContent = '$0.00';
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
                    <p class="cart-item-price">$${price.toFixed(2)}</p>
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
                    <h3>$${total.toFixed(2)}</h3>
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
    if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2);
    if (taxEl) taxEl.textContent = '$' + tax.toFixed(2);
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
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
    const user = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!user) {
        showToast('Please login to proceed to checkout', 'info');
        return;
    }

    if (cart.length === 0) {
        showToast('Cart is empty!', 'error');
        return;
    }
    
    const total = cart.reduce((sum, i) => {
        const price = parseFloat(i.price) || 0;
        return sum + (price * i.quantity);
    }, 0) * 1.1;
    
    showToast(`Order placed! Total: $${total.toFixed(2)}`, 'success');
    cart = [];
    updateCartCount();
    renderCart();
    
    // In a real app, this would redirect to a payment page
    setTimeout(() => {
        showHome();
    }, 2000);
}

// Add product (admin)
async function addProduct(e) {
    e.preventDefault();
    
    const product = {
        name: document.getElementById('product-name').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value),
        category: document.getElementById('product-category').value,
        stock: parseInt(document.getElementById('product-stock').value),
        image: document.getElementById('product-image').value || undefined
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
    
    container.innerHTML = allProducts.map(product => `
        <div class="admin-product-item">
            <img src="${product.image || 'https://via.placeholder.com/80/667eea/ffffff?text=' + encodeURIComponent(product.name)}" 
                 class="admin-product-image" alt="${product.name}">
            <div class="admin-product-details">
                <h4>${product.name}</h4>
                <p>Category: ${product.category}</p>
                <p>Price: $${product.price.toFixed(2)}</p>
                <p>Stock: ${product.stock}</p>
            </div>
            <div class="admin-product-actions">
                <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Update admin stats
function updateAdminStats() {
    const prodEl = document.getElementById('admin-products');
    if (prodEl) prodEl.textContent = allProducts.length;
    const revenue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const revEl = document.getElementById('admin-revenue');
    if (revEl) revEl.textContent = '$' + revenue.toLocaleString();
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

// Initialize currency converter
function initializeCurrencyConverter() {
    const currencySelect = document.getElementById('currency-select');
    if (!currencySelect) return;
    currencySelect.addEventListener('change', function() {
        const selectedCurrency = this.value;
        localStorage.setItem('currency', selectedCurrency);
        
        // In a real app, this would convert prices using an API
        showToast(`Currency changed to ${selectedCurrency}`, 'info');
    });
}

// Initialize language selector
function initializeLanguageSelector() {
    const languageSelect = document.getElementById('language-select');
    if (!languageSelect) return;
    languageSelect.addEventListener('change', function() {
        const selectedLanguage = this.value;
        localStorage.setItem('language', selectedLanguage);
        
        // In a real app, this would change the language of the interface
        showToast(`Language changed to ${selectedLanguage}`, 'info');
    });
}

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
    renderCart();
}

function showAdmin() {
    switchSection('admin-section');
    updateAdminStats();
    renderAdminProducts(); // Render products list when showing admin section
}

function showWishlist() {
    // This would show the wishlist page in a real implementation
    showToast('Wishlist page coming soon!', 'info');
}

function showAccount() {
    // This would show the account page in a real implementation
    showToast('Account page coming soon!', 'info');
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
    

    document.querySelectorAll('.nav-action-btn').forEach(a => a.classList.remove('active'));
    

    const navLinks = document.querySelectorAll('.nav-action-btn');
    navLinks.forEach(link => {
        try {
            if (link.onclick && link.onclick.toString().includes(id)) {
                link.classList.add('active');
            }
        } catch (e) {
            
        }
    });
}
