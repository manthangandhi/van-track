// IndexedDB wrapper for offline storage

const DB_NAME = 'VanTrack'
const DB_VERSION = 1
const STORE_NAME = 'punches'
const QUEUE_STORE_NAME = 'syncQueue'

let db = null

async function initDB() {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
      if (!database.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        database.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export async function savePunchOffline(punch) {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add({ ...punch, savedAt: Date.now() })

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function getOfflinePunches() {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function deleteOfflinePunch(id) {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function addToSyncQueue(item) {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([QUEUE_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE_NAME)
    const request = store.add({ ...item, queuedAt: Date.now() })

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function getSyncQueue() {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([QUEUE_STORE_NAME], 'readonly')
    const store = transaction.objectStore(QUEUE_STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function getSyncQueueCount() {
  const queue = await getSyncQueue()
  return queue.length
}

export async function removeFromSyncQueue(id) {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([QUEUE_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE_NAME)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function clearSyncQueue() {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([QUEUE_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE_NAME)
    const request = store.clear()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}
