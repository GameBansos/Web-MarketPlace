(function () {
  'use strict';

  if (typeof PRODUCTS === 'undefined') {
    console.error('PRODUCTS tidak ditemukan. Pastikan js/data.js dimuat sebelum js/app.js.');
    document.body.innerHTML = '<div style="padding:2rem;text-align:center;font-family:sans-serif;"><h1>Gagal memuat</h1><p>File data produk (data.js) tidak terbaca. Cek path: pastikan folder <code>js</code> ada dan berisi data.js & app.js.</p><p>Buka konsol browser (F12) untuk detail.</p></div>';
    return;
  }

  const CART_KEY = 'marketplace_cart';

  // ----- State -----
  let cart = loadCart();
  let currentCategory = 'semua';
  let searchQuery = '';
  let sortBy = 'default';

  // ----- DOM -----
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  const cartBadge = document.getElementById('cartBadge');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const categoryPills = document.getElementById('categoryPills');
  const productGrid = document.getElementById('productGrid');
  const emptyProducts = document.getElementById('emptyProducts');
  const productDetail = document.getElementById('productDetail');
  const cartContent = document.getElementById('cartContent');
  const cartEmpty = document.getElementById('cartEmpty');
  const productCount = document.getElementById('productCount');
  const sortSelect = document.getElementById('sortSelect');
  const breadcrumb = document.getElementById('breadcrumb');

  if (!productGrid || !categoryPills) {
    console.error('Elemen utama tidak ditemukan. Pastikan index.html lengkap.');
    return;
  }

  // ----- Cart helpers -----
  function loadCart() {
    try {
      const data = localStorage.getItem(CART_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function getCartCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function updateCartBadge() {
    const n = getCartCount();
    if (cartBadge) cartBadge.textContent = n;
  }

  function addToCart(productId, qty = 1) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(item => item.id === productId);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.stock);
    } else {
      cart.push({ id: productId, qty });
    }
    saveCart();
  }

  function setCartQty(productId, qty) {
    if (qty <= 0) {
      cart = cart.filter(item => item.id !== productId);
    } else {
      const item = cart.find(i => i.id === productId);
      if (item) item.qty = qty;
    }
    saveCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
  }

  // ----- Format -----
  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  }

  // ----- Get categories -----
  function getCategories() {
    const set = new Set(PRODUCTS.map(p => p.category));
    return ['semua', ...Array.from(set).sort()];
  }

  // ----- Filter & sort products -----
  function getFilteredProducts() {
    let list = PRODUCTS.filter(p => {
      const matchCategory = currentCategory === 'semua' || p.category === currentCategory;
      const matchSearch = !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
    if (sortBy === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  function getRatingStars(rating) {
    if (rating == null) return '';
    const r = Math.min(5, Math.max(0, Number(rating)));
    const full = Math.floor(r);
    const half = r - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  }

  function renderRating(rating) {
    if (rating == null) return '';
    const r = Number(rating).toFixed(1);
    return `<span class="product-rating" title="Rating ${r}">${getRatingStars(rating)} <span class="rating-num">${r}</span></span>`;
  }

  // ----- Harga dengan diskon (dapat digunakan di keranjang & checkout) -----
  function getProductPrice(product) {
    if (product && product.discount) {
      return Math.round(product.price * (1 - product.discount / 100));
    }
    return product ? product.price : 0;
  }

  function getProductSavings(product) {
    if (!product || !product.discount) return 0;
    return product.price - getProductPrice(product);
  }

  // ----- Gambar: teks = nama barang (placehold.co), selalu sama dengan produk -----
  function getProductImageUrl(product, size) {
    size = size || 400;
    if (product.imageUrl) {
      var url = product.imageUrl;
      if (url.indexOf('placehold.co') >= 0) {
        return url.replace(/\d+x\d+/, size + 'x' + size);
      }
      var sep = url.indexOf('?') >= 0 ? '&' : '?';
      return url + sep + 'w=' + size + '&h=' + size + '&fit=crop';
    }
    var text = encodeURIComponent(product.name.length > 20 ? product.category : product.name);
    return 'https://placehold.co/' + size + 'x' + size + '/0f172a/60a5fa?text=' + text;
  }

  function getPriceDisplay(product) {
    const finalPrice = getProductPrice(product);
    if (product.discount) {
      const savings = getProductSavings(product);
      return `<span class="price-old">${formatRupiah(product.price)}</span> <span class="price">${formatRupiah(finalPrice)}</span><span class="price-savings" title="Hemat ${formatRupiah(savings)}">Hemat ${formatRupiah(savings)}</span>`;
    }
    return `<span class="price">${formatRupiah(product.price)}</span>`;
  }

  function renderProductCard(product) {
    const a = document.createElement('a');
    a.href = '#produk/' + product.id;
    a.className = 'product-card';
    const discountBadge = product.discount ? `<span class="badge badge-discount card-badge">−${product.discount}%</span>` : '';
    const imgUrl = getProductImageUrl(product, 400);
    a.innerHTML = `
      <div class="product-card-image">
        <img src="${imgUrl}" alt="${escapeHtml(product.name)}" loading="lazy" width="400" height="400">
        ${discountBadge}
      </div>
      <div class="product-card-body">
        <h3 class="product-card-name">${escapeHtml(product.name)}</h3>
        <p class="product-card-category">${escapeHtml(product.category)}</p>
        ${renderRating(product.rating)}
        <p class="product-card-price">${getPriceDisplay(product)}</p>
      </div>
    `;
    return a;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ----- Render views -----
  function renderBeranda() {
    const categories = getCategories();
    categoryPills.innerHTML = categories.map(cat => {
      const label = cat === 'semua' ? 'Semua' : cat;
      const active = cat === currentCategory ? ' active' : '';
      return `<button type="button" class="pill${active}" data-category="${escapeHtml(cat)}">${escapeHtml(label)}</button>`;
    }).join('');

    const products = getFilteredProducts();
    productGrid.innerHTML = '';
    products.forEach(p => productGrid.appendChild(renderProductCard(p)));
    emptyProducts.style.display = products.length ? 'none' : 'block';

    if (productCount) {
      productCount.textContent = products.length === 0
        ? 'Tidak ada produk'
        : `Menampilkan ${products.length} produk`;
    }

    categoryPills.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategory = btn.dataset.category;
        renderBeranda();
      });
    });
  }

  function renderBreadcrumb(product) {
    if (!breadcrumb) return;
    breadcrumb.innerHTML = `
      <a href="#beranda">Beranda</a>
      <span class="breadcrumb-sep">/</span>
      <a href="#beranda">${escapeHtml(product.category)}</a>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-current">${escapeHtml(product.name)}</span>
    `;
  }

  function renderDetail(id) {
    const product = PRODUCTS.find(p => p.id === parseInt(id, 10));
    if (!product) {
      productDetail.innerHTML = '<p>Produk tidak ditemukan.</p>';
      if (breadcrumb) breadcrumb.innerHTML = '';
      return;
    }
    renderBreadcrumb(product);
    const priceFinal = getProductPrice(product);
    const savings = getProductSavings(product);
    const priceBlock = product.discount
      ? `<p class="detail-price"><span class="price-old">${formatRupiah(product.price)}</span> <span class="price">${formatRupiah(priceFinal)}</span> <span class="badge badge-discount">−${product.discount}%</span></p><p class="detail-savings">Hemat ${formatRupiah(savings)} per unit</p>`
      : `<p class="detail-price price">${formatRupiah(product.price)}</p>`;
    const detailImgUrl = getProductImageUrl(product, 600);
    productDetail.innerHTML = `
      <div class="detail-image">
        <img src="${detailImgUrl}" alt="${escapeHtml(product.name)}" width="600" height="600">
      </div>
      <div class="detail-info">
        <p class="detail-category">${escapeHtml(product.category)}</p>
        <h1 class="detail-name">${escapeHtml(product.name)}</h1>
        ${product.rating != null ? `<div class="detail-rating">${renderRating(product.rating)}</div>` : ''}
        ${priceBlock}
        <p class="detail-stock">Stok: ${product.stock}</p>
        <div class="detail-actions">
          <button type="button" class="btn btn-primary" data-add-cart="${product.id}">
            Tambah ke Keranjang
          </button>
          <a href="#keranjang" class="btn btn-outline">Lihat Keranjang</a>
        </div>
      </div>
    `;
    productDetail.querySelector('[data-add-cart]').addEventListener('click', () => {
      addToCart(product.id);
      renderDetail(id);
      renderKeranjang();
    });
  }

  function renderKeranjang() {
    if (cart.length === 0) {
      cartContent.classList.remove('has-items');
      cartContent.innerHTML = '';
      cartEmpty.classList.remove('hidden');
      return;
    }
    cartEmpty.classList.add('hidden');
    cartContent.classList.add('has-items');

    let total = 0;
    const list = document.createElement('ul');
    list.className = 'cart-list';
    let totalSavings = 0;
    cart.forEach(item => {
      const product = PRODUCTS.find(p => p.id === item.id);
      if (!product) return;
      const unitPrice = getProductPrice(product);
      const itemTotal = unitPrice * item.qty;
      total += itemTotal;
      totalSavings += getProductSavings(product) * item.qty;
      const cartImgUrl = getProductImageUrl(product, 128);
      const cartPriceHtml = product.discount
        ? `<span class="price">${formatRupiah(unitPrice)}</span> <span class="price-old">${formatRupiah(product.price)}</span>`
        : `<span class="price">${formatRupiah(product.price)}</span>`;
      const li = document.createElement('li');
      li.className = 'cart-item' + (product.discount ? ' cart-item-discounted' : '');
      li.innerHTML = `
        <div class="cart-item-image">
          <img src="${cartImgUrl}" alt="${escapeHtml(product.name)}" width="64" height="64">
          ${product.discount ? `<span class="cart-item-badge">−${product.discount}%</span>` : ''}
        </div>
        <div class="cart-item-info">
          <p class="cart-item-name">${escapeHtml(product.name)}</p>
          <p class="cart-item-price">${cartPriceHtml}</p>
        </div>
        <div class="cart-item-qty">
          <button type="button" data-cart-minus="${product.id}">−</button>
          <span>${item.qty}</span>
          <button type="button" data-cart-plus="${product.id}">+</button>
        </div>
        <button type="button" class="cart-item-remove" data-cart-remove="${product.id}" aria-label="Hapus">×</button>
      `;
      list.appendChild(li);
    });

    cartContent.innerHTML = '';
    cartContent.appendChild(list);
    const summary = document.createElement('div');
    summary.className = 'cart-summary';
    summary.innerHTML = `
      ${totalSavings > 0 ? `<div class="cart-savings">Anda hemat ${formatRupiah(totalSavings)}!</div>` : ''}
      <div class="cart-total">
        <span>Total yang dibayar</span>
        <span class="price">${formatRupiah(total)}</span>
      </div>
      <button type="button" class="btn btn-primary" disabled>Checkout (demo)</button>
    `;
    cartContent.appendChild(summary);

    cartContent.querySelectorAll('[data-cart-minus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.cartMinus, 10);
        const item = cart.find(i => i.id === id);
        if (item) setCartQty(id, item.qty - 1);
        renderKeranjang();
      });
    });
    cartContent.querySelectorAll('[data-cart-plus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.cartPlus, 10);
        const item = cart.find(i => i.id === id);
        const product = PRODUCTS.find(p => p.id === id);
        if (item && product) setCartQty(id, Math.min(item.qty + 1, product.stock));
        renderKeranjang();
      });
    });
    cartContent.querySelectorAll('[data-cart-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        removeFromCart(parseInt(btn.dataset.cartRemove, 10));
        renderKeranjang();
      });
    });
  }

  // ----- Routing -----
  function getRoute() {
    const hash = window.location.hash.slice(1) || 'beranda';
    if (hash === 'beranda' || hash === 'kategori') return { view: 'beranda' };
    if (hash === 'keranjang') return { view: 'keranjang' };
    const m = hash.match(/^produk\/(\d+)$/);
    if (m) return { view: 'detail', id: m[1] };
    return { view: 'beranda' };
  }

  function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + viewId);
    if (el) el.classList.add('active');
  }

  function handleRoute() {
    const route = getRoute();
    if (route.view === 'beranda') {
      showView('beranda');
      renderBeranda();
    } else if (route.view === 'detail') {
      showView('detail');
      renderDetail(route.id);
    } else if (route.view === 'keranjang') {
      showView('keranjang');
      renderKeranjang();
    }
  }

  // ----- Events -----
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const open = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open);
    });
    mainNav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => mainNav.classList.remove('is-open'));
    });
  }

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      searchQuery = searchInput.value;
      if (getRoute().view === 'beranda') renderBeranda();
      else window.location.hash = 'beranda';
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchBtn.click();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortBy = sortSelect.value;
      if (getRoute().view === 'beranda') renderBeranda();
    });
  }

  window.addEventListener('hashchange', handleRoute);

  // ----- Init -----
  updateCartBadge();
  handleRoute();
})();
