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

// Activate event - cleanup old caches and initialize background processing
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
      .then(() => {
        // Initialize background keystroke processing
        console.log('🧠 SW: Initializing background processing...');
        return loadBackgroundData();
      })
      .then(() => {
        initBackgroundProcessing();
        console.log('🧠 SW: Background processing ready');
      })
      .catch(error => {
        console.error('🧠 SW: Activation failed', error);
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

// Background keystroke processing data
let backgroundProcessing = {
  keystrokeData: [],
  riskHistory: [],
  lastProcessed: Date.now(),
  enabled: true,
  processingInterval: null
};

// Initialize background processing
function initBackgroundProcessing() {
  if (backgroundProcessing.processingInterval) return;
  
  backgroundProcessing.processingInterval = setInterval(() => {
    if (backgroundProcessing.enabled && backgroundProcessing.keystrokeData.length > 10) {
      processBackgroundKeystrokes();
      notifyAllClients();
    }
  }, 10000); // Process every 10 seconds
  
  console.log('🧠 SW: Background keystroke processing initialized');
}

// Process keystroke data in background
function processBackgroundKeystrokes() {
  const recent = backgroundProcessing.keystrokeData.slice(-50);
  if (recent.length < 5) return;
  
  // Calculate basic statistics
  const dwellTimes = recent.map(k => k.meanDwell || 0).filter(d => d > 0);
  const flightTimes = recent.map(k => k.meanFlight || 0).filter(f => f > 0);
  
  if (dwellTimes.length > 3 && flightTimes.length > 3) {
    const avgDwell = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
    const avgFlight = flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length;
    
    // Simple risk calculation based on timing patterns
    const dwellVariance = dwellTimes.reduce((sum, d) => sum + Math.pow(d - avgDwell, 2), 0) / dwellTimes.length;
    const riskScore = Math.min(0.9, Math.max(0.1, dwellVariance / (avgDwell * 10)));
    
    const riskData = {
      risk: riskScore,
      confidence: Math.min(1, recent.length / 30),
      timestamp: Date.now(),
      source: 'background_sw',
      sampleCount: recent.length,
      avgDwell,
      avgFlight
    };
    
    backgroundProcessing.riskHistory.push(riskData);
    
    // Keep last 500 entries
    if (backgroundProcessing.riskHistory.length > 500) {
      backgroundProcessing.riskHistory = backgroundProcessing.riskHistory.slice(-500);
    }
    
    console.log('🧠 SW: Background processing complete', {
      riskScore: riskScore.toFixed(3),
      samples: recent.length,
      avgDwell: avgDwell.toFixed(1)
    });
    
    // Store processed data persistently
    storeBackgroundData();
  }
  
  backgroundProcessing.lastProcessed = Date.now();
}

// Notify all clients about background updates
function notifyAllClients() {
  self.clients.matchAll().then(clients => {
    const latestRisk = backgroundProcessing.riskHistory[backgroundProcessing.riskHistory.length - 1];
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_KEYSTROKE_UPDATE',
        data: {
          lastProcessed: backgroundProcessing.lastProcessed,
          keystrokeCount: backgroundProcessing.keystrokeData.length,
          riskCount: backgroundProcessing.riskHistory.length,
          latestRisk
        }
      });
    });
  });
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
      
    // NEW: Background keystroke processing
    case 'UPDATE_KEYSTROKE_DATA':
      console.log('🧠 SW: Received keystroke data update');
      backgroundProcessing.keystrokeData.push({
        ...data,
        timestamp: Date.now(),
        source: 'client'
      });
      // Keep last 200 entries
      if (backgroundProcessing.keystrokeData.length > 200) {
        backgroundProcessing.keystrokeData = backgroundProcessing.keystrokeData.slice(-200);
      }
      break;
      
    case 'GET_BACKGROUND_DATA':
      event.ports[0].postMessage({
        type: 'BACKGROUND_DATA_RESPONSE',
        data: {
          keystrokeCount: backgroundProcessing.keystrokeData.length,
          riskHistory: backgroundProcessing.riskHistory,
          lastProcessed: backgroundProcessing.lastProcessed,
          enabled: backgroundProcessing.enabled
        }
      });
      break;
      
    case 'ENABLE_BACKGROUND_PROCESSING':
      backgroundProcessing.enabled = true;
      initBackgroundProcessing();
      console.log('🧠 SW: Background processing enabled');
      break;
      
    case 'DISABLE_BACKGROUND_PROCESSING':
      backgroundProcessing.enabled = false;
      if (backgroundProcessing.processingInterval) {
        clearInterval(backgroundProcessing.processingInterval);
        backgroundProcessing.processingInterval = null;
      }
      console.log('🧠 SW: Background processing disabled');
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

// Store background processing data
async function storeBackgroundData() {
  try {
    const request = indexedDB.open('CognitiveFingerprint', 1);
    
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['background'], 'readwrite');
        const store = transaction.objectStore('background');
        
        store.put({
          id: 'current',
          keystrokeData: backgroundProcessing.keystrokeData,
          riskHistory: backgroundProcessing.riskHistory,
          lastProcessed: backgroundProcessing.lastProcessed,
          timestamp: Date.now()
        });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('background')) {
          db.createObjectStore('background', { keyPath: 'id' });
        }
      };
    });
  } catch (error) {
    console.error('🧠 SW: Failed to store background data', error);
  }
}

// Load background processing data on startup
async function loadBackgroundData() {
  try {
    const request = indexedDB.open('CognitiveFingerprint', 1);
    
    return new Promise((resolve, reject) => {
      request.onerror = () => {
        console.log('🧠 SW: No existing background data');
        resolve();
      };
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('background')) {
          resolve();
          return;
        }
        
        const transaction = db.transaction(['background'], 'readonly');
        const store = transaction.objectStore('background');
        const getRequest = store.get('current');
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          if (result) {
            backgroundProcessing.keystrokeData = result.keystrokeData || [];
            backgroundProcessing.riskHistory = result.riskHistory || [];
            backgroundProcessing.lastProcessed = result.lastProcessed || Date.now();
            console.log('🧠 SW: Loaded background data', {
              keystrokes: backgroundProcessing.keystrokeData.length,
              risks: backgroundProcessing.riskHistory.length
            });
          }
          resolve();
        };
        getRequest.onerror = () => resolve();
      };
    });
  } catch (error) {
    console.error('🧠 SW: Failed to load background data', error);
  }
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
