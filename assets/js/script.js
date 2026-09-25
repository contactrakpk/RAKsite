const pageLoaderMarkup = `
  <div class="page-loader" id="pageLoader" aria-live="polite" aria-busy="true">
    <div class="page-loader__panel">
      <div class="page-loader__spinner" aria-hidden="true"></div>
      <p class="page-loader__text">Loading...</p>
    </div>
  </div>
`;

if (!document.getElementById('pageLoader')) {
  document.body.insertAdjacentHTML('beforeend', pageLoaderMarkup);
}

const showPageLoader = () => {
  const loader = document.getElementById('pageLoader');
  if (!loader) return;
  document.body.classList.add('page-loading');
  loader.classList.remove('is-hidden');
};

const hidePageLoader = () => {
  const loader = document.getElementById('pageLoader');
  if (!loader) return;
  loader.classList.add('is-hidden');
  document.body.classList.remove('page-loading');
  window.setTimeout(() => loader.remove(), 350);
};

const forceHideLoader = () => {
  const loader = document.getElementById('pageLoader');
  if (loader) {
    loader.style.display = 'none';
    loader.classList.add('is-hidden');
  }

  const legacyLoader = document.querySelector('#loadingSpinner, .loader');
  if (legacyLoader) {
    legacyLoader.style.display = 'none';
  }

  document.body.classList.remove('page-loading');
};

const waitForInitialStorefrontLoad = async () => {
  const start = Date.now();
  const minimumDelay = 500;

  try {
    await Promise.resolve();
    const waited = Date.now() - start;
    if (waited < minimumDelay) {
      await new Promise((resolve) => window.setTimeout(resolve, minimumDelay - waited));
    }
  } finally {
    forceHideLoader();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  showPageLoader();
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return;
  }

  const target = new URL(href, window.location.href);
  if (target.origin !== window.location.origin) return;

  if (window.location.pathname === target.pathname && window.location.search === target.search) {
    return;
  }

  event.preventDefault();
  showPageLoader();
  window.setTimeout(() => {
    window.location.href = target.href;
  }, 180);
});

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const SUPABASE_URL = window.RAK_SUPABASE_URL || 'https://yhrxpmglucstpoyddkwy.supabase.co';
const SUPABASE_ANON_KEY = window.RAK_SUPABASE_ANON_KEY || 'sb_publishable_5kbTdqFWfjasOampdLwNEA_XLEwPtxf';
const isCmsRoute = () => {
  const pathname = window.location.pathname || '';
  return pathname.includes('/cms') || pathname.endsWith('/cms') || pathname.endsWith('/cms.html');
};

const initializeSupabaseClient = () => {
  if (window._supabase && typeof window._supabase.from === 'function') return window._supabase;

  const supabaseLib = window.supabase || window.supabaseClient || null;
  if (supabaseLib && typeof supabaseLib.createClient === 'function') {
    window._supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return window._supabase || null;
};

const _supabase = initializeSupabaseClient();
window._supabase = _supabase;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSupabaseClient, { once: true });
}

const fetchSupabaseProducts = async () => {
  const client = initializeSupabaseClient();
  if (!client || typeof client.from !== 'function') {
    console.warn('[Supabase] client is not ready yet; using empty fallback.');
    return [];
  }

  try {
    const { data, error } = await client.from('products').select('*');
    if (error) {
      console.warn('Supabase products fetch failed; using empty fallback.', error);
      return [];
    }

    if (!data) {
      console.warn('Supabase products returned no data; using empty fallback.');
      return [];
    }

    const safeData = Array.isArray(data) ? data : [];
    console.log('Supabase products:', safeData);
    return safeData;
  } catch (error) {
    console.warn('Supabase products request crashed; using empty fallback.', error);
    return [];
  }
};

window.fetchSupabaseProducts = fetchSupabaseProducts;

const categoryMeta = [
  { key: 'cosmetics', label: 'COSMETICS', href: 'pages/cosmetics.html', banner: 'assets/images/banners/Cosmetic.jpg' },
  { key: 'jewelery', label: 'JEWELERY', href: 'pages/jewelery.html', banner: 'assets/images/banners/Jewellery.jpg' },
  { key: 'cloths', label: 'CLOTHS', href: 'pages/cloths.html', banner: 'assets/images/banners/Cloths.jpg' },
  { key: 'sports', label: 'SPORTS', href: 'pages/sports.html', banner: 'assets/images/banners/Sports.jpg' },
  { key: 'gardening', label: 'GARDENING', href: 'pages/gardening.html', banner: 'assets/images/banners/gardening.jpg' }
];

const categoryProductNames = {
  cosmetics: [],
  jewelery: [],
  cloths: [],
  sports: [],
  gardening: []
};

const heroImageByCategory = {
  shop: 'assets/images/hero/shop.jpg',
  cosmetics: 'assets/images/hero/cosmetics.jpg',
  jewelery: 'assets/images/hero/jewelery.jpg',
  cloths: 'assets/images/hero/Cloths.jpg',
  sports: 'assets/images/hero/Sports.jpg',
  gardening: 'assets/images/hero/Gardening.jpg'
};

const legacyDummyNames = new Set([
  'Merry Me', 'Catch 22', 'Saiful Malook', 'Iqbal', 'Florse', 'Floral Duo', 'Tipping Point',
  'Classic Pendant', 'Pearl Bracelet', 'Golden Ring', 'Elegant Earrings', 'Minimal Chain',
  'Training Shoes', 'Fitness Watch', 'Sports Bag', 'Running Set', 'Yoga Mat',
  'Summer Shirt', 'Classic Kurta', 'Soft Cotton Set', 'Everyday Jacket', 'Linen Trousers',
  'Garden Tool Set', 'Plant Pot', 'Watering Can', 'Garden Gloves', 'Pruning Shears'
]);

const reviewCatalog = categoryMeta.reduce((catalog, { key, label }) => {
  catalog[key] = [];
  return catalog;
}, {});

const shopReviews = [];

const fallbackProducts = [];

let products = [];

const dedupeProducts = (items) => Array.from(new Map(items.map((item) => [item.id || item.name, item])).values());

const sanitizeStorefrontData = (stored) => {
  if (!stored || typeof stored !== 'object') return null;
  const cleanProducts = Array.isArray(stored.products)
    ? dedupeProducts(stored.products.filter((product) => product && product.name && !legacyDummyNames.has(String(product.name))))
    : [];
  const cleanReviews = Array.isArray(stored.reviews)
    ? stored.reviews.filter((review) => review && review.text && review.author && !legacyDummyNames.has(String(review.product || '')))
    : [];
  return {
    ...stored,
    products: cleanProducts,
    reviews: cleanReviews,
    shopVideos: Array.isArray(stored.shopVideos) ? stored.shopVideos.filter((video) => video && (video.video || video.product)) : [],
    categoryVideos: Array.isArray(stored.categoryVideos) ? stored.categoryVideos.filter((video) => video && (video.video || video.product)) : []
  };
};

let cmsData = (() => {
  try {
    return sanitizeStorefrontData(JSON.parse(localStorage.getItem('rak-cms-data') || 'null'));
  } catch (error) {
    return null;
  }
})();

let cmsReviews = Array.isArray(cmsData?.reviews) && cmsData.reviews.length ? cmsData.reviews : [];

if (cmsData?.products?.length) {
  const cmsProducts = dedupeProducts(cmsData.products).map((product) => ({
    ...product,
    type: product.category,
    variations: (product.variations?.length ? product.variations : [{ name: 'Default', price: product.price }]).map((variation) =>
      typeof variation === 'string' ? { name: variation, price: product.price } : variation
    )
  }));
  const cmsIds = new Set(cmsProducts.map((product) => product.id));
  products = dedupeProducts([...products.filter((product) => !cmsIds.has(product.id)), ...cmsProducts]);
}

const runSupabaseSimpleQuery = async (table, select, filters = []) => {
  const client = initializeSupabaseClient();
  if (!client || typeof client.from !== 'function') {
    console.warn('[Supabase] missing client; skipping query for table:', table);
    return { data: [], error: null };
  }

  try {
    let query = client.from(table).select(select);
    filters.forEach(({ field, op, value }) => {
      if (field && op && value !== undefined && typeof query[op] === 'function') {
        query = query[op](field, value);
      }
    });

    const result = await query;
    if (!result || !Array.isArray(result.data)) {
      return { data: [], error: result?.error || null };
    }
    return result;
  } catch (error) {
    console.warn(`[Supabase] query failed for ${table} without ordering.`, error);
    return { data: [], error };
  }
};

const videoMedia = {
  cosmetics: { video: '', poster: heroImageByCategory.cosmetics },
  jewelery: { video: '', poster: heroImageByCategory.jewelery },
  cloths: { video: '', poster: heroImageByCategory.cloths },
  sports: { video: '', poster: heroImageByCategory.sports },
  gardening: { video: '', poster: heroImageByCategory.gardening }
};

let videoProducts = [];

let categoryCmsVideos = cmsData?.categoryVideos || [];

const cartState = {
  items: [],
  shipping: Number(cmsData?.shipping) >= 0 ? Number(cmsData.shipping) : 180
};

const API_URL = String(window.RAK_API_URL || '').replace(/\/$/, '');
const normalizeProducts = (value) => Array.isArray(value) ? value : [];

const getVariationPriceValue = (variation = {}) => {
  const prices = [variation.sale_price, variation.regular_price, variation.price];
  for (const value of prices) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return 0;
};

