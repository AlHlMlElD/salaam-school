/* Salaam School — local IndexedDB layer.
 * IndexedDB replaces Realm Web here: Realm Web talks to Atlas, not a local
 * browser database. The store names and fields mirror requirements.md.
 */
(function () {
  'use strict';

  const DB_NAME = 'salaam_school';
  const DB_VERSION = 1;
  const STORES = {
    users: {
      keyPath: 'id', autoIncrement: true,
      indexes: [['email', 'email', { unique: true }], ['role', 'role', { unique: false }]],
    },
    students: {
      keyPath: 'id', autoIncrement: true,
      indexes: [['classId', 'classId', { unique: false }], ['status', 'status', { unique: false }]],
    },
    classes: {
      keyPath: 'id', autoIncrement: true,
      indexes: [['grade', 'grade', { unique: false }]],
    },
    teachers: {
      keyPath: 'id', autoIncrement: true,
      indexes: [['status', 'status', { unique: false }]],
    },
    subjects: {
      keyPath: 'id', autoIncrement: true,
      indexes: [['grade', 'grade', { unique: false }]],
    },
    attendance: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        ['studentId', 'studentId', { unique: false }],
        ['classId', 'classId', { unique: false }],
        ['date', 'date', { unique: false }],
      ],
    },
    grades: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        ['studentId', 'studentId', { unique: false }],
        ['subjectId', 'subjectId', { unique: false }],
        ['term', 'term', { unique: false }],
      ],
    },
    payments: {
      keyPath: 'id', autoIncrement: true,
      indexes: [['studentId', 'studentId', { unique: false }], ['status', 'status', { unique: false }]],
    },
    schedule: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        ['classId', 'classId', { unique: false }],
        ['teacherId', 'teacherId', { unique: false }],
        ['day', 'day', { unique: false }],
      ],
    },
    notifications: {
      keyPath: 'id', autoIncrement: true,
      indexes: [['targetRole', 'targetRole', { unique: false }], ['isRead', 'isRead', { unique: false }]],
    },
  };

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        Object.entries(STORES).forEach(([name, def]) => {
          if (db.objectStoreNames.contains(name)) return;
          const store = db.createObjectStore(name, { keyPath: def.keyPath, autoIncrement: def.autoIncrement });
          (def.indexes || []).forEach(([indexName, keyPath, options]) => {
            store.createIndex(indexName, keyPath, options);
          });
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('قاعدة البيانات مفتوحة في نافذة قديمة. أغلق التبويبات الأخرى وحاول مرة أخرى.'));
    });
    return dbPromise;
  }

  function store(name, mode) {
    return open().then((db) => db.transaction(name, mode || 'readonly').objectStore(name));
  }

  function wrap(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  const DB = {
    open,
    stores: Object.keys(STORES),
    all(name) {
      return store(name).then((s) => wrap(s.getAll()));
    },
    get(name, id) {
      return store(name).then((s) => wrap(s.get(id)));
    },
    count(name) {
      return store(name).then((s) => wrap(s.count()));
    },
    add(name, value) {
      return store(name, 'readwrite').then((s) => wrap(s.add(value)));
    },
    put(name, value) {
      return store(name, 'readwrite').then((s) => wrap(s.put(value)));
    },
    del(name, id) {
      return store(name, 'readwrite').then((s) => wrap(s.delete(id)));
    },
    clear(name) {
      return store(name, 'readwrite').then((s) => wrap(s.clear()));
    },
    bulkPut(name, values) {
      return open().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(name, 'readwrite');
        const s = tx.objectStore(name);
        values.forEach((value) => s.put(value));
        tx.oncomplete = () => resolve(values.length);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('تم إلغاء العملية'));
      }));
    },
    async reset() {
      const db = await open();
      const names = Object.keys(STORES);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(names, 'readwrite');
        names.forEach((name) => tx.objectStore(name).clear());
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      dbPromise = null;
      const closeReq = indexedDB.deleteDatabase(DB_NAME);
      await new Promise((resolve) => { closeReq.onsuccess = closeReq.onerror = closeReq.onblocked = resolve; });
    },
  };

  window.DB = DB;
})();
