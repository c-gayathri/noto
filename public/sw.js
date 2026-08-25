/* Nimbus service worker: offline shell + Web Share Target ingestion */
const VERSION = 'nimbus-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function isShareIngest(request, url) {
  return request.method === 'POST' && url.pathname === '/save'
}

async function handleShareIngest(request) {
  const cache = await caches.open(VERSION)
  const form = await request.formData()
  const entries = []
  const push = (name, type, blob) => {
    if (blob && blob.size > 0) entries.push({ name, type, blob })
  }
  for (const field of ['files', 'media', 'file', 'image', 'video', 'audio']) {
    for (const value of form.getAll(field)) {
      if (typeof value !== 'string') push(value.name || field, value.type || 'application/octet-stream', value)
    }
  }
  const meta = { title: form.get('title') || '', text: form.get('text') || '', url: form.get('url') || '', files: [] }
  const store = await caches.open(VERSION + '-share')
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const key = '/__share/file/' + i
    await store.put(key, new Response(e.blob, { headers: { 'content-type': e.type } }))
    meta.files.push({ key, name: e.name, type: e.type })
  }
  await store.put('/__share/meta', new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } }))
  return Response.redirect('/save?shared=1', 303)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (isShareIngest(request, url)) {
    event.respondWith(handleShareIngest(request))
    return
  }
  if (url.pathname.startsWith('/__share/')) {
    event.respondWith(
      (async () => {
        const store = await caches.open(VERSION + '-share')
        const hit = await store.match(request, { ignoreSearch: url.pathname === '/__share/meta' })
        if (!hit) return new Response('not found', { status: 404 })
        return hit
      })()
    )
    return
  }
  if (request.method !== 'GET') return

  // Navigation: network first, fall back to shell (offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(VERSION)
          cache.put('/index.html', fresh.clone())
          return fresh
        } catch {
          const cache = await caches.open(VERSION)
          return (await cache.match('/index.html')) || (await cache.match('/')) || Response.error()
        }
      })()
    )
    return
  }

  // Assets: cache first, then network (and cache it)
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      try {
        const fresh = await fetch(request)
        if (fresh.ok && fresh.type === 'basic') {
          const cache = await caches.open(VERSION)
          cache.put(request, fresh.clone())
        }
        return fresh
      } catch {
        return Response.error()
      }
    })()
  )
})

// Let the app consume + clear the pending share payload
self.addEventListener('message', (event) => {
  if (event.data === 'nimbus:clear-share') {
    caches.delete(VERSION + '-share')
  }
})
