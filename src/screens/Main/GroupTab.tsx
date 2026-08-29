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
  Share,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import MapLibreGL from '../../lib/maplibre';
import { FIREBASE_DB_URL } from '../../config/firebaseConfig';

// ─── Safe Firebase import (@react-native-firebase namespace API) ─────────────────
let db: any = null; // firebase.database() instance

try {
  require('@react-native-firebase/app'); // ensure app is initialized
  // @react-native-firebase/database v26 exports the function directly (no .default)
  const databaseModule = require('@react-native-firebase/database');
  // Try both module formats: CJS default export and named export
  const databaseFn = databaseModule.default ?? databaseModule;
  // Call it — passing the DB URL ensures the right project is used
  db = typeof databaseFn === 'function'
    ? databaseFn(undefined, FIREBASE_DB_URL)
    : databaseFn; // fallback: module itself might already be the db instance
  console.log('[GroupTab] Firebase DB initialized:', !!db);
} catch (e) {
  console.warn('[GroupTab] Firebase failed to load:', e);
}

// ─ Helpers that mirror the Firebase namespace API surface ────────────────
// Instead of spreading 12 bound functions we call through db.ref() directly.
// This avoids the "getDatabase is not a function" crash.
const getRef = (path: string) => db?.ref(path) ?? null;

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
  const [groupMembers, setGroupMembers]   = useState<GroupMember[]>([]);
  const [mode, setMode]                   = useState<ConnectionMode>('ONLINE');
  const [esp32Device, setEsp32Device]     = useState<any>(null);

  const cameraRef         = useRef<any>(null);
  const memberListenerRef = useRef<any>(null);
  const locationIntRef    = useRef<any>(null);
  const bleCleanupRef     = useRef<(() => void) | null>(null);
  const memberDbRef       = useRef<any>(null);
  const netInfoUnsub      = useRef<any>(null);
  const locationWatchSub  = useRef<any>(null);

  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);

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

        const uname = await AsyncStorage.getItem('userName') ?? `Warkari_${uid.slice(-4)}`;
        setUserName(uname);

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
    if (!db) return;
    try {
      const mRef = getRef(`groups/${gid}/members/${uid}`);
      memberDbRef.current = mRef;
      await mRef.set({ name: uname, isOnline: true, lat: 0, lng: 0, timestamp: Date.now() });
      const disc = mRef.onDisconnect();
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

    // Send latest known location to Firebase every 30s
    if (!db) return;
    locationIntRef.current = setInterval(async () => {
      try {
        // We fetch a fresh high-accuracy position to send to the server
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await getRef(`groups/${gid}/members/${uid}`).update({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: Date.now(),
          isOnline: true,
        });
      } catch (e) {
        console.warn('[GroupTab] GPS send error:', e);
      }
    }, 30000);
  };

  // ── Firebase member listener ───────────────────────────────────────────────────
  const startMemberListener = (gid: string, uid: string) => {
    if (!db) return;
    const ref = getRef(`groups/${gid}/members`);
    memberListenerRef.current = ref;
    ref.on('value', (snap: any) => {
      try {
        const data = snap.val() ?? {};
        const members: GroupMember[] = Object.entries(data).map(([id, m]: any) => ({
          userId: id, name: m.name ?? 'Warkari',
          isOnline: m.isOnline ?? false,
          lat: m.lat ?? 0, lng: m.lng ?? 0, timestamp: m.timestamp ?? 0,
        }));
        setGroupMembers(members);
        const anyOffline = members.some(m => m.userId !== uid && m.isOnline === false);
        if (anyOffline) { setMode('BLUETOOTH'); scanForESP32(gid, uid); }
      } catch (e) {
        console.warn('[GroupTab] Member listener error:', e);
      }
    });
  };

  // ── NetInfo listener ──────────────────────────────────────────────────────────
  const startNetInfoListener = (gid: string, uid: string) => {
    if (!NetInfo) return () => {};
    return NetInfo.addEventListener(async (state: any) => {
      if (!state.isConnected) {
        setMode('BLUETOOTH');
        scanForESP32(gid, uid);
      } else {
        if (esp32Device) { try { await esp32Device.cancelConnection(); } catch {} setEsp32Device(null); }
        setMode('ONLINE');
        if (db) {
          try { await getRef(`groups/${gid}/members/${uid}`).update({ isOnline: true }); } catch {}
        }
      }
    });
  };

  // ── BLE scan & connect ────────────────────────────────────────────────────────
  const scanForESP32 = useCallback((gid: string, uid: string) => {
    if (!BleManager) return;
    try {
      BleManager.startDeviceScan(null, null, async (err: any, device: any) => {
        if (err) { console.warn('[BLE] Scan error:', err); return; }
        if (device?.name === ESP32_NAME) {
          BleManager.stopDeviceScan();
          try {
            const conn = await device.connect();
            await conn.discoverAllServicesAndCharacteristics();
            setEsp32Device(conn);
            setMode('BLUETOOTH');
            bleCleanupRef.current = startBluetoothSync(conn, gid, uid);
          } catch (e) { console.warn('[BLE] Connect error:', e); }
        }
      });
    } catch (e) { console.warn('[BLE] Scan start error:', e); }
  }, [userName]);

  const startBluetoothSync = (device: any, gid: string, uid: string): (() => void) => {
    const sendInt = setInterval(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        const payload = JSON.stringify({ userId: uid, name: userName, groupId: gid,
          lat: loc.coords.latitude, lng: loc.coords.longitude, timestamp: Date.now() });
        await device.writeCharacteristicWithResponseForService(
          BLE_SERVICE_UUID, BLE_CHAR_WRITE, Buffer.from(payload).toString('base64'));
      } catch (e) { console.warn('[BLE] Send error:', e); }
    }, 30000);

    const readInt = setInterval(async () => {
      try {
        const char = await device.readCharacteristicForService(BLE_SERVICE_UUID, BLE_CHAR_READ);
        const data = JSON.parse(Buffer.from(char.value, 'base64').toString('utf8'));
        if (Array.isArray(data.members)) setGroupMembers(data.members);
      } catch (e) { console.warn('[BLE] Read error:', e); }
    }, 5000);

    return () => { clearInterval(sendInt); clearInterval(readInt); };
  };

  // ── Cleanup all ───────────────────────────────────────────────────────────────
  const cleanupAll = useCallback(() => {
    if (locationWatchSub.current)  { locationWatchSub.current.remove(); locationWatchSub.current = null; }
    if (locationIntRef.current)    { clearInterval(locationIntRef.current); locationIntRef.current = null; }
    if (memberListenerRef.current) { try { memberListenerRef.current.off(); } catch {} memberListenerRef.current = null; }
    if (bleCleanupRef.current)     { bleCleanupRef.current(); bleCleanupRef.current = null; }
    if (esp32Device)               { try { esp32Device.cancelConnection(); } catch {} }
    if (netInfoUnsub.current)      { try { netInfoUnsub.current(); } catch {} netInfoUnsub.current = null; }
    if (memberDbRef.current)       { try { memberDbRef.current.update({ isOnline: false }); } catch {} }
  }, [esp32Device]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const createGroup = async () => {
    if (!db) {
      Alert.alert('Firebase Unavailable', 'Use the native dev build APK to use group features.');
      return;
    }
    setActionLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRef = getRef('groups').push();
      const gid = newRef.key;
      if (!gid) throw new Error('Could not generate group ID');
      await newRef.set({ info: { groupCode: code, createdAt: Date.now(), createdBy: userId }, members: {} });
      await AsyncStorage.setItem('groupId', gid);
      await AsyncStorage.setItem('groupCode', code);
      setGroupId(gid);
      setGroupCode(code);
      Alert.alert(
        '✅ Group Created!',
        `Your group code is:\n\n${code}\n\nShare this code with your Dindi members so they can join.`,
        [{ text: 'Go to Map →', onPress: () => setScreen('group_map') }]
      );
    } catch (e: any) {
      Alert.alert('Error', `Could not create group: ${e?.message ?? e}`);
    } finally {
      setActionLoading(false);
    }
  };

  const joinGroup = async () => {
    if (!db) {
      Alert.alert('Error', 'Firebase unavailable. Use the native dev build APK.');
      return;
    }
    const code = joinInput.trim().toUpperCase();
    if (!code) { Alert.alert('Error', 'Please enter a group code.'); return; }
    setActionLoading(true);
    try {
      const q = getRef('groups').orderByChild('info/groupCode').equalTo(code);
      const snap = await q.once('value');
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
        if (db) {
          try { await getRef(`groups/${groupId}/members/${userId}`).remove(); } catch {}
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

  const copyCode = () => {
    if (groupCode) { Clipboard.setString(groupCode); Alert.alert('Copied!', `Code ${groupCode} copied.`); }
  };

  // ── Derived map data ──────────────────────────────────────────────────────────
  const membersGeoJSON = useMemo(() => {
    const others = groupMembers.filter(m => m.userId !== userId && m.lat !== 0 && m.lng !== 0);
    return {
      type: 'FeatureCollection' as const,
      features: others.map((m, i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
        properties: { name: m.name, color: MEMBER_COLORS[i % MEMBER_COLORS.length], status: getMemberStatus(m.timestamp, m.isOnline) },
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
        <TouchableOpacity onPress={() => setScreen('lobby')} style={{ marginBottom: 24 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>🔑</Text>
        <Text style={[Typography.headingLarge, { color: Colors.surface, textAlign: 'center', marginBottom: 8 }]}>
          Enter Group Code
        </Text>
        <Text style={[Typography.bodyMedium, { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 28 }]}>
          Ask your group leader for the 6-letter code
        </Text>
        <TextInput
          style={styles.codeInput}
          value={joinInput}
          onChangeText={t => setJoinInput(t.toUpperCase())}
          placeholder="e.g. WARI99"
          placeholderTextColor="rgba(255,255,255,0.3)"
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
        <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 16 }}>✅</Text>
        <Text style={[Typography.headingLarge, { color: Colors.surface, textAlign: 'center', marginBottom: 8 }]}>
          Group Created!
        </Text>
        <Text style={[Typography.bodyMedium, { color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 32 }]}>
          Share this code with your Dindi members:
        </Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{groupCode}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 24, marginBottom: 36 }}>
          <TouchableOpacity style={styles.iconBtn} onPress={copyCode}>
            <Text style={{ fontSize: 24 }}>📋</Text>
            <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 13, marginTop: 6 }}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={shareCode}>
            <Text style={{ fontSize: 24 }}>📤</Text>
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

  lobby: { flex: 1, backgroundColor: Colors.navy, alignItems: 'center', paddingHorizontal: 28 },

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
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
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
  outlineButtonText: { color: Colors.primary, fontSize: 18, fontWeight: '700' },

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
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 10,
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
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
    backgroundColor: Colors.surface,
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
});
