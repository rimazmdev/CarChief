import { getDoc, onSnapshot, collection, DocumentReference, DocumentSnapshot, Query, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';

class FirestoreCacheManager {
  private _isFallback: boolean = false;
  private cache = new Map<string, any>();

  public isFallbackMode(...args: any[]): boolean {
    return this._isFallback;
  }

  get(key: string, ...args: any[]) {
    return this.cache.get(key);
  }

  set(key: string, value: any) {
    this.cache.set(key, value);
  }

  setFallbackMode(mode: boolean) {
    this._isFallback = mode;
  }

  invalidate(key?: string, ...args: any[]) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  clear() {
    this.cache.clear();
  }

  clearAll() {
    this.cache.clear();
  }

  subscribeToCollection(keyOrQuery: any, ...args: any[]) {
    const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : (typeof keyOrQuery === 'function' ? keyOrQuery : null);
    let queryRef: any = null;

    if (typeof keyOrQuery === 'string') {
      try {
        queryRef = collection(db, keyOrQuery);
      } catch (e) {
        console.warn('Failed to resolve collection:', keyOrQuery, e);
      }
    } else if (keyOrQuery && typeof keyOrQuery === 'object') {
      queryRef = keyOrQuery;
    } else {
      queryRef = args.find(a => a && typeof a === 'object');
    }

    if (queryRef && typeof callback === 'function') {
      try {
        return onSnapshot(queryRef as any, (snapshot: QuerySnapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (typeof keyOrQuery === 'string') {
            this.set(keyOrQuery, data);
          }
          callback(data);
        }, (err) => {
          console.warn('Snapshot error:', err);
          if (callback) callback(this.get(typeof keyOrQuery === 'string' ? keyOrQuery : '') || []);
        });
      } catch (err) {
        console.warn('subscribeToCollection error:', err);
        if (callback) callback(this.get(typeof keyOrQuery === 'string' ? keyOrQuery : '') || []);
      }
    } else if (callback) {
      callback(this.get(typeof keyOrQuery === 'string' ? keyOrQuery : '') || []);
    }
    return () => {};
  }

  async fetchCollection(key: string, ...args: any[]) {
    const cached = this.get(key);
    if (cached) return cached;
    return [];
  }

  mutateLocalCollection(key: string, ...args: any[]) {
    const updater = args.find(a => typeof a === 'function');
    const current = this.get(key) || [];
    const updated = updater ? updater(current) : current;
    this.set(key, updated);
    return updated;
  }
}

export const firestoreCache = new FirestoreCacheManager();

export function getFallbackPresets(...args: any[]) {
  return [];
}

export async function instrumentedGetDoc<T = DocumentData>(docRef: DocumentReference<T>, ...args: any[]): Promise<DocumentSnapshot<T>> {
  return await getDoc(docRef);
}

export function instrumentedOnSnapshot<T = DocumentData>(
  ...args: any[]
) {
  const ref = args[0];
  const onNext = typeof args[1] === 'function' ? args[1] : args[2];
  const onError = typeof args[2] === 'function' && args[2] !== onNext ? args[2] : args[3];
  try {
    return onSnapshot(ref as any, onNext, onError);
  } catch (e) {
    console.warn('instrumentedOnSnapshot error:', e);
    return () => {};
  }
}
