// Cognitive Fingerprint Service Worker
// Implements offline functionality and caching for medical-grade PWA

const CACHE_NAME = 'cognitive-fingerprint-v1.0.0';
const CACHE_VERSION = 1;
const PRECACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/monitor',
  '/report',
  '/demo',
  // Add other critical resources
];

// Medical data that should never be cached (privacy-first)
const SENSITIVE_PATHS = [
  '/api/patient',
  '/api/biomarkers',
  '/api/analysis',
  '/api/report'
];

// Install event - precache critical resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Precaching App Shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName.startsWith('cognitive-fingerprint-') && 
                     cacheName !== CACHE_NAME;
            })
            .map(cacheName => {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Service Worker: Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip caching for sensitive medical data
  if (SENSITIVE_PATHS.some(path => url.pathname.startsWith(path))) {
    console.log('Service Worker: Bypassing cache for sensitive data', url.pathname);
    event.respondWith(fetch(request));
    return;
  }
  
  // Skip caching for external domains (privacy)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Cache strategy based on request type
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request));
  } else {
    // Don't cache POST, PUT, DELETE requests
    event.respondWith(fetch(request));
  }
});

// Handle GET requests with cache-first strategy
async function handleGetRequest(request) {
  try {
    // Check cache first
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving from cache', request.url);
      
      // Update cache in background for dynamic content
      if (isDynamicContent(request.url)) {
        updateCacheInBackground(request);
      }
      
      return cachedResponse;
    }
    
    // Fetch from network
    console.log('Service Worker: Fetching from network', request.url);
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200 && shouldCache(request.url)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('Service Worker: Fetch failed', request.url, error);
    
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || 
             caches.match('/') ||
             new Response('Offline - Please check your connection', { 
               status: 503,
               statusText: 'Service Unavailable'
             });
    }
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Update cache in background
function updateCacheInBackground(request) {
  fetch(request)
    .then(response => {
      if (response.status === 200) {
        return caches.open(CACHE_NAME)
          .then(cache => cache.put(request, response));
      }
    })
    .catch(error => {
      console.log('Service Worker: Background update failed', error);
    });
}

// Determine if content should be cached
function shouldCache(url) {
  const urlObj = new URL(url);
  
  // Don't cache API endpoints
  if (urlObj.pathname.startsWith('/api/')) {
    return false;
  }
  
  // Don't cache sensitive data
  if (SENSITIVE_PATHS.some(path => urlObj.pathname.startsWith(path))) {
    return false;
  }
  
  // Cache static assets
  if (urlObj.pathname.includes('/static/')) {
    return true;
  }
  
  // Cache app pages
  return true;
}

// Determine if content is dynamic (needs background updates)
function isDynamicContent(url) {
  const dynamicPatterns = [
    '/monitor',
    '/dashboard',
    '/validation'
  ];
  
  return dynamicPatterns.some(pattern => url.includes(pattern));
}

// Background sync for offline analysis
self.addEventListener('sync', event => {
  if (event.tag === 'background-analysis') {
    console.log('Service Worker: Background sync - analysis');
    event.waitUntil(performBackgroundAnalysis());
  }
});

// Perform analysis when back online
async function performBackgroundAnalysis() {
  try {
    // Check if there's pending analysis data
    const analysisData = await getStoredAnalysisData();
    
    if (analysisData) {
      console.log('Service Worker: Processing stored analysis data');
      
      // Process the analysis
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData)
      });
      
      if (response.ok) {
        // Clear stored data after successful processing
        await clearStoredAnalysisData();
        
        // Notify all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'ANALYSIS_COMPLETE',
            data: { success: true }
          });
        });
      }
    }
  } catch (error) {
    console.error('Service Worker: Background analysis failed', error);
  }
}

// Message handling from clients
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'STORE_ANALYSIS_DATA':
      storeAnalysisData(data).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.log('Service Worker: Unknown message type', type);
  }
});

// Storage functions for offline analysis
async function storeAnalysisData(data) {
  // Use IndexedDB for larger datasets (privacy-preserving)
  const request = indexedDB.open('CognitiveFingerprint', 1);
  
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['analysis'], 'readwrite');
      const store = transaction.objectStore('analysis');
      
      store.put({
        id: Date.now(),
        data: data,
        timestamp: new Date().toISOString()
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('analysis')) {
        db.createObjectStore('analysis', { keyPath: 'id' });
      }
    };
  });
}

async function getStoredAnalysisData() {
  const request = indexedDB.open('CognitiveFingerprint', 1);
  
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['analysis'], 'readonly');
      const store = transaction.objectStore('analysis');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result.length > 0 ? getAllRequest.result[0] : null);
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

async function clearStoredAnalysisData() {
  const request = indexedDB.open('CognitiveFingerprint', 1);
  
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['analysis'], 'readwrite');
      const store = transaction.objectStore('analysis');
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames
      .filter(cacheName => cacheName.startsWith('cognitive-fingerprint-'))
      .map(cacheName => caches.delete(cacheName))
  );
}

// Push notification handling (for research updates, not medical alerts)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  // Only show research updates, never medical alerts via push
  if (data.type === 'research-update') {
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'research-update',
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View Update'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/validation')
    );
  }
});

console.log('Service Worker: Loaded successfully');
