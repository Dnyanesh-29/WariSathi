/**
 * sosService.ts � WariSathi SOS logic
 *
 * Uses @react-native-firebase/database modular API (v26):
 *   getDatabase(), ref(), set()
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { NativeModules } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getDatabase, ref, set } from '@react-native-firebase/database';
import { FIREBASE_DB_URL } from '../config/firebaseConfig';

// Check at startup whether the native SMS module is actually linked.
// If NativeModules.SendDirectSms is undefined the APK was built without
// the library's native code and every send attempt will silently fail.
const SMS_NATIVE_AVAILABLE = !!NativeModules.SendDirectSms;
if (!SMS_NATIVE_AVAILABLE) {
  console.error(
    '[SOS] react-native-send-direct-sms native module NOT found. ' +
    'SMS will not work. Rebuild the APK after installing the package.'
  );
}

// --- Types -------------------------------------------------------------------

export interface SOSRecord {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  timestamp: number;
  emergencyContact: string;
  resolved: boolean;
}

export interface SOSHistoryEntry {
  id: string;
  timestamp: number;
  name: string;
  lat: number;
  lng: number;
  status: 'Sent' | 'Queued' | 'Delivered';
  emergencyContact: string;
}

export type SOSStatus = 'sent' | 'queued';

export interface SOSResult {
  status: SOSStatus;
  record: SOSRecord;
}

// --- Keys --------------------------------------------------------------------

const QUEUE_KEY   = 'sos_queue';
const HISTORY_KEY = 'sos_history';
const PROFILE_KEY = 'userProfile';

// --- Internal helpers ---------------------------------------------------------

async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        userId:           p.userId       ?? `user_${Date.now()}`,
        name:             p.name         ?? 'Unknown Pilgrim',
        emergencyContact: p.emergencyPhone ?? '',
      };
    }
  } catch (_) {}
  return { userId: `user_${Date.now()}`, name: 'Unknown Pilgrim', emergencyContact: '' };
}

async function getLocation(): Promise<{ lat: number; lng: number }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { lat: 17.6822, lng: 75.3277 }; // Pandharpur fallback
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch (_) {
    return { lat: 17.6822, lng: 75.3277 };
  }
}

function mapsLink(lat: number, lng: number) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

async function sendSMS(name: string, lat: number, lng: number, contact: string): Promise<boolean> {
  if (!contact) {
    console.warn('[SOS] No emergency contact set — SMS skipped');
    return false;
  }

  if (!SMS_NATIVE_AVAILABLE) {
    console.error('[SOS] Cannot send SMS: native module not linked. Rebuild the APK.');
    return false;
  }

  try {
    const { PermissionsAndroid } = require('react-native');
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
      title: 'SMS Permission Required',
      message: 'WariSathi needs permission to send emergency SMS alerts.',
      buttonPositive: 'Allow',
    });

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.error('[SOS] SEND_SMS permission denied by user. Status:', granted);
      return false;
    }

    // Note: Emojis force UCS-2 encoding (70 char limit).
    // Use plain ASCII to keep GSM 7-bit encoding (160 char limit).
    const body = `SOS Alert! ${name} needs help. Location: ${mapsLink(lat, lng)} - Sent via WariSathi`;
    NativeModules.SendDirectSms.sendDirectSms(contact, body);
    console.log('[SOS] SMS dispatched to', contact);
    return true;
  } catch (err: any) {
    console.error('[SOS] Direct SMS failed:', err?.message ?? err);
    return false;
  }
}

async function writeToFirebase(record: SOSRecord): Promise<void> {
  const db = getDatabase(undefined, FIREBASE_DB_URL);
  const nodeRef = ref(db, `sos_alerts/${record.timestamp}`);
  await set(nodeRef, record);
}

async function appendHistory(entry: SOSHistoryEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const history: SOSHistoryEntry[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, 20)));
  } catch (_) {}
}

async function updateHistoryStatus(id: string, status: SOSHistoryEntry['status']): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    const history: SOSHistoryEntry[] = JSON.parse(raw);
    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.map(e => (e.id === id ? { ...e, status } : e)))
    );
  } catch (_) {}
}

async function loadQueue(): Promise<SOSHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

async function saveQueue(queue: SOSHistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// --- Public API ---------------------------------------------------------------

/**
 * Main entry point � call when the user confirms SOS.
 * Detects connectivity, writes to Firebase or queues offline.
 * Always returns the record that was created.
 */
