import { firebaseConfig, SYNC_ENABLED } from './firebase-config.js';
import { db, onMutation, applyRemote, getAllForSync } from './db.js';
import { showToast } from './components/toast.js';

const TABLES = ['clientes', 'pagos', 'actividades'];

let app = null;
let auth = null;
let fs = null;
let currentUser = null;
const authListeners = new Set();
const statusListeners = new Set();
let status = 'idle';
let unsubSnapshots = [];
let unsubMutations = null;

function setStatus(s) { status = s; statusListeners.forEach(fn => { try { fn(s); } catch {} }); }
function getStatus() { return status; }
function getUser() { return currentUser; }
function onAuthChange(fn) { authListeners.add(fn); fn(currentUser); return () => authListeners.delete(fn); }
function onStatusChange(fn) { statusListeners.add(fn); fn(status); return () => statusListeners.delete(fn); }

function initFirebase() {
  if (app) return;
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK no cargado');
    return;
  }
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  fs = firebase.firestore();
  auth.onAuthStateChanged(async user => {
    currentUser = user;
    authListeners.forEach(fn => { try { fn(user); } catch {} });
    if (user) await startSync();
    else stopSync();
  });
}

async function signIn() {
  if (!auth) return;
  setStatus('signing-in');
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (isStandalone || isMobile) {
      await auth.signInWithRedirect(provider);
    } else {
      await auth.signInWithPopup(provider);
    }
  } catch (e) {
    setStatus('error');
    showToast(`Error de login: ${e.message}`, 'error');
  }
}

async function signOut() {
  if (!auth) return;
  stopSync();
  await auth.signOut();
}

function userCol(table) {
  return fs.collection('users').doc(currentUser.uid).collection(table);
}

async function pullAll() {
  const remoteByTable = {};
  for (const t of TABLES) {
    const snap = await userCol(t).get();
    remoteByTable[t] = snap.docs.map(d => d.data());
  }
  return remoteByTable;
}

async function mergeRemoteIntoLocal(remoteByTable) {
  for (const t of TABLES) {
    for (const record of remoteByTable[t]) {
      await applyRemote(t, record);
    }
  }
}

async function pushLocalNotInRemote(remoteByTable) {
  const batch = fs.batch();
  let pending = 0;
  for (const t of TABLES) {
    const remoteIds = new Set(remoteByTable[t].map(r => r.id));
    const locals = await getAllForSync(t);
    for (const record of locals) {
      if (remoteIds.has(record.id)) {
        const remote = remoteByTable[t].find(r => r.id === record.id);
        if (remote && remote.updated_at >= record.updated_at) continue;
      }
      batch.set(userCol(t).doc(String(record.id)), record);
      pending++;
      if (pending >= 400) {
        await batch.commit();
        pending = 0;
      }
    }
  }
  if (pending > 0) await batch.commit();
}

function installSnapshotListeners() {
  for (const t of TABLES) {
    const unsub = userCol(t).onSnapshot(async snap => {
      for (const change of snap.docChanges()) {
        if (change.type === 'added' || change.type === 'modified') {
          await applyRemote(t, change.doc.data());
        }
      }
    }, err => {
      console.error(`snapshot ${t}`, err);
      setStatus('error');
    });
    unsubSnapshots.push(unsub);
  }
}

function installMutationListener() {
  unsubMutations = onMutation(async ({ table, record }) => {
    if (!currentUser) return;
    try {
      setStatus('syncing');
      await userCol(table).doc(String(record.id)).set(record);
      setStatus('synced');
    } catch (e) {
      console.error('push', e);
      setStatus('error');
    }
  });
}

async function startSync() {
  setStatus('syncing');
  try {
    const remote = await pullAll();
    await mergeRemoteIntoLocal(remote);
    await pushLocalNotInRemote(remote);
    installSnapshotListeners();
    installMutationListener();
    setStatus('synced');
    showToast('Sincronizado con la nube', 'success');
  } catch (e) {
    console.error('startSync', e);
    setStatus('error');
    showToast(`Error de sync: ${e.message}`, 'error');
  }
}

function stopSync() {
  unsubSnapshots.forEach(u => { try { u(); } catch {} });
  unsubSnapshots = [];
  if (unsubMutations) { try { unsubMutations(); } catch {} unsubMutations = null; }
  setStatus('idle');
}

async function init() {
  if (!SYNC_ENABLED) return;
  initFirebase();
  try {
    await auth.getRedirectResult();
  } catch (e) {
    console.error('getRedirectResult', e);
  }
}

export { init, signIn, signOut, getUser, getStatus, onAuthChange, onStatusChange, SYNC_ENABLED };