const getLowestVariationPrice = (variations = []) => {
  const prices = variations
    .map((variation) => getVariationPriceValue(variation))
    .filter((value) => value > 0);

  return prices.length ? Math.min(...prices) : 0;
};

const resolveCardProductImage = (product = {}) => {
  const directImage = product.image_url || product.image || product.featured_image;
  if (directImage) return directImage;

  const productImages = Array.isArray(product.product_images) ? product.product_images : [];
  const firstProductImage = productImages.find((image) => image && (image.image_url || image.url || image.src || image.image));
  if (firstProductImage) return firstProductImage.image_url || firstProductImage.url || firstProductImage.src || firstProductImage.image;

  const productVariations = Array.isArray(product.product_variations) ? product.product_variations : [];
  for (const variation of productVariations) {
    const variantImage = variation?.image_url || variation?.image || variation?.featured_image || variation?.images?.[0];
    if (variantImage) return variantImage;
  }

  return 'assets/images/placeholder.jpg';
};

const resolveCardProductPrice = (product = {}) => {
  const directPrice = Number(product.price);
  if (Number.isFinite(directPrice) && directPrice > 0) return directPrice;

  const variations = Array.isArray(product.product_variations) ? product.product_variations : [];
  const lowestVariationPrice = getLowestVariationPrice(variations);
  if (lowestVariationPrice > 0) return lowestVariationPrice;

  const basePrice = Number(product.base_price);
  if (Number.isFinite(basePrice) && basePrice > 0) return basePrice;

  return 0;
};

let supabaseContentLoaded = false;
const loadSupabaseContent = async () => {
  try {
    const fallbackSettingsResult = { data: [], error: null };
    const fallbackPagesResult = { data: [], error: null };

    const request = Promise.all([
      runSupabaseSimpleQuery('products', '*', [{ field: 'status', op: 'eq', value: 'published' }]),
      runSupabaseSimpleQuery('product_variations', '*'),
      runSupabaseSimpleQuery('product_images', '*'),
      runSupabaseSimpleQuery('product_variation_images', '*'),
      runSupabaseSimpleQuery('reviews', '*', [{ field: 'status', op: 'eq', value: 'published' }]),
      runSupabaseSimpleQuery('videos', '*', [{ field: 'status', op: 'eq', value: 'published' }]),
      _supabase && typeof _supabase.from === 'function' ? _supabase.from('settings').select('key,value').in('key', ['shipping_cost', 'announcement']) : fallbackSettingsResult,
      _supabase && typeof _supabase.from === 'function' ? _supabase.from('pages').select('name,hero_url,banner_url') : fallbackPagesResult
    ]);

    const [productResult, productVariationResult, productImageResult, productVariationImageResult, reviewResult, videoResult, settingsResult, pageResult] = await Promise.race([
      request,
      new Promise((_, reject) => window.setTimeout(() => reject(new Error('Supabase storefront fetch timed out after 8 seconds')), 8000))
    ]);

    if (productResult?.error) console.warn('Supabase products query failed; using cached content.', productResult.error);
    if (reviewResult?.error) console.warn('Supabase reviews query failed; using cached content.', reviewResult.error);
    if (pageResult?.error) console.warn('Supabase pages query failed; using cached content.', pageResult.error);

    const remoteProducts = dedupeProducts(normalizeProducts(productResult?.data));
    const remoteProductVariations = normalizeProducts(productVariationResult?.data);
    const remoteProductImages = normalizeProducts(productImageResult?.data);
    const remoteProductVariationImages = normalizeProducts(productVariationImageResult?.data);
    const remoteReviews = normalizeProducts(reviewResult?.data);
    const remoteVideos = normalizeProducts(videoResult?.data);
    const remoteSettings = normalizeProducts(settingsResult?.data);
    const remotePages = normalizeProducts(pageResult?.data);

    const productVariationMap = new Map();
    remoteProductVariations.forEach((variation) => {
      const productId = String(variation.product_id ?? variation.productId ?? '');
      if (!productId) return;
      if (!productVariationMap.has(productId)) productVariationMap.set(productId, []);
      productVariationMap.get(productId).push({
        ...variation,
        name: variation.name || variation.variation_name || variation.title || 'Default',
        price: Number(variation.price ?? variation.sale_price ?? variation.regular_price ?? 0),
        sale_price: Number(variation.sale_price ?? variation.price ?? 0),
        regular_price: Number(variation.regular_price ?? variation.price ?? 0)
      });
    });

    const productImageMap = new Map();
    remoteProductImages.forEach((image) => {
      const productId = String(image.product_id ?? image.productId ?? '');
      if (!productId) return;
      if (!productImageMap.has(productId)) productImageMap.set(productId, []);
      productImageMap.get(productId).push({
        ...image,
        image_url: image.image_url || image.url || image.src || image.image || ''
      });
    });

    const variationImageMap = new Map();
    remoteProductVariationImages.forEach((image) => {
      const variationId = String(image.variation_id ?? image.variationId ?? '');
      if (!variationId) return;
      if (!variationImageMap.has(variationId)) variationImageMap.set(variationId, []);
      const imageUrl = image.image_url || image.url || image.src || image.image || '';
      if (imageUrl) variationImageMap.get(variationId).push(imageUrl);
    });

    if (Array.isArray(remoteSettings)) {
      const settings = Object.fromEntries(remoteSettings.map((setting) => [setting.key, setting.value]));
      if (settings.shipping_cost !== undefined) {
        cmsData = { ...(cmsData || {}), shipping: Number(settings.shipping_cost) || 0 };
        cartState.shipping = Number(settings.shipping_cost) || 0;
      }
    }

    if (remoteProducts.length) {
      remoteProducts.sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));
      products = normalizeProducts(remoteProducts.map((product) => {
        const productId = String(product.id ?? '');
        const productVariations = [
          ...(Array.isArray(product.product_variations) ? product.product_variations : []),
          ...(productId ? productVariationMap.get(productId) || [] : [])
        ];
        const productImages = [
          ...(Array.isArray(product.product_images) ? product.product_images : []),
          ...(productId ? productImageMap.get(productId) || [] : [])
        ];

        const normalizedVariations = productVariations.map((variation) => ({
          ...variation,
          name: variation.name || variation.variation_name || variation.title || 'Default',
          price: Number(variation.price ?? variation.sale_price ?? variation.regular_price ?? 0) || 0,
          sale_price: Number(variation.sale_price ?? variation.price ?? 0) || 0,
          regular_price: Number(variation.regular_price ?? variation.price ?? 0) || 0,
          image_url: variation.image_url || variation.image || variation.featured_image || '',
          images: variationImageMap.get(String(variation.id || variation.variation_id || '')) || (Array.isArray(variation.images) ? variation.images.filter(Boolean) : [])
        }));

        const normalizedImages = productImages
          .map((image) => ({
            ...image,
            image_url: image.image_url || image.url || image.src || image.image || ''
          }))
          .filter((image) => image.image_url);

        const mergedProduct = {
          ...product,
          product_variations: normalizedVariations,
          product_images: normalizedImages,
          image_url: product.image_url || product.image || product.featured_image || resolveCardProductImage({ ...product, product_variations: normalizedVariations, product_images: normalizedImages }),
          price: resolveCardProductPrice({ ...product, product_variations: normalizedVariations, product_images: normalizedImages }),
          images: normalizedImages.map((image) => image.image_url).filter(Boolean),
          variations: normalizedVariations.map((variation) => ({
            id: variation.id || variation.variation_id || '',
            name: variation.name,
            price: Number(variation.price) || 0,
            sale_price: Number(variation.sale_price) || 0,
            regular_price: Number(variation.regular_price) || 0,
            image_url: variation.image_url || '',
            images: variation.images && variation.images.length ? variation.images : []
          }))
        };

        return mergedProduct;
      }));
    }

    if (remoteReviews.length) {
      remoteReviews.sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));
      const productNames = new Map(products.map((product) => [String(product.id), product.name]));
      cmsReviews = remoteReviews.map((review) => ({
        ...review,
        date: review.review_date || review.date,
        text: review.body || review.text || '',
        image: review.image_path || review.review_image_path || review.image_url || review.image || '',
        product: productNames.get(String(review.product_id)) || review.product || ''
      }));
    }

    if (remotePages.length) {
      cmsData = { ...(cmsData || {}), pages: Object.fromEntries(remotePages.map((page) => [page.name, { hero: page.hero_url || '', banner: page.banner_url || '' }])) };
    }

    if (remoteVideos.length) {
      remoteVideos.sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));
      const productById = new Map(products.map((product) => [String(product.id), product]));
      const normalizedVideos = remoteVideos
        .filter((video) => video.video_url)
        .map((video) => {
          const product = productById.get(String(video.product_id));
          return {
            ...video,
            video: video.video_url,
            product: product?.name || '',
            category: String(video.page_slug || '').toUpperCase(),
            linkedProduct: product || null,
            poster: video.poster_url || product?.images?.[0] || heroImageByCategory.shop
          };
        })
        .filter(Boolean);
      videoProducts = normalizedVideos
        .filter((video) => String(video.page_slug || '').toLowerCase() === 'shop' && video.linkedProduct)
        .map((video) => ({ ...video.linkedProduct, video: video.video, poster: video.poster, videoTitle: video.title }));
      categoryCmsVideos = normalizedVideos.filter((video) => String(video.page_slug).toLowerCase() !== 'shop');
    }

    supabaseContentLoaded = true;
    return normalizeProducts(products);
  } catch (error) {
    console.warn('Supabase storefront content unavailable; using cached/API content.', error);
    return normalizeProducts(products);
  }
};

