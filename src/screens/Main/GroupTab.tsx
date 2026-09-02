/**
 * GroupTab.tsx — WariSathi Group Tracker
 *
 * Real implementation — no mock data.
 *  - Firebase Realtime DB: group create / join / presence / GPS sharing
 *  - react-native-ble-plx: ESP32 BLE fallback when offline
 *  - NetInfo: auto mode switching ONLINE ↔ BLUETOOTH
 *  - MapLibre: group map with colored member dots + name labels
 *  - Error Boundary: never crashes
 */

import React, { Component, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Buffer } from 'buffer';
import BottomSheet from '@gorhom/bottom-sheet';
import { ChatBotBottomSheet } from '../../components/ChatBotBottomSheet';
import { Text } from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import MapLibreGL from '../../lib/maplibre';
import { FIREBASE_DB_URL } from '../../config/firebaseConfig';
import {
  getDatabase,
  ref,
  push,
  set,
  query,
  orderByChild,
  equalTo,
  get,
  onValue,
  remove,
  update,
  onDisconnect
} from '@react-native-firebase/database';

let _db: any = null;

const getDb = (): any => {
  if (_db) return _db;
  try {
    _db = getDatabase();
    return _db;
  } catch (e: any) {
    console.warn('[GroupTab] Firebase init failed:', e);
    return null;
  }
};


// ─── Safe BLE import ───────────────────────────────────────────────────────────
let BleManager: any = null;
try {
  const ble = require('react-native-ble-plx');
  BleManager = new ble.BleManager();
} catch (e) {
  console.warn('[GroupTab] BLE failed to load:', e);
}

// ─── Safe NetInfo import ───────────────────────────────────────────────────────
let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  console.warn('[GroupTab] NetInfo failed to load:', e);
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const DEFAULT_CENTER: [number, number] = [74.3200, 18.2500];

const BLE_SERVICE_UUID = '12345678-1234-1234-1234-123456789012';
const BLE_CHAR_WRITE   = '12345678-1234-1234-1234-123456789013';
const BLE_CHAR_READ    = '12345678-1234-1234-1234-123456789014';
const ESP32_NAME       = 'WariSathi_Node';

const MEMBER_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E91E63'];

type ConnectionMode = 'ONLINE' | 'BLUETOOTH' | 'OFFLINE';
type Screen = 'lobby' | 'create_confirm' | 'join_input' | 'group_map';

interface GroupMember {
  userId: string;
  name: string;
  isOnline: boolean;
  lat: number;
  lng: number;
  timestamp: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatLastSeen = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const getMemberStatus = (ts: number, isOnline: boolean) => {
  if (!isOnline) return 'offline';
  const diff = Date.now() - ts;
  if (diff < 120000) return 'active';
  if (diff < 600000) return 'warning';
  return 'missing';
};

const getStatusColor = (status: string) => {
  if (status === 'active')  return Colors.success;
  if (status === 'warning') return Colors.warning;
  if (status === 'missing') return Colors.danger;
  return Colors.inactive;
};

// ─── Error Boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error: string }

class GroupErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, error: '' };

  static getDerivedStateFromError(err: any): EBState {
    return { hasError: true, error: err?.message ?? String(err) };
  }

  componentDidCatch(err: any, info: any) {
    console.error('[GroupTab] Boundary caught:', err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.center}>
          <Text style={{ fontSize: 48, textAlign: 'center' }}>⚠️</Text>
          <Text style={[Typography.headingMedium, { marginTop: 16, marginBottom: 8, textAlign: 'center' }]}>
            Something went wrong
          </Text>
          <Text style={[Typography.bodySmall, { color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 }]}>
            {this.state.error}
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { width: 'auto', paddingHorizontal: 32 }]}
            onPress={() => this.setState({ hasError: false, error: '' })}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Inner Component ───────────────────────────────────────────────────────────
