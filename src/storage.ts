import type {GameState} from './types';
const DB='my-city-v2',STORE='saves',ID='main';
function openDB():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function saveGame(s:GameState):Promise<void>{const d=await openDB();await new Promise<void>((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(s,ID);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)});d.close()}
export async function loadGame():Promise<GameState|null>{const d=await openDB();const v=await new Promise<GameState|null>((res,rej)=>{const r=d.transaction(STORE).objectStore(STORE).get(ID);r.onsuccess=()=>res(r.result??null);r.onerror=()=>rej(r.error)});d.close();return v}