const loadRemoteContent = async () => {
  return false;
  /* Direct Supabase loading is the storefront content source of truth. */
  if (isCmsRoute()) return false;
  if (!API_URL) return false;
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    let response;

    try {
      response = await fetch(`${API_URL}/api/content`, { signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (!response.ok) return false;
    const remote = await response.json();
    if (!supabaseContentLoaded && Array.isArray(remote.products)) {
      products = dedupeProducts(normalizeProducts(remote.products.map((product) => ({
        ...product,
        type: product.type || product.category,
        variations: (product.variations?.length ? product.variations : [{ name: 'Default', price: product.price }]).map((variation) => typeof variation === 'string' ? { name: variation, price: product.price } : variation)
      }))));
    }
    if (!supabaseContentLoaded && Array.isArray(remote.reviews)) cmsReviews = remote.reviews.map((review) => ({ ...review, date: review.date || review.review_date, text: review.text || review.body || review.review_text, image: review.image_path || review.review_image_path || review.image || review.image_url || '', product: review.product || review.product_name || '' }));
    if (Array.isArray(remote.videos)) {
      const productByName = new Map(products.map((product) => [product.name, product]));
      const normalizedVideos = remote.videos
        .filter((video) => video.video && video.product)
        .map((video) => {
          const product = productByName.get(video.product);
          return product ? { ...product, ...video, video: video.video, poster: product.images?.[0] || heroImageByCategory.shop } : null;
        })
        .filter(Boolean);
      videoProducts = normalizedVideos.filter((video) => String(video.page_slug || video.pageSlug || '').toLowerCase() === 'shop');
      categoryCmsVideos = remote.videos
        .filter((video) => String(video.page_slug || video.pageSlug || '').toLowerCase() !== 'shop')
        .map((video) => ({ ...video, category: String(video.category || video.page_slug || video.pageSlug || '').toUpperCase() }));
    }
    if (remote.pages || remote.settings) {
      cmsData = { ...(cmsData || {}), pages: remote.pages || cmsData?.pages, announcement: remote.settings?.announcement || cmsData?.announcement, shipping: supabaseContentLoaded ? cmsData?.shipping : Number(remote.settings?.shipping_cost ?? cmsData?.shipping ?? 180) };
    }
    cartState.shipping = Number(cmsData?.shipping) >= 0 ? Number(cmsData.shipping) : cartState.shipping;
    return normalizeProducts(products);
  } catch (error) {
    console.warn('Remote content unavailable; using local content.', error);
    return normalizeProducts(products);
  }
};

const getCartCount = () => cartState.items.reduce((sum, item) => sum + item.quantity, 0);
const getCartTotal = () => cartState.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
const formatReviewDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const repairMojibake = (root = document) => {
  const replacements = new Map([
    [String.fromCharCode(0x00e2, 0x0152, 0x201a), '&#8962;'],
    [String.fromCharCode(0x00e2, 0x2013, 0x00a4), '&#9647;'],
    [String.fromCharCode(0x00e2, 0x2013, 0x00a6), '&#9646;'],
    [String.fromCharCode(0x00e2, 0x2014, 0x00ab), '&#9675;'],
    [String.fromCharCode(0x00e2, 0x2013, 0x00b6), '&#9654;'],
    [String.fromCharCode(0x00e2, 0x02dc, 0x2026), '&#9733;'],
    [String.fromCharCode(0x00e2, 0x0161, 0x2122), '&#9881;'],
    [String.fromCharCode(0x00e2, 0x2020, 0x2014), '&#8599;'],
    [String.fromCharCode(0x00c3, 0x2014), '&#215;'],
    [String.fromCharCode(0x00c2, 0x00b7), ' - '],
    [String.fromCharCode(0x00e2, 0x02c6, 0x2019), '-'],
    [String.fromCharCode(0x00e2, 0x20ac, 0x00b9), '&#8249;'],
    [String.fromCharCode(0x00e2, 0x20ac, 0x00ba), '&#8250;'],
    [String.fromCharCode(0x00e2, 0x20ac, 0x00a2), '&#8226;'],
    [String.fromCharCode(0x00e2, 0x0153, 0x017d), '&#9998;'],
    [String.fromCharCode(0x00e2, 0x0152, 0x2022), '&#8997;']
  ]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    let text = node.nodeValue;
    replacements.forEach((replacement, source) => { text = text.split(source).join(replacement); });
    if (text !== node.nodeValue) node.parentElement.innerHTML = text;
  });
};

const announceItems = [
  '7Days Return Available',
  'Shipping Available Nationwide',
  'Enjoy Shopping'
];

const getProductDetailPath = () => window.location.pathname.includes('/pages/')
  ? 'product-detail.html'
  : 'pages/product-detail.html';

const getCheckoutPath = () => window.location.pathname.includes('/pages/')
  ? 'checkout.html'
  : 'pages/checkout.html';

const sameProductId = (left, right) => String(left) === String(right);

const closeSearch = () => {
  const searchBox = document.querySelector('.search-box');
  const backdrop = document.querySelector('.search-backdrop');
  if (!searchBox || !backdrop) return;
  searchBox.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  document.body.classList.remove('search-is-open');
};

const renderSearchResults = (query, resultsContainer) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    resultsContainer.innerHTML = '';
    resultsContainer.classList.remove('has-results');
    return;
  }

  const matches = products.filter((product) =>
    product.name.toLowerCase().startsWith(normalizedQuery)
  );

  const resultMarkup = (product) => `
    <a class="search-result" href="${getProductDetailPath()}?productId=${product.id}">
      <img class="search-result-image" src="${resolveProductImage(product.images?.[0])}" alt="" />
      <span class="search-result-content"><span class="search-result-name">${product.name}</span><span class="search-result-meta">${product.type} - PKR ${product.price.toLocaleString()}</span></span>
    </a>
  `;

  if (matches.length) {
    resultsContainer.innerHTML = matches.map(resultMarkup).join('');
  } else {
    const categoryFirstProducts = categoryMeta
      .map(({ label }) => products.find((product) => product.category === label))
      .filter(Boolean);
    resultsContainer.innerHTML = `
      <p class="search-no-results">No products found</p>
      <p class="search-suggestion-label">You may also like</p>
      ${categoryFirstProducts.map(resultMarkup).join('')}
    `;
  }
  resultsContainer.classList.add('has-results');
};

const bindSearch = () => {
  const searchBox = document.querySelector('.search-box');
  const input = searchBox?.querySelector('input');
  if (!searchBox || !input) return;

  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'search-results';
  searchBox.appendChild(resultsContainer);

  const backdrop = document.createElement('div');
  backdrop.className = 'search-backdrop';
  document.body.appendChild(backdrop);

  const openSearch = () => {
    searchBox.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('search-is-open');
  };

  input.addEventListener('focus', openSearch);
  input.addEventListener('input', () => renderSearchResults(input.value, resultsContainer));
  backdrop.addEventListener('click', closeSearch);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSearch();
  });
};

const renderWhatsAppButton = () => {
  if (window.location.pathname.includes('checkout')) return;
  if (document.querySelector('.whatsapp-float')) return;

  const button = document.createElement('a');
  button.className = 'whatsapp-float';
  button.href = 'https://wa.me/923194307290';
  button.target = '_blank';
  button.rel = 'noopener noreferrer';
  button.setAttribute('aria-label', 'Chat with us on WhatsApp');
  const assetPrefix = window.location.pathname.includes('/pages/') ? '../' : '';
  button.innerHTML = `<img src="${assetPrefix}assets/icons/Whatsapp.png" alt="" aria-hidden="true">`;
  document.body.appendChild(button);
};

(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const toggleButton = document.querySelector('.category-inline-toggle');
  const assetPrefix = window.location.pathname.includes('/pages/') ? '../' : '';

  const updateHeaderState = () => {
    const scrollY = window.scrollY;
    const compact = scrollY > 10;
    header.classList.toggle('is-categories-compact', compact);

    if (!compact && header.classList.contains('categories-open')) {
      header.classList.remove('categories-open');
      if (toggleButton) {
        toggleButton.classList.remove('open');
        toggleButton.setAttribute('aria-expanded', 'false');
        const img = toggleButton.querySelector('img');
        if (img) img.src = `${assetPrefix}assets/icons/category.svg`;
      }
    }
  };

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      if (!header.classList.contains('is-categories-compact')) return;
      const isOpen = header.classList.toggle('categories-open');
      toggleButton.classList.toggle('open', isOpen);
      toggleButton.setAttribute('aria-expanded', String(isOpen));
      const img = toggleButton.querySelector('img');
      if (img) img.src = isOpen
        ? `${assetPrefix}assets/icons/cross.svg`
        : `${assetPrefix}assets/icons/category.svg`;
    });
  }

  window.addEventListener('scroll', updateHeaderState, { passive: true });
  updateHeaderState();
})();

