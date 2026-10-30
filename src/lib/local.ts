// Pending work contains call data. It stays on this origin and is cleared on acknowledgement.
export type Draft<T> = {
  baseRevision: number;
  value: T;
  completionKey?: string;
};
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("call-coach", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("pending");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function transact<T>(
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending", mode);
    const req = action(tx.objectStore("pending"));
    let result: T;
    req.onsuccess = () => {
      result = req.result;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export const local = {
  get: <T>(key: string) =>
    transact<Draft<T> | undefined>("readonly", (s) => s.get(key)),
  put: <T>(key: string, value: Draft<T>) =>
    transact("readwrite", (s) => s.put(value, key)),
  remove: (key: string) => transact("readwrite", (s) => s.delete(key)),
};