const GroupTabInner = () => {
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading]         = useState(true);
  const [groupId, setGroupId]             = useState<string | null>(null);
  const [groupCode, setGroupCode]         = useState<string | null>(null);
  const [userId, setUserId]               = useState('');
  const [userName, setUserName]           = useState('');
  const [screen, setScreen]               = useState<Screen>('lobby');
  const [joinInput, setJoinInput]         = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const networkStateRef = useRef<boolean>(true);
  const isGroupFullyOnlineRef = useRef<boolean>(true);
  const [groupMembers, setGroupMembers]   = useState<GroupMember[]>([]);
  const [mode, setMode]                   = useState<ConnectionMode>('ONLINE');
  const [esp32Device, setEsp32Device]     = useState<any>(null);

  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
    console.log(message);
  }, []);

  const cameraRef         = useRef<any>(null);
  const memberListenerRef = useRef<any>(null);
  const locationIntRef    = useRef<any>(null);
  const bleCleanupRef     = useRef<(() => void) | null>(null);
  const memberDbRef       = useRef<any>(null);
  const netInfoUnsub      = useRef<any>(null);
  const locationWatchSub  = useRef<any>(null);
  const isScanningRef     = useRef(false);
  const userNameRef       = useRef(''); // always holds latest userName without stale closure

  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);

  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        let uid = await AsyncStorage.getItem('userId');
        if (!uid) {
          uid = `user_${Math.random().toString(36).substring(2, 10)}`;
          await AsyncStorage.setItem('userId', uid);
        }
        setUserId(uid);

        let uname = '';
        const profileStr = await AsyncStorage.getItem('userProfile');
        if (profileStr) {
          try {
            const profile = JSON.parse(profileStr);
            if (profile.name) uname = profile.name;
            else if (profile.fullName) uname = profile.fullName;
          } catch (e) {}
        }
        if (!uname) uname = `Warkari_${uid.slice(-4)}`;
        setUserName(uname);
        userNameRef.current = uname; // keep ref in sync

        const gid = await AsyncStorage.getItem('groupId');
        const gc  = await AsyncStorage.getItem('groupCode');
        if (gid) {
          setGroupId(gid);
          setGroupCode(gc);
          setScreen('group_map');
        }
      } catch (e) {
        console.warn('[GroupTab] Init error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Start group systems when group_map screen is shown ────────────────────────
  useEffect(() => {
    if (screen !== 'group_map' || !groupId || !userId) return;

    setupPresence(groupId, userId, userName);
    startOnlineGPS(groupId, userId);
    startMemberListener(groupId, userId);
    const unsub = startNetInfoListener(groupId, userId);
    netInfoUnsub.current = unsub;

    return () => { cleanupAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, groupId, userId]);

  // ── Presence ──────────────────────────────────────────────────────────────────
  const setupPresence = async (gid: string, uid: string, uname: string) => {
    const db = getDb();
    if (!db) return;
    try {
      const mRef = ref(db, `groups/${gid}/members/${uid}`);
      memberDbRef.current = mRef;
      await set(mRef, { name: uname, isOnline: true, lat: 0, lng: 0, timestamp: Date.now() });
      const disc = onDisconnect(mRef);
      await disc.update({ isOnline: false });
    } catch (e) {
      console.warn('[GroupTab] Presence error:', e);
    }
  };


  // ── Online GPS every 30s ──────────────────────────────────────────────────────
  const startOnlineGPS = (gid: string, uid: string) => {
    // Start continuous watching for the smooth blue dot
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        locationWatchSub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
          (loc) => { setMyLat(loc.coords.latitude); setMyLng(loc.coords.longitude); }
        );
      } catch (e) { console.warn('[GroupTab] GPS watch error:', e); }
    })();

    const db = getDb();
    if (!db) return;

    // Send location immediately (don't wait 30s for first tick)
    const sendLocation = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await update(ref(db, `groups/${gid}/members/${uid}`), {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: Date.now(),
          isOnline: true,
        });
        addLog(`Location sent: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      } catch (e: any) {
        console.warn('[GroupTab] GPS send error:', e);
        addLog('GPS send error: ' + e.message);
      }
    };

    sendLocation(); // fire immediately
    locationIntRef.current = setInterval(sendLocation, 30000); // then every 30s
  };

  // ── Firebase member listener ───────────────────────────────────────────────────
  const startMemberListener = (gid: string, uid: string) => {
    const db = getDb();
    if (!db) return;
    const mRef = ref(db, `groups/${gid}/members`);
    memberListenerRef.current = onValue(mRef, (snap: any) => {
      try {
        const data = snap.val() ?? {};
        const fbMembers: GroupMember[] = Object.entries(data).map(([id, m]: any) => ({
          userId: id, name: m.name ?? 'Warkari',
          isOnline: m.isOnline ?? false,
          lat: m.lat ?? 0, lng: m.lng ?? 0, timestamp: m.timestamp ?? 0,
        }));
        setGroupMembers((prev) => {
          const updated = [...prev];
          fbMembers.forEach((fbMem) => {
            const idx = updated.findIndex((m) => m.userId === fbMem.userId);
            if (idx >= 0) {
              if (fbMem.timestamp > updated[idx].timestamp) {
                updated[idx] = {
                  ...updated[idx],
                  lat: fbMem.lat,
                  lng: fbMem.lng,
                  timestamp: fbMem.timestamp,
                  isOnline: fbMem.isOnline,
                };
              }
            } else {
              updated.push(fbMem);
            }
          });
          return updated;
        });
        const anyOffline = fbMembers.some((m) => m.userId !== uid && m.isOnline === false);
        isGroupFullyOnlineRef.current = !anyOffline;
        // Start scanning if teammates are offline, but don't force UI mode to BLUETOOTH if we have WiFi
        if (anyOffline) { scanForESP32(gid, uid); }
      } catch (e) {
        console.warn('[GroupTab] Member listener error:', e);
      }
    });
  };

  // ── NetInfo listener ──────────────────────────────────────────────────────────
  const startNetInfoListener = (gid: string, uid: string) => {
    if (!NetInfo) return () => {};
    return NetInfo.addEventListener(async (state: any) => {
      const hasInternet = !!state.isConnected;
      networkStateRef.current = hasInternet;
      if (!hasInternet) {
        setMode('BLUETOOTH');
        scanForESP32(gid, uid);
      } else {
        setMode('ONLINE');
        if (getDb()) {
          try { await update(ref(getDb(), `groups/${gid}/members/${uid}`), { isOnline: true }); } catch {}
        }
      }
    });
  };

  // ── BLE permissions ────────────────────────────────────────────────────────────
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      if (apiLevel >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
               result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  };

  // ── BLE scan + connect + sync (all-in-one, no circular deps) ──────────────────
  const scanForESP32 = useCallback(async (gid: string, uid: string) => {
    if (!BleManager || isScanningRef.current || esp32Device) return;
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) { addLog('BLE Permission Denied by User'); return; }

    isScanningRef.current = true;
    addLog('BLE scan started');
    try {
      BleManager.startDeviceScan(null, null, async (err: any, device: any) => {
        if (err) {
          addLog('Scan error: ' + err.message);
          isScanningRef.current = false;
          return;
        }
        if (device?.name === ESP32_NAME) {
          BleManager.stopDeviceScan();
          isScanningRef.current = false;
          addLog('Found WariSathi_Node — connecting...');
          try {
            const conn = await device.connect();
            if (Platform.OS === 'android') {
              try { await conn.requestMTU(512); } catch (e) { addLog('MTU error (ignored)'); }
            }
            await conn.discoverAllServicesAndCharacteristics();
            addLog('Connected to ESP32');
            setEsp32Device(conn);
            setMode('BLUETOOTH');

            const sendLocation = async () => {
              try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') { addLog('Location permission denied'); return; }
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                const payload = JSON.stringify({
                  userId: uid,
                  name: userNameRef.current,
                  groupId: gid,
                  lat: loc.coords.latitude,
                  lng: loc.coords.longitude,
                  timestamp: Date.now(),
                });
                addLog('BLE send: lat=' + loc.coords.latitude.toFixed(5));
                await conn.writeCharacteristicWithResponseForService(
                  BLE_SERVICE_UUID, BLE_CHAR_WRITE,
                  Buffer.from(payload).toString('base64')
                );
                addLog('BLE location sent');
              } catch (e: any) { addLog('BLE send error: ' + e.message); }
            };

            const readMembers = async () => {
              try {
                const char = await conn.readCharacteristicForService(BLE_SERVICE_UUID, BLE_CHAR_READ);
                if (!char?.value) { addLog('BLE read: no data'); return; }
                const decoded = Buffer.from(char.value, 'base64').toString('utf8');
                addLog('BLE RX: ' + decoded.substring(0, 80));
                const data = JSON.parse(decoded);
                if (Array.isArray(data.members)) {
                  setGroupMembers(prev => {
                    const updated = [...prev];
                    data.members.forEach((bleMem: any) => {
                      const idx = updated.findIndex(m => m.userId === bleMem.userId);
                      const isMe = bleMem.userId === uid;
                      const parsedLat = Number(bleMem.lat) || 0;
                      const parsedLng = Number(bleMem.lng) || 0;
                      const parsedTime = Number(bleMem.timestamp) || Date.now();

                      if (idx >= 0) {
                        if (parsedTime > updated[idx].timestamp) {
                           updated[idx] = {
                             ...updated[idx],
                             lat: parsedLat,
                             lng: parsedLng,
                             timestamp: parsedTime,
                             // Keep Firebase online status, except if it's us and we know we're offline
                             isOnline: (isMe && !networkStateRef.current) ? false : updated[idx].isOnline
                           };
                        }
                      } else {
                        updated.push({
                          userId: bleMem.userId,
                          name: bleMem.name || 'Warkari',
                          isOnline: isMe ? !!networkStateRef.current : false,
                          lat: parsedLat,
                          lng: parsedLng,
                          timestamp: parsedTime
                        });
                      }
                    });
                    return updated;
                  });
                  addLog('BLE members merged: ' + data.members.length);
                }
              } catch (e: any) { addLog('BLE read error: ' + e.message); }
            };

            sendLocation();
            readMembers();
            const sendInt = setInterval(sendLocation, 30000);
            const readInt = setInterval(readMembers, 5000);

            const disconnectSub = conn.onDisconnected(() => {
              addLog('BLE dropped...');
              clearInterval(sendInt);
              clearInterval(readInt);
              disconnectSub?.remove();
              setEsp32Device(null);
              isScanningRef.current = false;
              
              if (!networkStateRef.current || !isGroupFullyOnlineRef.current) {
                addLog('Retrying scan in 3s...');
                setTimeout(() => scanForESP32(gid, uid), 3000);
              }
            });

            bleCleanupRef.current = () => {
              clearInterval(sendInt);
              clearInterval(readInt);
              disconnectSub?.remove();
            };
          } catch (e: any) { addLog('Connect error: ' + e.message); isScanningRef.current = false; }
        }
      });
    } catch (e: any) {
      addLog('Scan start error: ' + e.message);
      isScanningRef.current = false;
    }
  }, [addLog, esp32Device]);


  // ── Cleanup all ───────────────────────────────────────────────────────────────
  const cleanupAll = useCallback(() => {
    if (locationWatchSub.current)  { locationWatchSub.current.remove(); locationWatchSub.current = null; }
    if (locationIntRef.current)    { clearInterval(locationIntRef.current); locationIntRef.current = null; }
    if (memberListenerRef.current) { try { memberListenerRef.current(); } catch {} memberListenerRef.current = null; }
    if (bleCleanupRef.current)     { bleCleanupRef.current(); bleCleanupRef.current = null; }
    if (esp32Device)               { try { esp32Device.cancelConnection(); } catch {} }
    if (netInfoUnsub.current)      { try { netInfoUnsub.current(); } catch {} netInfoUnsub.current = null; }
    if (memberDbRef.current)       { try { update(memberDbRef.current, { isOnline: false }); } catch {} }
  }, [esp32Device]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const createGroup = async () => {
    const db = getDb();
    if (!db) {
      Alert.alert('Firebase Unavailable', 'Group features require a native build APK.');
      return;
    }
    setActionLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRef = push(ref(db, 'groups'));
      const gid = newRef.key;
      if (!gid) throw new Error('Could not generate group ID');
      await set(newRef, { info: { groupCode: code, createdAt: Date.now(), createdBy: userId }, members: {} });
      await AsyncStorage.setItem('groupId', gid);
      await AsyncStorage.setItem('groupCode', code);
      setGroupId(gid);
      setGroupCode(code);
      setScreen('create_confirm');

    } catch (e: any) {
      Alert.alert('Error', `Could not create group: ${e?.message ?? e}`);
    } finally {
      setActionLoading(false);
    }
  };

  const joinGroup = async () => {
    const db = getDb();
    if (!db) {
      Alert.alert('Firebase Unavailable', 'Group features require a native build APK.');
      return;
    }
    const code = joinInput.trim().toUpperCase();
    if (!code) { Alert.alert('Error', 'Please enter a group code.'); return; }
    setActionLoading(true);
    try {
      const q = query(ref(db, 'groups'), orderByChild('info/groupCode'), equalTo(code));
      const snap = await get(q);
      if (!snap.exists()) { Alert.alert('Not Found', 'No group found. Check the code and try again.'); return; }
      const gid = Object.keys(snap.val())[0];
      await AsyncStorage.setItem('groupId', gid);
      await AsyncStorage.setItem('groupCode', code);
      setGroupId(gid);
      setGroupCode(code);
      setScreen('group_map');
    } catch (e: any) {
      Alert.alert('Error', `Could not join: ${e?.message ?? e}`);
    } finally {
      setActionLoading(false);
    }
  };

  const leaveGroup = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        cleanupAll();
        if (getDb()) {
          try { await remove(ref(getDb(), `groups/${groupId}/members/${userId}`)); } catch {}
        }
        await AsyncStorage.removeItem('groupId');
        await AsyncStorage.removeItem('groupCode');
        setGroupId(null); setGroupCode(null); setGroupMembers([]); setScreen('lobby');
      }},
    ]);
  };

  const shareCode = async () => {
    try { await Share.share({ message: `Join my WariSathi group! Code: ${groupCode}\nDownload WariSathi app to join.` }); }
    catch (e) { console.warn('[GroupTab] Share error:', e); }
  };

  const copyCode = async () => {
    if (groupCode) { await Clipboard.setStringAsync(groupCode); Alert.alert('Copied!', `Code ${groupCode} copied.`); }
  };

  // ── Derived map data ──────────────────────────────────────────────────────────
  const membersGeoJSON = useMemo(() => {
    // Include ALL other members, even those without GPS yet
    const others = groupMembers.filter(m => m.userId !== userId);
    // Only render on map those who have a real GPS fix
    const withGps = others.filter(m => m.lat !== 0 || m.lng !== 0);
    return {
      type: 'FeatureCollection' as const,
      features: withGps.map((m) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
        properties: {
          name: m.name && m.name.length > 0 ? m.name : 'Warkari',
          color: '#3498DB',
          status: getMemberStatus(m.timestamp, m.isOnline)
        },
      })),
    };
  }, [groupMembers, userId]);

  const myGeoJSON = useMemo(() => {
    if (myLat == null || myLng == null) return { type: 'FeatureCollection' as const, features: [] };
    return {
      type: 'FeatureCollection' as const,
      features: [{ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [myLng, myLat] } }],
    };
  }, [myLat, myLng]);

  const missingMembers = groupMembers.filter(m => m.userId !== userId && getMemberStatus(m.timestamp, m.isOnline) === 'missing');
  const modeColor = mode === 'ONLINE' ? Colors.success : mode === 'BLUETOOTH' ? Colors.warning : Colors.danger;
  const modeLabel = mode === 'ONLINE' ? '🟢 Online Mode' : mode === 'BLUETOOTH' ? '🟠 Bluetooth Mode' : '🔴 No Connection';

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────────
  if (screen === 'lobby') {
    return (
      <View style={[styles.lobby, { paddingTop: insets.top + 32 }]}>
        <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 16 }}>👥</Text>
        <Text style={[Typography.headingLarge, { color: Colors.surface, textAlign: 'center', marginBottom: 8 }]}>
          Group Tracker
        </Text>
        <Text style={[Typography.bodyMedium, { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 48, paddingHorizontal: 24 }]}>
          Stay connected with your Dindi. Track each other in real time during the Wari.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={createGroup} disabled={actionLoading}>
          {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create Group</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton} onPress={() => setScreen('join_input')}>
          <Text style={styles.outlineButtonText}>Join Group</Text>
        </TouchableOpacity>
        <Text style={[Typography.bodySmall, { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40 }]}>
          Device ID: {userId.slice(-8)}
        </Text>
      </View>
    );
  }

  // ── Join Input ────────────────────────────────────────────────────────────────
  if (screen === 'join_input') {
    return (
      <View style={[styles.lobby, { paddingTop: insets.top + 24, alignItems: 'stretch' }]}>
        <TouchableOpacity onPress={() => setScreen('lobby')} style={{ marginBottom: 24, alignSelf: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
            <Text style={{ color: Colors.textSecondary, fontSize: 16, marginLeft: 4 }}>Back</Text>
          </View>
        </TouchableOpacity>
        <Ionicons name="key" size={48} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={[Typography.headingLarge, { color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 }]}>
          Enter Group Code
        </Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, textAlign: 'center', marginBottom: 28 }]}>
          Ask your group leader for the 6-letter code
        </Text>
        <TextInput
          style={styles.codeInput}
          value={joinInput}
          onChangeText={t => setJoinInput(t.toUpperCase())}
          placeholder="e.g. WARI99"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="characters"
          maxLength={8}
        />
        <TouchableOpacity style={[styles.primaryButton, { marginTop: 24 }]} onPress={joinGroup} disabled={actionLoading}>
          {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Join Group</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Create Confirm ────────────────────────────────────────────────────────────
  if (screen === 'create_confirm') {
    return (
      <View style={[styles.lobby, { paddingTop: insets.top + 40 }]}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.success} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={[Typography.headingLarge, { color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 }]}>
          Group Created!
        </Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 }]}>
          Share this code with your Dindi members:
        </Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{groupCode}</Text>
          <TouchableOpacity onPress={copyCode} style={{ padding: 4 }}>
            <Ionicons name="copy-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 24, marginBottom: 36 }}>
          <TouchableOpacity style={styles.iconBtn} onPress={copyCode}>
            <Ionicons name="copy" size={24} color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 13, marginTop: 6 }}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={shareCode}>
            <Ionicons name="share-social" size={24} color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 13, marginTop: 6 }}>Share</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.primaryButton, { width: '100%' }]} onPress={() => setScreen('group_map')}>
          <Text style={styles.primaryButtonText}>Open Group Map →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Group Map ─────────────────────────────────────────────────────────────────
  if (!MapLibreGL) {
    return (
      <View style={styles.center}>
        <Text style={Typography.headingMedium}>Map Unavailable</Text>
        <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
          Group map requires the native dev build APK.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={[styles.statusBar, { paddingTop: insets.top + 4 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.modeDot, { backgroundColor: modeColor }]} />
          <Text style={styles.statusText}>{modeLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[styles.statusText, { color: Colors.textSecondary, fontSize: 12 }]}>Code: {groupCode}</Text>
          <TouchableOpacity style={{ padding: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4 }} onPress={() => setShowDebug(!showDebug)}>
            <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>DBUG</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.leaveBtn} onPress={leaveGroup}>
            <Text style={{ color: Colors.danger, fontSize: 12, fontWeight: '700' }}>Leave</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Missing member alerts */}
      {missingMembers.map(m => (
        <View key={m.userId} style={styles.alertBanner}>
          <Text style={styles.alertText}>⚠️ {m.name} was last seen {formatLastSeen(m.timestamp)}</Text>
        </View>
      ))}

      {/* Map */}
      <MapLibreGL.Map style={styles.map} mapStyle={MAP_STYLE} logo={false} attribution={false}>
        <MapLibreGL.Camera ref={cameraRef} initialViewState={{ center: DEFAULT_CENTER, zoom: 9 }} />
        
        {/* Custom User Location (replaces native UserLocation to prevent crash) */}
        <MapLibreGL.GeoJSONSource id="user" data={myGeoJSON}>
          <MapLibreGL.Layer type="circle" id="userCircle"
            style={{ circleRadius: 10, circleColor: Colors.primary, circleStrokeWidth: 3, circleStrokeColor: '#FFFFFF' }} />
          <MapLibreGL.Layer type="circle" id="userPulse"
            style={{ circleRadius: 20, circleColor: Colors.primary, circleOpacity: 0.25 }} />
          <MapLibreGL.Layer type="symbol" id="user_label"
            style={{ textField: 'You', textSize: 12, textColor: Colors.primary,
              textHaloColor: '#FFFFFF', textHaloWidth: 1.5, textOffset: [0, 2.0], textAnchor: 'top' }} />
        </MapLibreGL.GeoJSONSource>

        {membersGeoJSON.features.length > 0 && (
          <MapLibreGL.GeoJSONSource
            id="group_members"
            data={membersGeoJSON}
            onPress={(e: any) => {
              try {
                const coords = e?.features?.[0]?.geometry?.coordinates;
                if (coords && cameraRef.current) cameraRef.current.flyTo({ center: coords, zoom: 14, duration: 700 });
              } catch {}
            }}
          >
            <MapLibreGL.Layer type="circle" id="member_glow"
              style={{ circleRadius: 22, circleColor: ['get', 'color'], circleOpacity: 0.2 }} />
            <MapLibreGL.Layer type="circle" id="member_dot"
              style={{ circleRadius: 11, circleColor: ['get', 'color'], circleStrokeWidth: 2.5, circleStrokeColor: '#FFFFFF' }} />
            <MapLibreGL.Layer type="symbol" id="member_label"
              style={{ textField: ['get', 'name'], textSize: 12, textColor: Colors.textPrimary,
                textHaloColor: '#FFFFFF', textHaloWidth: 1.5, textOffset: [0, 2.0], textAnchor: 'top' }} />
          </MapLibreGL.GeoJSONSource>
        )}
      </MapLibreGL.Map>

      {/* Debug Panel */}
      {showDebug && (
        <ScrollView
          style={{
            position: 'absolute',
            bottom: 100,
            left: 0,
            right: 0,
            height: 150,
            backgroundColor: 'rgba(0,0,0,0.85)',
            padding: 8,
            zIndex: 999
          }}
        >
          {debugLogs.map((log, i) => (
            <Text key={i} style={{ color: '#00FF00', fontSize: 10, fontFamily: 'monospace' }}>
              {log}
            </Text>
          ))}
        </ScrollView>
      )}

      {/* Floating Action Button for ChatBot */}
      <TouchableOpacity 
        style={styles.chatFab}
        onPress={() => bottomSheetRef.current?.expand()}
      >
        <Ionicons name="sparkles" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Bottom member strip */}
      <View style={styles.memberStrip}>
        {groupMembers.filter(m => m.userId !== userId).length === 0 ? (
          <View style={{ paddingHorizontal: 20, justifyContent: 'center', flex: 1 }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>
              No members yet. Share code{' '}
              <Text style={{ color: Colors.primary, fontWeight: '700' }}>{groupCode}</Text>
              {' '}to invite your Dindi.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center' }}>
            {groupMembers.filter(m => m.userId !== userId).map((m, i) => {
              const status = getMemberStatus(m.timestamp, m.isOnline);
              const color  = MEMBER_COLORS[i % MEMBER_COLORS.length];
              return (
                <TouchableOpacity key={m.userId} style={styles.memberCard}
                  onPress={() => {
                    if (m.lat !== 0 && m.lng !== 0 && cameraRef.current)
                      cameraRef.current.flyTo({ center: [m.lng, m.lat], zoom: 14, duration: 700 });
                  }}>
                  <View style={[styles.memberDot, { backgroundColor: color, borderColor: getStatusColor(status) }]} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>
                    <Text style={[styles.memberTime, { color: getStatusColor(status) }]}>{formatLastSeen(m.timestamp)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
      
      <ChatBotBottomSheet bottomSheetRef={bottomSheetRef} />
    </View>
  );
};

// ─── Exported wrapper ─────────────────────────────────────────────────────────
export const GroupTab = () => {
  if (!MapLibreGL) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>🗺️</Text>
        <Text style={[Typography.headingLarge, { color: Colors.textPrimary, textAlign: 'center', marginBottom: 8, marginTop: 16 }]}>
          Map Not Available
        </Text>
        <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, textAlign: 'center' }]}>
          Group Map requires the native dev build APK installed on your device.
        </Text>
      </View>
    );
  }
  return (
    <GroupErrorBoundary>
      <GroupTabInner />
    </GroupErrorBoundary>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  center:     { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 },

  lobby: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', paddingHorizontal: 28 },

  primaryButton: {
    backgroundColor: Colors.primary,
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryButtonText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  outlineButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginBottom: 14,
  },
  outlineButtonText: { color: Colors.primary, fontSize: 18, fontFamily: 'Poppins_700Bold' },

  codeBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  codeText: {
    fontSize: 38,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
    letterSpacing: 10,
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: '#fff',
    color: Colors.textPrimary,
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    letterSpacing: 8,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    width: '100%',
  },
  iconBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    minWidth: 90,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  map:        { flex: 1 },
  statusBar: {
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statusText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 13 },
  modeDot:    { width: 10, height: 10, borderRadius: 5 },
  leaveBtn:   { backgroundColor: 'rgba(231,76,60,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  alertBanner: { backgroundColor: Colors.danger, paddingVertical: 10, paddingHorizontal: 16 },
  alertText:   { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },

  memberStrip: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    minHeight: 76,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    minWidth: 150,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberDot:  { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
  memberName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 13, marginBottom: 2 },
  memberTime: { fontSize: 11, fontWeight: '600' },
  chatFab: {
    position: 'absolute',
    right: 20,
    bottom: 190,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 100,
    zIndex: 100,
  }
});