const imageFallbackUrl = 'data:image/svg+xml,%3Csvg xmlns=%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width=%22600%22 height=%22600%22 viewBox=%220 0 600 600%22%3E%3Crect width=%22600%22 height=%22600%22 fill=%22%23f1f3f5%22%2F%3E%3Ctext x=%22300%22 y=%22310%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2230%22 fill=%22%236b7280%22%3EImage Not Found%3C%2Ftext%3E%3C%2Fsvg%3E';
const normalizeImageSource = (source) => {
  const value = String(source || '').trim().replace(/^(data:image\/(?:png|jpg|jpeg|webp);base64):/i, '$1,');
  if (/^data:image\//i.test(value) || /^https?:|^blob:|^\//i.test(value)) return value;
  if (value && /^[A-Za-z0-9+/_=-]+$/.test(value)) return `data:image/jpeg;base64,${value}`;
  return value;
};
const isValidImageSource = (source) => {
  const normalized = normalizeImageSource(source);
  return Boolean(normalized);
};
const resolveProductImage = (source) => {
  const normalized = normalizeImageSource(source);
  if (!isValidImageSource(normalized)) return '';
  if (/^(data:|blob:|https?:|\/)/i.test(normalized)) return normalized;
  return `${window.location.pathname.includes('/pages/') ? '../' : ''}${normalized}`;
};

const resolveReviewImage = (review) => resolveProductImage(review.image_path || review.review_image_path || review.image || 'assets/images/default-review.jpg');

const getCmsPageMedia = (pageName) => Object.entries(cmsData?.pages || {})
  .find(([name]) => name.toLowerCase() === pageName.toLowerCase())?.[1] || null;

const resolveStoredVideo = (reference) => new Promise((resolve) => {
  if (!reference?.startsWith('idb://')) return resolve(reference);
  const request = indexedDB.open('rak-media', 1);
  request.onerror = () => resolve('');
  request.onsuccess = () => {
    const transaction = request.result.transaction('files', 'readonly');
    const getRequest = transaction.objectStore('files').get(reference.slice(6));
    getRequest.onsuccess = () => resolve(getRequest.result ? URL.createObjectURL(getRequest.result) : '');
    getRequest.onerror = () => resolve('');
  };
});

const hydrateCmsVideos = async () => {
  const videos = [...(cmsData?.shopVideos || []), ...(cmsData?.categoryVideos || [])];
  await Promise.all(videos.map(async (video) => {
    if (video.video?.startsWith('idb://')) video.video = await resolveStoredVideo(video.video);
  }));
};

const applyCmsPageMedia = () => {
  const categoryKey = document.querySelector('.category-page[data-category-key]')?.dataset.categoryKey;
  const pageNameByKey = { cosmetics: 'Cosmetics', jewelery: 'Jewelery', sports: 'Sports', cloths: 'Cloths', gardening: 'Gardening' };
  const pageKey = categoryKey ? pageNameByKey[categoryKey.toLowerCase()] : 'Shop';
  const page = getCmsPageMedia(pageKey);
  if (!page) return;

  const assetPrefix = window.location.pathname.includes('/pages/') ? '../' : '';
  const resolvePageMedia = (source) => {
    if (!source) return '';
    if (/^(data:|blob:|https?:|\/)/i.test(source)) return source;
    return `${assetPrefix}${source}`;
  };
  const hero = document.querySelector('.hero-section img');
  const banner = document.querySelector('.category-page-banner');
  if (hero) {
    hero.style.display = page.hero ? '' : 'none';
    if (page.hero) {
      hero.src = resolvePageMedia(page.hero);
      hero.onerror = () => { hero.onerror = null; };
    }
  }
  if (banner) {
    banner.style.display = page.banner ? '' : 'none';
    if (page.banner) {
      banner.src = resolvePageMedia(page.banner);
      banner.onerror = () => { banner.onerror = null; };
    }
  }
};

const createProductCard = (product) => {
  const card = document.createElement('article');
  card.className = 'product-card';
  const productName = String(
    product.name || product.title || product.productName || product.product_name || product.category || 'Product'
  ).trim() || 'Product';
  const productImages = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const primaryProductImage = product.image_url || product.image || product.featured_image || productImages[0] || 'assets/images/placeholder.jpg';
  const productPrice = Number(product.price) > 0
    ? Number(product.price)
    : Number(product.base_price) > 0
      ? Number(product.base_price)
      : getLowestVariationPrice(Array.isArray(product.product_variations) ? product.product_variations : []) || 0;
  const displayPrice = productPrice > 0 ? `Rs. ${productPrice.toLocaleString()}/-` : 'Price unavailable';
  const variations = (product.variations?.length ? product.variations : []).map((variation) =>
    typeof variation === 'string' ? variation : variation.name
  ).filter(Boolean);
  const rawShortDescription = product.short_description || product.shortDescription || product.description || product.fullDescription || '';
  const productDescription = String(rawShortDescription || '').trim() || 'Premium product selection.';
  const compactDescription = productDescription.length > 80
    ? `${productDescription.slice(0, 77).trim()}...`
    : productDescription;
  card.innerHTML = `
    <div class="card-image">
      <img class="card-image-primary" src="${resolveProductImage(primaryProductImage)}" alt="${productName}" />
      ${productImages[1] ? `<img class="card-image-secondary" src="${resolveProductImage(productImages[1])}" alt="" aria-hidden="true" />` : ''}
      <div class="card-action">
        <button type="button" class="add-cart-card-btn" data-product-id="${product.id}" aria-label="Add to cart"></button>
      </div>
    </div>
    <div class="card-info">
      <h3 class="product-name">${productName}</h3>
      ${variations.length ? `<div class="product-badges">${variations.map((variation) => `<span>${variation}</span>`).join('')}</div>` : ''}
      <p class="product-type"><span class="product-category">${product.category || product.type || 'Category'}</span><span class="product-description" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${compactDescription}</span></p>
      <p class="product-price">${displayPrice}</p>
    </div>
  `;
  card.querySelectorAll('.card-image img').forEach((cardImage) => {
    cardImage.onerror = () => {
      cardImage.onerror = null;
      cardImage.src = resolveProductImage(heroImageByCategory.shop);
    };
  });

  card.addEventListener('click', (event) => {
    const btn = event.target.closest('button');
    if (btn) return;
    const detailPath = window.location.pathname.includes('/pages/') ? '../pages/product-detail.html' : 'pages/product-detail.html';
    window.location.href = `${detailPath}?productId=${encodeURIComponent(product.id)}`;
  });

  card.querySelector('.add-cart-card-btn').addEventListener('click', (event) => {
    event.stopPropagation();
    addToCart(product.id, 1);
  });

  return card;
};

const renderAnnouncement = () => {
  const text = document.getElementById('announceText');
  if (!text) return;
  let currentIndex = 0;
  text.textContent = announceItems[currentIndex];
  window.setInterval(() => {
    currentIndex = (currentIndex + 1) % announceItems.length;
    text.classList.remove('is-changing');
    void text.offsetWidth;
    text.textContent = announceItems[currentIndex];
    text.classList.add('is-changing');
  }, 2000);
};

const renderTrendingProducts = () => {
  const container = document.getElementById('trendingRow');
  if (!container) return;
  container.innerHTML = '';

  categoryMeta.forEach(({ label, href, banner, bannerClass }) => {
    const categoryProducts = products.filter((product) => String(product.category || '').toUpperCase() === label).slice(0, 5);
    if (categoryProducts.length === 0) return;

    const section = document.createElement('div');
    section.className = 'product-category-section';

    const bannerImage = document.createElement('img');
    bannerImage.className = `category-banner${bannerClass ? ` ${bannerClass}` : ''}`;
    const cmsPage = getCmsPageMedia(label);
    const cmsBanner = cmsPage ? cmsPage.banner : banner;
    bannerImage.style.display = cmsBanner ? '' : 'none';
    bannerImage.src = resolveProductImage(cmsBanner);
    bannerImage.alt = `${label} collection banner`;
    bannerImage.onerror = () => {
      bannerImage.onerror = null;
      if (!cmsPage) bannerImage.src = resolveProductImage(banner);
    };

    const bannerLink = document.createElement('a');
    bannerLink.className = 'category-banner-link';
    bannerLink.href = href;
    bannerLink.setAttribute('aria-label', `Open ${label} category`);
    bannerLink.appendChild(bannerImage);

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
      <h3>${label}</h3>
      <a href="${href}" class="view-all-link">View all</a>
    `;

    const row = document.createElement('div');
    row.className = 'trending-row';
    categoryProducts.forEach((product) => row.appendChild(createProductCard(product)));

    section.appendChild(bannerLink);
    section.appendChild(header);
    section.appendChild(row);
    container.appendChild(section);
  });
};

const configureVideoPreview = (videoElement) => {
  videoElement.setAttribute('preload', 'metadata');
  videoElement.setAttribute('crossorigin', 'anonymous');
  videoElement.onerror = () => videoElement.setAttribute('data-media-error', 'true');
  return videoElement;
};

const renderVideoShowcase = async () => {
  const container = document.getElementById('videoShowcaseGrid');
  if (!container) return;

  const renderedVideoProducts = await Promise.all(videoProducts.map(async (product) => ({
    ...product,
    video: await resolveStoredVideo(product.video)
  })));
  if (!renderedVideoProducts.length) {
    container.innerHTML = '<p class="video-showcase-empty">Our featured videos are being updated. Please check back soon.</p>';
    return;
  }
  container.innerHTML = renderedVideoProducts.map((product) => `
    <article class="video-product-card" data-product-id="${product.id}" tabindex="0" role="link" aria-label="View ${product.name} details">
      <video autoplay muted loop playsinline preload="metadata" crossorigin="anonymous" poster="${resolveProductImage(product.poster)}">
        ${product.video ? `<source src="${resolveProductImage(product.video)}" />` : ''}
      </video>
      <div class="video-product-info">
        <img class="video-product-thumb" src="${resolveProductImage(product.poster)}" alt="" aria-hidden="true" />
        <div>
          <h3>${product.name}</h3>
          <p>PKR ${product.price.toLocaleString()}</p>
        </div>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('video').forEach(configureVideoPreview);

  container.querySelectorAll('.video-product-card').forEach((card) => {
    const openDetails = () => {
      window.location.href = `${getProductDetailPath()}?productId=${card.dataset.productId}`;
    };
    card.addEventListener('click', openDetails);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDetails();
      }
    });
  });
};

