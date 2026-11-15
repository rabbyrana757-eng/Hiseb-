import type {GameState} from './types';
const DB_NAME='my-city-db', STORE='saves', SAVE_ID='main';
function openDB():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
export async function saveGame(state:GameState):Promise<void>{
 const db=await openDB();
 await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(state,SAVE_ID);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
 db.close();
}
export async function loadGame():Promise<GameState|null>{
 const db=await openDB();
 const result=await new Promise<GameState|null>((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(SAVE_ID);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error)});
 db.close();return result;
}
