let connection;
function openDatabase() {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open("color-by-number", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("puzzles", { keyPath: "id" });
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        connection = null;
        reject(request.error);
      };
      request.onblocked = () => {
        connection = null;
        reject(new Error("Close other puzzle tabs and try again."));
      };
    });
  return connection;
}
async function transact(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("puzzles", mode);
    const request = action(tx.objectStore("puzzles"));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Save interrupted."));
  });
}
export const savePuzzle = (record) =>
  transact("readwrite", (store) => store.put(record));
export const listPuzzles = () =>
  transact("readonly", (store) => store.getAll());
export const deletePuzzle = (id) =>
  transact("readwrite", (store) => store.delete(id));