const renderCategoryPage = async () => {
  const categoryPage = document.querySelector('.category-page[data-category-key]');
  if (!categoryPage) return;

  const categoryKey = categoryPage.dataset.categoryKey;
  const category = categoryMeta.find((item) => item.key === categoryKey);
  if (!category) return;

  const categoryProducts = products.filter((product) => String(product.category || '').toUpperCase() === category.label).slice(0, 5);
  const productsContainer = document.getElementById('categoryProducts');
  if (productsContainer) {
    productsContainer.innerHTML = '';
    categoryProducts.forEach((product) => productsContainer.appendChild(createProductCard(product)));
  }

  const categoryNames = categoryProductNames[categoryKey];
  const categoryPoster = heroImageByCategory[category.key] || heroImageByCategory.shop;
  const configuredVideos = categoryCmsVideos.filter((video) => String(video.category || '').toUpperCase() === category.label);
  const categoryVideos = (await Promise.all(configuredVideos
    .filter((video) => video.video && products.some((product) => product.name === video.product))
    .slice(0, 4)
    .map(async (video) => ({ ...video, video: await resolveStoredVideo(video.video) })))).filter((video) => video.video);
  const videoContainer = document.getElementById('categoryVideos');
  if (videoContainer) {
    if (!categoryVideos.length) {
      videoContainer.innerHTML = '';
    } else {
    videoContainer.innerHTML = `
      <section class="video-showcase-section category-video-section" aria-labelledby="${categoryKey}VideosTitle">
        <div class="video-showcase-header">
          <h2 id="${categoryKey}VideosTitle">${category.label} favorites</h2>
        </div>
        <div class="video-showcase-grid">
          ${categoryVideos.map((video) => {
            const linked = products.find((product) => product.name === video.product);
            return `
            <article class="video-product-card">
              <video autoplay muted loop playsinline preload="metadata" crossorigin="anonymous" poster="../${categoryPoster}">
                ${video.video ? `<source src="${video.video}" type="video/mp4" />` : ''}
              </video>
              <div class="video-product-info">
                <img class="video-product-thumb" src="${resolveProductImage(linked?.images?.[0] || categoryPoster)}" alt="" aria-hidden="true" />
                <div>
                  <h3>${video.product}</h3>
                  <p>PKR ${linked?.price?.toLocaleString() || ''}</p>
                </div>
              </div>
            </article>
          `;
          }).join('')}
        </div>
      </section>
    `;
    videoContainer.querySelectorAll('video').forEach(configureVideoPreview);
    videoContainer.querySelectorAll('.video-product-card').forEach((card, index) => {
      const video = categoryVideos[index];
      const linked = products.find((product) => product.name === video.product);
      if (!linked) return;
      card.dataset.productId = linked.id;
      card.tabIndex = 0;
      card.setAttribute('role', 'link');
      card.setAttribute('aria-label', `View ${linked.name} details`);
      const openDetails = () => {
        window.location.href = `${getProductDetailPath()}?productId=${encodeURIComponent(linked.id)}`;
      };
      card.addEventListener('click', openDetails);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDetails();
        }
      });
    });
    }
  }

  const reviewContainer = document.getElementById('categoryReviews');
  if (reviewContainer) {
    const categoryReviews = cmsReviews.filter((review) => review.text && review.author);
    if (!categoryReviews.length) {
      reviewContainer.innerHTML = '';
    } else {
    reviewContainer.innerHTML = `
      <section class="reviews-section category-reviews-section" aria-labelledby="${categoryKey}ReviewsTitle">
        <div class="reviews-header">
          <h2 id="${categoryKey}ReviewsTitle">Reviews about our products</h2>
          <div class="reviews-rating"><strong>4.8</strong><span class="review-stars">★★★★★</span><span>1,248 reviews</span></div>
        </div>
        <div class="reviews-carousel">
          <button type="button" class="review-nav review-nav-prev" aria-label="Previous reviews">‹</button>
          <div class="reviews-track category-review-track">
            ${categoryReviews.map((review) => `
              <article class="review-card">
                <div class="review-card-body">
                  <div class="review-card-header">
                    <img src="${resolveReviewImage(review)}" alt="" aria-hidden="true" />
                    <div><h3>${review.author}</h3><span>${review.title || review.product || 'Customer review'}</span></div>
                    <time>${formatReviewDate(review.date)}</time>
                  </div>
                  <p>${review.text}</p>
                  <div class="review-card-footer"><span class="review-stars">${'★'.repeat(Number(review.rating || 0))}</span><span class="review-product">${review.product || ''}</span></div>
                </div>
              </article>
            `).join('')}
          </div>
          <button type="button" class="review-nav review-nav-next" aria-label="Next reviews">›</button>
        </div>
      </section>
    `;
    bindReviewCarousel(reviewContainer);
    }
  }

  const faqContainer = document.getElementById('categoryFaq');
  if (faqContainer) {
    faqContainer.innerHTML = `
      <section class="faq-section" aria-labelledby="${categoryKey}FaqTitle">
        <div class="faq-inner">
          <h2 id="${categoryKey}FaqTitle">Frequently Asked Questions</h2>
          <div class="faq-list">
            <details class="faq-item" open><summary>What makes these ${category.label.toLowerCase()} products special?</summary><p>Each item is selected for quality, practicality, and lasting customer value.</p></details>
            <details class="faq-item"><summary>How can I choose the right product?</summary><p>Review the product details or contact our support team for a helpful recommendation.</p></details>
            <details class="faq-item"><summary>How long does delivery take?</summary><p>Orders are prepared quickly, with delivery time depending on your location.</p></details>
            <details class="faq-item"><summary>Can I return or exchange my order?</summary><p>Contact support with your order details and we will guide you through the process.</p></details>
            <details class="faq-item"><summary>How can I contact customer support?</summary><p>Use the contact details in the footer and our team will be happy to help.</p></details>
          </div>
        </div>
      </section>
    `;
  }

  categoryPage.insertAdjacentHTML('afterend', `
    <footer class="site-footer category-site-footer">
      <div class="footer-main">
        <div class="footer-grid">
          <div class="footer-column">
            <h3>ABOUT</h3>
            <a href="../index.html">Home</a>
            <a href="#${categoryKey}FaqTitle">FAQs</a>
            <a href="../index.html">About</a>
          </div>
          <div class="footer-column">
            <h3>QUICK LINKS</h3>
            <a href="cosmetics.html">Shop Cosmetics</a>
            <a href="jewelery.html">Shop Jewellery</a>
            <a href="cloths.html">Shop Cloths</a>
            <a href="sports.html">Shop Sports</a>
            <a href="gardening.html">Shop Gardening</a>
          </div>
          <div class="footer-column footer-contact">
            <h3>GET IN TOUCH</h3>
            <a href="tel:+923194307290">+92 319 4307290</a>
            <a href="mailto:contact.rak.pk@gmail.com">contact.rak.pk@gmail.com</a>
            <h3 class="footer-follow-title">FOLLOW US</h3>
            <div class="footer-socials">
              <a href="#" aria-label="Facebook"><img src="../assets/icons/facebook.svg" alt="Facebook" /></a>
              <a href="#" aria-label="Instagram"><img src="../assets/icons/instagram.svg" alt="Instagram" /></a>
              <a href="#" aria-label="TikTok"><img src="../assets/icons/tiktok.svg" alt="TikTok" /></a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p class="footer-credit">website created and maintained by Abdullah_rauf to contact <a class="footer-whatsapp" href="https://wa.me/923278364657">03278364657</a></p>
        </div>
      </div>
    </footer>
  `);
};

const renderCartBadge = () => {
  const badgeElements = document.querySelectorAll('.cart-badge');
  badgeElements.forEach((badge) => {
    const count = getCartCount();
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  });
};

const updateCartUI = () => {
  renderCartBadge();
  renderCartPanel();
};

const toggleCartPanel = (open) => {
  const panel = document.getElementById('cartPanel');
  const backdrop = document.getElementById('cartBackdrop');
  if (!panel || !backdrop) return;
  panel.classList.toggle('open', open);
  backdrop.classList.toggle('open', open);
  document.body.classList.toggle('cart-is-open', open);
};