export async function triggerSOS(): Promise<SOSResult> {
  const { userId, name, emergencyContact } = await loadProfile();
  const { lat, lng }                       = await getLocation();
  const timestamp                          = Date.now();

  const record: SOSRecord = {
    userId, name, lat, lng, timestamp, emergencyContact, resolved: false,
  };

  const historyEntry: SOSHistoryEntry = {
    id: timestamp.toString(), timestamp, name, lat, lng,
    status: 'Queued', emergencyContact,
  };

  const netState = await NetInfo.fetch();
  const isOnline = !!(netState.isConnected && netState.isInternetReachable);

  if (isOnline) {
    // -- Online path ------------------------------------------------------
    try { await writeToFirebase(record); }
    catch (e) { console.warn('[SOS] Firebase write failed:', e); }

    await sendSMS(name, lat, lng, emergencyContact);

    historyEntry.status = 'Sent';
    await appendHistory(historyEntry);
    return { status: 'sent', record };
  } else {
    // -- Offline path � queue ---------------------------------------------
    const queue = await loadQueue();
    queue.push(historyEntry);
    await saveQueue(queue);

    historyEntry.status = 'Queued';
    await appendHistory(historyEntry);
    return { status: 'queued', record };
  }
}

/**
 * Flush every queued SOS to Firebase + SMS.
 * Called by the background flusher when connectivity is restored.
 */
export async function flushQueue(onDelivered: (count: number) => void): Promise<number> {
  const queue = await loadQueue();
  if (queue.length === 0) return 0;

  let flushed = 0;
  for (const entry of queue) {
    try {
      const record: SOSRecord = {
        userId:           entry.id,
        name:             entry.name,
        lat:              entry.lat,
        lng:              entry.lng,
        timestamp:        entry.timestamp,
        emergencyContact: entry.emergencyContact,
        resolved:         false,
      };
      await writeToFirebase(record);
      await sendSMS(entry.name, entry.lat, entry.lng, entry.emergencyContact);
      await updateHistoryStatus(entry.id, 'Delivered');
      flushed++;
    } catch (e) {
      console.warn('[SOS] Flush failed for entry', entry.id, e);
    }
  }

  await saveQueue([]);
  if (flushed > 0) onDelivered(flushed);
  return flushed;
}

/** Load local SOS history (newest first). */
export async function loadSOSHistory(): Promise<SOSHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

// --- Background queue flusher -------------------------------------------------

let _flusherInterval:    ReturnType<typeof setInterval> | null = null;
let _netInfoUnsubscribe: (() => void) | null                   = null;

/**
 * Start the background queue flusher:
 *  - Subscribes to NetInfo for immediate flush on reconnect.
 *  - Falls back to a 30-second polling interval.
 */
export function startQueueFlusher(onDelivered: (count: number) => void): void {
  // Immediate flush when we reconnect
  _netInfoUnsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable) {
      flushQueue(onDelivered);
    }
  });

  // Fallback 30-second poll
  _flusherInterval = setInterval(async () => {
    const s = await NetInfo.fetch();
    if (s.isConnected && s.isInternetReachable) {
      await flushQueue(onDelivered);
    }
  }, 30_000);
}

/** Stop the background flusher. Call on component unmount. */
export function stopQueueFlusher(): void {
  if (_flusherInterval)    { clearInterval(_flusherInterval);    _flusherInterval    = null; }
  if (_netInfoUnsubscribe) { _netInfoUnsubscribe();              _netInfoUnsubscribe = null; }
}