const ensureCartPanel = () => {
  if (document.getElementById('cartPanel')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="cart-backdrop" id="cartBackdrop"></div>
    <aside class="cart-panel" id="cartPanel" aria-label="Shopping cart">
      <header>
        <div>
          <h2>Your Cart</h2>
          <p class="panel-subtitle">Your added products are listed here.</p>
        </div>
        <button type="button" class="close-panel" aria-label="Close cart">×</button>
      </header>
      <div class="cart-body" id="cartItems"></div>
      <div class="summary-panel">
        <div class="summary-row summary-total-row"><span>Total</span><span class="summary-total" id="cartTotal">PKR 0</span></div>
        <button type="button" class="checkout-btn">Checkout</button>
      </div>
      <section class="cart-related-products" aria-labelledby="cartRelatedTitle">
        <h3 id="cartRelatedTitle">You may also like</h3>
        <div class="cart-related-row" id="cartRelatedItems"></div>
      </section>
    </aside>
  `);
};

const saveCart = () => {
  localStorage.setItem('akWebCart', JSON.stringify(cartState.items));
};

const loadCart = () => {
  const raw = localStorage.getItem('akWebCart');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cartState.items = parsed
        .filter((item) => item && item.name)
        .map((item) => ({
          ...item,
          quantity: Math.max(1, Number(item.quantity) || 1),
          price: Number(item.price) || 0
        }));
    }
  } catch (error) {
    console.warn('Failed to parse cart data', error);
  }
};

const addToCart = (productId, quantity) => {
  const product = products.find((item) => sameProductId(item.id, productId));
  if (!product) return;
  const existing = cartState.items.find((item) => sameProductId(item.id, product.id));
  if (existing) {
    existing.quantity += quantity;
  } else {
    cartState.items.push({ ...product, quantity });
  }
  saveCart();
  updateCartUI();
};

const addProductVariationToCart = (product, variation, quantity) => {
  const cartId = `${product.id}::${variation.name}`;
  const existing = cartState.items.find((item) => item.cartId === cartId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cartState.items.push({ ...product, id: cartId, cartId, selectedVariation: variation.name, price: variation.price, quantity });
  }
  saveCart();
  updateCartUI();
};

const removeFromCart = (productId) => {
  cartState.items = cartState.items.filter((item) => !sameProductId(item.id, productId));
  saveCart();
  updateCartUI();
};

const changeCartQuantity = (productId, delta) => {
  const item = cartState.items.find((entry) => sameProductId(entry.id, productId));
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  saveCart();
  updateCartUI();
};

const renderCartPanel = () => {
  const cartList = document.getElementById('cartItems');
  const total = document.getElementById('cartTotal');
  const relatedList = document.getElementById('cartRelatedItems');
  if (!cartList || !total) return;
  cartList.innerHTML = '';

  if (cartState.items.length === 0) {
    cartList.innerHTML = '<p class="empty-cart-message">Your cart is empty.</p>';
  }

  cartState.items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    const itemCategory = categoryMeta.find((category) => category.label === item.category);
    const itemImage = item.images?.[0] || `${window.location.pathname.includes('/pages/') ? '../' : ''}${itemCategory?.banner || heroImageByCategory.shop}`;
    row.innerHTML = `
      <img src="${itemImage}" alt="${item.name}" />
      <div class="cart-item-info">
        <p class="cart-item-title">${item.name}</p>
        <p class="cart-item-meta">${item.type}${item.selectedVariation ? ` · ${item.selectedVariation}` : ''}</p>
      </div>
      <div class="cart-item-side">
        <div class="cart-item-controls">
          <button type="button" data-action="decrease" data-id="${item.id}">-</button>
          <span>${item.quantity}</span>
          <button type="button" data-action="increase" data-id="${item.id}">+</button>
        </div>
        <p class="cart-item-price">PKR ${(item.price * item.quantity).toLocaleString()}</p>
        <button type="button" class="remove-item-btn" data-action="remove" data-id="${item.id}">×</button>
      </div>
    `;
    cartList.appendChild(row);
  });

  total.textContent = `PKR ${getCartTotal().toLocaleString()}`;

  if (relatedList) {
    relatedList.innerHTML = '';
    const cartCategories = new Set(cartState.items.map((item) => String(item.category || item.type || '').toLowerCase()));
    const cartIds = new Set(cartState.items.map((item) => String(item.id)));
    products
      .filter((product) => cartCategories.has(String(product.category || product.type || '').toLowerCase()) && !cartIds.has(String(product.id)))
      .slice(0, 4)
      .forEach((product) => relatedList.appendChild(createProductCard(product)));
  }
};

const bindCartEvents = () => {
  const cartButtons = document.querySelectorAll('.cart-link');
  cartButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      toggleCartPanel(true);
    });
  });

  const closePanel = document.querySelectorAll('.close-panel');
  closePanel.forEach((button) => button.addEventListener('click', () => toggleCartPanel(false)));

  document.querySelectorAll('.checkout-btn').forEach((button) => {
    button.addEventListener('click', () => {
      if (cartState.items.length === 0) {
        const cartList = document.getElementById('cartItems');
        if (cartList) cartList.innerHTML = '<p class="empty-cart-message">Add a product first to continue to checkout.</p>';
        return;
      }
      window.location.href = getCheckoutPath();
    });
  });

  const backdrop = document.getElementById('cartBackdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => toggleCartPanel(false));
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.action === 'remove') {
      removeFromCart(target.dataset.id);
    }
    if (target.dataset.action === 'decrease') {
      changeCartQuantity(target.dataset.id, -1);
    }
    if (target.dataset.action === 'increase') {
      changeCartQuantity(target.dataset.id, 1);
    }
  });
};

const renderCheckoutPage = () => {
  const checkoutPage = document.querySelector('.checkout-page');
  if (!checkoutPage) return;

  const emptyState = document.getElementById('checkoutEmpty');
  const content = document.getElementById('checkoutContent');
  const itemsContainer = document.getElementById('checkoutItems');
  const subtotalElement = document.getElementById('checkoutSubtotal');
  const shippingElement = document.getElementById('checkoutShipping');
  const totalElement = document.getElementById('checkoutTotal');
  const form = document.getElementById('checkoutForm');
  if (!emptyState || !content || !itemsContainer || !subtotalElement || !shippingElement || !totalElement || !form) return;

  const checkoutDraftKey = 'akCheckoutDraft';
  try {
    const draft = JSON.parse(localStorage.getItem(checkoutDraftKey) || '{}');
    Object.entries(draft).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (!field) return;
      if (field instanceof RadioNodeList) {
        [...field].forEach((radio) => { radio.checked = radio.value === value; });
      } else {
        field.value = value;
      }
    });
  } catch {
    localStorage.removeItem(checkoutDraftKey);
  }
  const saveCheckoutDraft = () => {
    const draft = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem(checkoutDraftKey, JSON.stringify(draft));
  };
  form.addEventListener('input', saveCheckoutDraft);
  form.addEventListener('change', saveCheckoutDraft);

  if (cartState.items.length === 0) {
    emptyState.hidden = false;
    content.hidden = true;
    return;
  }

  const assetPrefix = '../';
  const subtotal = cartState.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  itemsContainer.innerHTML = cartState.items.map((item) => {
    const itemCategory = categoryMeta.find((category) => category.label === item.category);
    const image = item.images?.[0] || `${assetPrefix}${itemCategory?.banner || heroImageByCategory.shop}`;
    return `
      <div class="checkout-item">
        <img src="${image}" alt="${item.name}" />
        <div><strong>${item.name}</strong><span>${item.quantity} x PKR ${item.price.toLocaleString()}</span></div>
        <b>PKR ${(item.quantity * item.price).toLocaleString()}</b>
      </div>
    `;
  }).join('');
  subtotalElement.textContent = `PKR ${subtotal.toLocaleString()}`;
  shippingElement.textContent = `PKR ${cartState.shipping.toLocaleString()}`;
  totalElement.textContent = `PKR ${(subtotal + cartState.shipping).toLocaleString()}`;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.orderSubmitting === 'true') return;
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    const phone = String(formData.get('phone') || '').trim();
    const email = String(formData.get('email') || '').trim();
    if (!/^\d{11}$/.test(phone) || !/^[^\s@]+@gmail\.com$/i.test(email)) return;
    form.dataset.orderSubmitting = 'true';
    const submitButton = document.querySelector('.checkout-submit');
    if (submitButton) submitButton.disabled = true;
    const order = {
      id: `RAK-${Date.now()}`,
      createdAt: new Date().toISOString(),
      customer: Object.fromEntries(formData.entries()),
      items: cartState.items,
      shipping: cartState.shipping,
      total: subtotal + cartState.shipping
    };
    try {
      const customer = order.customer;
      const { data: savedRows, error } = await _supabase.from('orders').insert({
        order_number: order.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        address: customer.address,
        area: customer.area || '',
        city: customer.city,
        notes: customer.notes || '',
        payment_method: customer.payment || 'Cash on Delivery',
        items: order.items,
        shipping: order.shipping,
        total: order.total,
        status: 'new'
      }).select('order_number,created_at');
      if (error) throw error;
      const savedRow = savedRows?.[0];
      const savedOrder = { ...order, id: savedRow?.order_number || order.id, createdAt: savedRow?.created_at || order.createdAt };
      const existingOrders = JSON.parse(localStorage.getItem('akWebOrders') || '[]');
      existingOrders.unshift(savedOrder);
      localStorage.setItem('akWebOrders', JSON.stringify(existingOrders));
      localStorage.setItem('akWebOrder', JSON.stringify(savedOrder));
      localStorage.removeItem(checkoutDraftKey);
      cartState.items = [];
      saveCart();
      const confirmation = document.getElementById('checkoutConfirmation');
      if (confirmation) {
        confirmation.hidden = false;
        document.getElementById('checkoutContent')?.classList.add('order-complete');
        const orderIdElement = document.getElementById('checkoutOrderId');
        if (orderIdElement) orderIdElement.textContent = savedOrder.id;
        const phoneElement = document.getElementById('checkoutCustomerPhone');
        const emailElement = document.getElementById('checkoutCustomerEmail');
        if (phoneElement) phoneElement.textContent = customer.phone;
        if (emailElement) emailElement.textContent = customer.email;
        confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      delete form.dataset.orderSubmitting;
      if (submitButton) submitButton.disabled = false;
      window.alert(error.message || 'The order could not be submitted. Please try again.');
    }
  });

  document.getElementById('copyOrderId')?.addEventListener('click', async () => {
    const orderId = document.getElementById('checkoutOrderId')?.textContent || '';
    const status = document.getElementById('copyOrderStatus');
    if (!orderId) return;
    try {
      await navigator.clipboard.writeText(orderId);
    } catch {
      const temporaryInput = document.createElement('textarea');
      temporaryInput.value = orderId;
      document.body.appendChild(temporaryInput);
      temporaryInput.select();
      document.execCommand('copy');
      temporaryInput.remove();
    }
    if (status) status.textContent = 'Order ID copied.';
  });
};

const bindReviewCarousel = (container = document) => {
  const track = container.querySelector('#reviewsTrack, .category-review-track, .detail-review-track');
  const previousButton = container.querySelector('.review-nav-prev');
  const nextButton = container.querySelector('.review-nav-next');
  if (!track || !previousButton || !nextButton) return;

  const scrollReviews = (direction) => {
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  previousButton.addEventListener('click', () => scrollReviews(-1));
  nextButton.addEventListener('click', () => scrollReviews(1));
};

const scrollStateKey = `rak-scroll:${window.location.pathname}${window.location.search}`;

const saveScrollPosition = () => {
  sessionStorage.setItem(scrollStateKey, String(window.scrollY));
};

const restoreScrollPosition = () => {
  const navigationEntry = performance.getEntriesByType('navigation')[0];
  const isReload = navigationEntry?.type === 'reload'
    || (!navigationEntry && performance.navigation?.type === 1);
  if (!isReload) return;

  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  });
};

window.addEventListener('pagehide', saveScrollPosition);
window.addEventListener('beforeunload', saveScrollPosition);
window.addEventListener('load', restoreScrollPosition);

const renderShopReviews = () => {
  const section = document.querySelector('main > .reviews-section:not(.detail-reviews-section)');
  if (!section) return;
  const validReviews = cmsReviews.filter((review) => review.text && review.author);
  if (!validReviews.length) {
    section.remove();
    return;
  }
  const assetPrefix = window.location.pathname.includes('/pages/') ? '../' : '';
  section.innerHTML = `
    <div class="reviews-header">
      <h2 id="reviewsTitle">Reviews about our products</h2>
      <div class="reviews-rating"><strong>${(validReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / validReviews.length).toFixed(1)}</strong><span class="review-stars">★★★★★</span><span>${validReviews.length} reviews</span></div>
    </div>
    <div class="reviews-carousel">
      <button type="button" class="review-nav review-nav-prev" aria-label="Previous reviews">‹</button>
      <div class="reviews-track" id="reviewsTrack">
          ${validReviews.map((review) => `<article class="review-card"><div class="review-card-body"><div class="review-card-header"><img src="${resolveReviewImage(review)}" alt="" aria-hidden="true" /><div><h3>${review.author}</h3><span>${review.title || review.product || 'Customer review'}</span></div><time>${formatReviewDate(review.date)}</time></div><p>${review.text}</p><div class="review-card-footer"><span class="review-stars">${'★'.repeat(Number(review.rating || 0))}</span><span class="review-product">${review.product || ''}</span></div></div></article>`).join('')}
      </div>
      <button type="button" class="review-nav review-nav-next" aria-label="Next reviews">›</button>
    </div>
  `;
};

const getQueryParam = (key) => new URLSearchParams(window.location.search).get(key);
const getProductQueryValue = () => getQueryParam('productId') || getQueryParam('id') || getQueryParam('slug');

window.variationImagesMap = window.variationImagesMap || {};

const fetchDetailVariationData = async (productId) => {
  const client = initializeSupabaseClient();
  if (!client || !productId) return null;

  try {
    const { data: variationRows, error: variationError } = await client
      .from('product_variations')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });
    if (variationError) throw variationError;

    const variations = Array.isArray(variationRows) ? variationRows : [];
    const variationIds = variations.map((variation) => variation.id).filter(Boolean);
    let imageQuery = client.from('product_variation_images').select('*').eq('product_id', productId);
    if (variationIds.length && typeof imageQuery.in === 'function') {
      imageQuery = imageQuery.in('variation_id', variationIds);
    }
    const { data: imageRows, error: imageError } = await imageQuery;
    if (imageError) throw imageError;

    const imageMap = {};
    (Array.isArray(imageRows) ? imageRows : []).forEach((image) => {
      const variationId = String(image.variation_id || '');
      const imageUrl = normalizeImageSource(image.image_url || image.url || image.src || image.image || '');
      if (!variationId || !isValidImageSource(imageUrl)) return;
      if (!imageMap[variationId]) imageMap[variationId] = [];
      if (!imageMap[variationId].includes(imageUrl)) imageMap[variationId].push(imageUrl);
    });
    window.variationImagesMap = { ...window.variationImagesMap, ...imageMap };

    return variations.map((variation) => ({
      ...variation,
      name: variation.name || 'Default',
      price: Number(variation.price) || 0,
      images: imageMap[String(variation.id)] || []
    }));
  } catch (error) {
    console.warn('Direct Supabase variation gallery query failed; using product fallback images.', error);
    return null;
  }
};

const renderDetailPage = async () => {
  const productId = getProductQueryValue();
  if (!productId) return;
  const product = products.find((item) => sameProductId(item.id, productId) || String(item.slug || '').toLowerCase() === String(productId).toLowerCase() || String(item.name || '').toLowerCase() === String(productId).toLowerCase());
  if (!product) return;

  const mainImage = document.getElementById('main-product-image');
  const thumbs = document.getElementById('detailThumbs');
  const nameEl = document.getElementById('detailName');
  const typeEl = document.getElementById('detailType');
  const variationsEl = document.getElementById('detailVariations');
  const priceEl = document.getElementById('detailPrice');
  const qtyEl = document.getElementById('detailQty');
  const descEl = document.getElementById('detailDescription');
  const shortDescEl = document.getElementById('detailShortDescription');
  const categoryEl = document.getElementById('detailCategory');

  if (!mainImage || !thumbs || !nameEl || !typeEl || !variationsEl || !priceEl || !qtyEl || !descEl || !categoryEl) return;

  const categoryKey = categoryMeta.find((item) => item.label === String(product.category || '').toUpperCase())?.key;
  const assetPrefix = window.location.pathname.includes('/pages/') ? '../' : '';
  const categoryKeyName = String(product.category || 'shop').toLowerCase();
  const fallbackImage = `${assetPrefix}${heroImageByCategory[categoryKeyName] || heroImageByCategory.shop}`;
  const productImages = Array.isArray(product.images)
    ? product.images.map(normalizeImageSource).filter(isValidImageSource).slice(0, 4).map(resolveProductImage).filter(Boolean)
    : [];
  const variationFallbackImages = (product.variation_images || product.variationImages || (product.variations || []).flatMap((variation) => typeof variation === 'string' ? [] : (variation.images || variation.variation_images || [])))
    .map((image) => typeof image === 'string' ? image : image?.image_url || image?.url || image?.src || image?.image || '')
    .map(normalizeImageSource)
    .filter(isValidImageSource)
    .slice(0, 4)
    .map(resolveProductImage)
    .filter(Boolean);
  const initialGalleryImages = productImages.length ? productImages : variationFallbackImages;
  const galleryFallbackImages = initialGalleryImages.length ? initialGalleryImages : [
        fallbackImage,
        `${assetPrefix}${heroImageByCategory.shop}`,
        `${assetPrefix}${heroImageByCategory.cosmetics}`,
        `${assetPrefix}${heroImageByCategory.jewelery}`
      ];
  let galleryImages = Array.from({ length: 4 }, (_, index) =>
    galleryFallbackImages[index] || galleryFallbackImages[0]
  );

  mainImage.src = galleryImages[0];
  mainImage.alt = product.name;
  mainImage.onerror = () => {
    mainImage.onerror = null;
    mainImage.src = imageFallbackUrl;
  };
  nameEl.textContent = product.name;
  typeEl.textContent = product.type;
  const directVariations = await fetchDetailVariationData(product.id);
  const variations = (directVariations?.length ? directVariations : (product.variations?.length ? product.variations : [{ name: 'Default', price: product.price, images: product.images || [] }])).map((variation) =>
    typeof variation === 'string' ? { name: variation, price: product.price, images: product.images || [] } : variation
  );
  const serializeVariationImages = (images) => JSON.stringify(Array.isArray(images) ? images : [])
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
  const getImageValue = (image) => typeof image === 'string'
    ? image
    : image?.image_url || image?.url || image?.src || image?.image || '';
  const getVariationGallery = (variation) => {
    const variationImages = variation?.images || variation?.variation_images || variation?.variationImages || [];
    const productVariationImages = product.variation_images || product.variationImages || [];
    const candidates = Array.isArray(variationImages) && variationImages.length
      ? variationImages
      : (Array.isArray(productVariationImages) && productVariationImages.length ? productVariationImages : product.images || []);
    return candidates
      .map(getImageValue)
      .map(normalizeImageSource)
      .filter(isValidImageSource)
      .map(resolveProductImage)
      .filter(Boolean);
  };
  let selectedVariation = variations[0];
  galleryImages = getVariationGallery(selectedVariation);
  mainImage.src = galleryImages[0] || fallbackImage;
  priceEl.textContent = `PKR ${Number(selectedVariation.price).toLocaleString()}`;
  const fullDescription = product.fullDescription || product.description || '';
  const shortDescription = product.short_description || product.shortDescription || product.description || '';
  const renderFormattedText = (value = '') => String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '<br>');
  descEl.innerHTML = renderFormattedText(fullDescription);
  if (shortDescEl) shortDescEl.innerHTML = renderFormattedText(shortDescription || 'Premium product selection.');
  categoryEl.textContent = product.category;
  qtyEl.textContent = '1';

  variationsEl.innerHTML = variations.map((variation, index) => `
    <button type="button" class="variation-pill${index === 0 ? ' active' : ''}" data-variation-index="${index}" data-variation-id="${variation.id || variation.variation_id || ''}" data-images="${serializeVariationImages(variation.images)}">
      <span>${variation.name}</span><small>PKR ${Number(variation.price).toLocaleString()}</small>
    </button>
  `).join('');
  variationsEl.onclick = (event) => {
    const button = event.target.closest('[data-variation-index]');
    if (!button) return;
    const variationId = button.dataset.variationId || '';
    const mappedImages = window.variationImagesMap?.[variationId] || [];
    let attributeImages = [];
    try {
      attributeImages = JSON.parse(button.dataset.images || '[]');
    } catch (error) {
      console.warn('Could not parse variation image attribute; using fallback images.', error);
    }
    const selectedImages = mappedImages.length ? mappedImages : attributeImages;
    selectedVariation = { ...variations[Number(button.dataset.variationIndex)], images: selectedImages };
    galleryImages = getVariationGallery(selectedVariation);
    variationsEl.querySelectorAll('.variation-pill').forEach((pill) => pill.classList.toggle('active', pill === button));
    priceEl.textContent = `PKR ${Number(selectedVariation.price).toLocaleString()}`;
    const primary = galleryImages[0] || product.images?.[0] || fallbackImage;
    mainImage.src = primary;
    mainImage.alt = `${product.name} - ${selectedVariation.name}`;
    renderThumbnails();
  };
  const renderThumbnails = () => {
    const displayImages = galleryImages.length ? galleryImages : product.images || [fallbackImage];
    thumbs.innerHTML = displayImages.slice(1).map((src, index) => `
    <button type="button" class="detail-thumb" data-image-index="${index + 1}">
      <img class="product-thumbnail" src="${src}" data-full-src="${src}" alt="${product.name} preview" onerror="this.onerror=null;this.src='${imageFallbackUrl}'" />
    </button>
    `).join('');
    thumbs.querySelectorAll('.product-thumbnail').forEach((thumbnail) => {
      thumbnail.addEventListener('click', function () {
        const currentMainImage = document.getElementById('main-product-image');
        if (currentMainImage) {
          currentMainImage.style.opacity = '0.55';
          currentMainImage.src = this.dataset.fullSrc || this.src;
          currentMainImage.addEventListener('load', () => { currentMainImage.style.opacity = '1'; }, { once: true });
        }
        thumbs.querySelectorAll('.product-thumbnail').forEach((thumb) => {
          thumb.classList.remove('active');
          thumb.closest('.detail-thumb')?.classList.remove('active');
        });
        this.classList.add('active');
        this.closest('.detail-thumb')?.classList.add('active');
      });
    });
  };
  renderThumbnails();

  const zoomModal = document.getElementById('detailZoomModal');
  const zoomImage = document.getElementById('detailZoomImage');
  const zoomButton = document.getElementById('detailZoomBtn');
  const closeZoom = () => {
    zoomModal?.classList.remove('open');
    zoomModal?.setAttribute('aria-hidden', 'true');
  };
  zoomButton?.addEventListener('click', () => {
    if (!zoomModal || !zoomImage) return;
    zoomImage.src = galleryImages[0];
    zoomImage.alt = product.name;
    zoomModal.classList.add('open');
    zoomModal.setAttribute('aria-hidden', 'false');
  });
  document.getElementById('detailZoomClose')?.addEventListener('click', closeZoom);
  zoomModal?.addEventListener('click', (event) => {
    if (event.target === zoomModal) closeZoom();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeZoom();
  });

  const addToCartButton = document.querySelector('.add-to-cart-btn');
  addToCartButton?.addEventListener('click', () => {
    addProductVariationToCart(product, selectedVariation, Number(qtyEl.textContent) || 1);
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.action === 'decrease') {
      qtyEl.textContent = String(Math.max(1, Number(qtyEl.textContent) - 1));
    }
    if (target.dataset.action === 'increase') {
      qtyEl.textContent = String(Number(qtyEl.textContent) + 1);
    }
  });

  const relatedContainer = document.getElementById('relatedProducts');
  if (relatedContainer) {
    relatedContainer.innerHTML = '';
    const productCategory = String(product.category || product.type || '').trim().toLowerCase();
    const related = products.filter((item) => (
      String(item.category || item.type || '').trim().toLowerCase() === productCategory
      && item.id !== product.id
    ));
    related.forEach((item) => relatedContainer.appendChild(createProductCard(item)));
    if (!related.length) relatedContainer.closest('.related-products-section')?.remove();
  }

  const detailReviews = document.getElementById('detailReviews');
  if (detailReviews) {
    const reviews = cmsReviews.filter((review) => review.text && review.author);
    if (!reviews.length) {
      detailReviews.remove();
    } else {
    detailReviews.innerHTML = `
      <div class="reviews-header">
        <h2 id="detailReviewsTitle">Reviews about our products</h2>
        <div class="reviews-rating"><strong>4.8</strong><span class="review-stars">★★★★★</span><span>1,248 reviews</span></div>
      </div>
      <div class="reviews-carousel">
        <button type="button" class="review-nav review-nav-prev" aria-label="Previous reviews">‹</button>
        <div class="reviews-track detail-review-track">
          ${reviews.map((review) => `
            <article class="review-card">
              <img src="${resolveReviewImage(review)}" alt="${review.product || 'Customer review'}" />
              <div class="review-card-body">
                <div class="review-card-meta"><span class="review-stars">${'★'.repeat(review.rating)}</span><time>${formatReviewDate(review.date)}</time></div>
                <h3>${review.title}</h3>
                <p>${review.text}</p>
                <div class="review-author"><strong>${review.author}</strong><span>${review.product}</span></div>
              </div>
            </article>
          `).join('')}
        </div>
        <button type="button" class="review-nav review-nav-next" aria-label="Next reviews">›</button>
      </div>
    `;
    bindReviewCarousel(detailReviews);
    }
  }

  const detailFaq = document.getElementById('detailFaq');
  if (detailFaq) {
    detailFaq.innerHTML = `
      <div class="faq-inner">
        <h2 id="detailFaqTitle">Frequently Asked Questions</h2>
        <div class="faq-list">
          <details class="faq-item" open><summary>What makes ${product.name} special?</summary><p>This product is selected for quality, practicality, and lasting customer value.</p></details>
          <details class="faq-item"><summary>How long does delivery take?</summary><p>Orders are prepared quickly, with delivery time depending on your location.</p></details>
          <details class="faq-item"><summary>Can I return or exchange this product?</summary><p>Yes. Contact us with your order details within 14 days for return guidance.</p></details>
          <details class="faq-item"><summary>How can I choose the right product?</summary><p>Review the product details above or contact our team for a helpful recommendation.</p></details>
        </div>
      </div>
    `;
  }
};

const init = async () => {
  if (isCmsRoute()) return;
  showPageLoader();

  try {
    loadCart();
    ensureCartPanel();
    applyCmsPageMedia();
    renderAnnouncement();
    renderWhatsAppButton();
    renderTrendingProducts();
    await renderVideoShowcase();
    await renderCategoryPage();
    repairMojibake();
    bindSearch();
    updateCartUI();
    bindCartEvents();
    bindReviewCarousel();
    if (window.location.pathname.includes('product-detail')) {
      renderDetailPage();
    }
    if (window.location.pathname.includes('checkout')) {
      renderCheckoutPage();
    }
    restoreScrollPosition();

    try {
      await loadSupabaseContent();
      if (supabaseContentLoaded) {
        applyCmsPageMedia();
        renderTrendingProducts();
        await renderVideoShowcase();
        await renderCategoryPage();
        renderShopReviews();
        updateCartUI();
        if (window.location.pathname.includes('product-detail')) renderDetailPage();
        if (window.location.pathname.includes('checkout')) renderCheckoutPage();
      }
    } catch (error) {
      console.warn('Supabase storefront bootstrap failed; continuing with cached/local storefront content.', error);
    }

    try {
      const remoteLoaded = await loadRemoteContent();
      if (remoteLoaded) {
        await hydrateCmsVideos();
        applyCmsPageMedia();
        renderTrendingProducts();
        await renderVideoShowcase();
        await renderCategoryPage();
        renderShopReviews();
        updateCartUI();
        if (window.location.pathname.includes('product-detail')) renderDetailPage();
        if (window.location.pathname.includes('checkout')) renderCheckoutPage();
      }
    } catch (error) {
      console.warn('Remote content bootstrap failed; continuing with local storefront content.', error);
    }
  } catch (error) {
    console.error('Storefront initialization failed; rendering cached/local content instead.', error);
    renderAnnouncement();
    renderWhatsAppButton();
    renderTrendingProducts();
    if (window.location.pathname.includes('product-detail')) renderDetailPage();
    if (window.location.pathname.includes('checkout')) renderCheckoutPage();
  } finally {
    forceHideLoader();
    await waitForInitialStorefrontLoad();
  }
};

window.addEventListener('storage', (event) => {
  if (isCmsRoute()) return;
  if (event.key === 'rak-cms-data' && !window.location.pathname.endsWith('/cms.html')) {
    window.location.reload();
  }
});

if (!isCmsRoute()) {
  init();
}

