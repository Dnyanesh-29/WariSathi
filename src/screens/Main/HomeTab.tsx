import { Text } from '../../components/CustomText';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Animated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { useLang } from '../../context/LangContext';
import {
  triggerSOS,
  loadSOSHistory,
  startQueueFlusher,
  stopQueueFlusher,
} from '../../services/sosService';
import type { SOSHistoryEntry } from '../../services/sosService';

const T = {
  en: {
    appName: 'WariSathi',
    langBtn: 'मराठी',
    heroTitle: 'Ashadhi Palkhi Wari',
    heroSub: 'Safety Companion • वारी साथी',
    dindi: '🚩 Dindi No. 24 (Pune-Saswad)',
    sosSub: 'EMERGENCY ALERT',
    sosInstruction: 'Tap once for immediate medical or police assistance',
    offlineTitle: 'Offline Protection Active',
    offlineDesc: 'Maps, medical cards, and SOS alarms function fully without network.',
    idCard: 'Pilgrim ID Card',
    idDesc: 'QR Badge & Medical Details',
    map: 'Offline Map',
    mapDesc: 'Find facilities and route without internet.',
    sosConfirmTitle: '🚨 Send SOS Alert?',
    sosConfirmMsg: 'This will alert your emergency contact and nearby medical camps.',
    sosConfirmBtn: 'CONFIRM EMERGENCY',
    sosCancelBtn: 'Cancel',
    sosActiveTitle: 'SOS EMERGENCY',
    sosActiveStatus: 'ALERT QUEUED — SENDING WHEN ONLINE',
    sosActiveDesc: 'Sound alarm active. Your Dindi leader and nearby medical camp have been notified.',
    cancelAlarm: 'CANCEL ALARM',
  },
  mr: {
    appName: 'वारीसाथी',
    langBtn: 'English',
    heroTitle: 'आषाढी पालखी वारी',
    heroSub: 'सुरक्षितता साथी • Safety Companion',
    dindi: '🚩 दिंडी क्र. २४ (पुणे-सासवड)',
    sosSub: 'आणीबाणी सतर्कता',
    sosInstruction: 'त्वरित वैद्यकीय किंवा पोलिस मदतीसाठी एकदा दाबा',
    offlineTitle: 'ऑफलाइन संरक्षण सक्रिय',
    offlineDesc: 'नकाशे, वैद्यकीय कार्डे आणि SOS अलार्म नेटवर्कशिवाय कार्य करतात.',
    idCard: 'वारकरी ओळखपत्र',
    idDesc: 'QR बॅज आणि वैद्यकीय तपशील',
    map: 'ऑफलाइन नकाशा',
    mapDesc: 'इंटरनेटशिवाय सुविधा आणि मार्ग शोधा.',
    sosConfirmTitle: '🚨 SOS सतर्कता पाठवायची?',
    sosConfirmMsg: 'हे तुमच्या आणीबाणी संपर्क आणि जवळच्या वैद्यकीय शिबिरांना सतर्क करेल.',
    sosConfirmBtn: 'आणीबाणी निश्चित करा',
    sosCancelBtn: 'रद्द करा',
    sosActiveTitle: 'SOS आणीबाणी',
    sosActiveStatus: 'सतर्कता रांगेत — ऑनलाइन झाल्यावर पाठवत आहे',
    sosActiveDesc: 'ध्वनी अलार्म सक्रिय. तुमच्या दिंडी प्रमुख आणि जवळच्या वैद्यकीय शिबिराला सूचित केले आहे.',
    cancelAlarm: 'अलार्म रद्द करा',
  },
};

export const HomeTab = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { lang, toggle } = useLang();
  const t = T[lang];

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [sosHistory, setSosHistory] = useState<SOSHistoryEntry[]>([]);

  // ── Animated alarm pulse on SOS button ───────────────────────────────────
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Ripple rings for SOS overlay ─────────────────────────────────────────
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef<Animated.CompositeAnimation | null>(null);

  const startRipples = () => {
    ring1.setValue(0); ring2.setValue(0); ring3.setValue(0);
    ringAnim.current = Animated.loop(
      Animated.stagger(600, [
        Animated.timing(ring1, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(ring3, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    ringAnim.current.start();
  };
  const stopRipples = () => { ringAnim.current?.stop(); };

  const makeRingStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
  });

  // ── Reanimated red screen flash (3 times) ────────────────────────────────
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const triggerFlash = () => {
    flashOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 120 }),
        withTiming(0, { duration: 200 }),
      ),
      3,
      false,
    );
  };

  // ── expo-av alarm sound ───────────────────────────────────────────────────
  const playAlarm = async () => {
    // Disabled due to expo-av native conflict
  };

  const stopAlarm = async () => {
    // Disabled
  };

  // ── Banner helper ─────────────────────────────────────────────────────────
  const showBanner = (type: 'success' | 'warning' | 'info', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 5000);
  };

  // ── Queue flusher → delivered notification ───────────────────────────────
  const handleDelivered = useCallback((count: number) => {
    showBanner('success', `✅ ${count} queued SOS alert${count > 1 ? 's' : ''} delivered!`);
    // Refresh history
    loadSOSHistory().then(setSosHistory);
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadSOSHistory().then(setSosHistory);
    startQueueFlusher(handleDelivered);
    return () => {
      stopQueueFlusher();
      stopAlarm();
    };
  }, [handleDelivered]);

  // ── Confirm SOS → trigger real logic ─────────────────────────────────────
  const confirmSOS = async () => {
    setShowConfirm(false);
    setLoading(true);

    // Always: flash screen + play alarm
    triggerFlash();
    await playAlarm();
    setSosActive(true);
    startRipples();

    try {
      const result = await triggerSOS();

      // Refresh history immediately
      const history = await loadSOSHistory();
      setSosHistory(history);

      if (result.status === 'sent') {
        showBanner('success', '✅ SOS Sent — Emergency contact notified!');
      } else {
        showBanner('warning', '📵 SOS Queued — will send when connected');
      }
    } catch (e) {
      showBanner('info', '⚠️ SOS saved locally — will retry when online');
      console.warn('[SOS] triggerSOS error:', e);
    } finally {
      setLoading(false);
    }
  };

  const cancelSOS = async () => {
    setSosActive(false);
    stopRipples();
    await stopAlarm();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const statusColor = (status: SOSHistoryEntry['status']) => {
    if (status === 'Sent' || status === 'Delivered') return '#27AE60';
    return '#E67E22';
  };

  const statusIcon = (status: SOSHistoryEntry['status']) => {
    if (status === 'Sent') return '✅';
    if (status === 'Delivered') return '✅';
    return '📵';
  };

  const bannerBg = {
    success: '#27AE60',
    warning: '#E67E22',
    info: '#2980B9',
  };

  return (
    <>
      {/* ── Red flash overlay (Reanimated) ── */}
      <Reanimated.View
        style={[styles.flashOverlay, flashStyle]}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}><Text style={{ fontSize: 18 }}>⚑</Text></View>
            <Text style={styles.appTitle}>{t.appName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.langBadge} onPress={toggle}>
              <Text style={styles.langText}>{t.langBtn}</Text>
            </TouchableOpacity>
            <View style={styles.onlineDot} />
          </View>
        </View>

        {/* ── Status Banner ── */}
        {banner && (
          <View style={[styles.banner, { backgroundColor: bannerBg[banner.type] }]}>
            <Text style={styles.bannerText}>{banner.message}</Text>
          </View>
        )}

        {/* ── Hero Banner ── */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>{t.heroTitle}</Text>
          <Text style={styles.bannerSub}>{t.heroSub}</Text>
          <View style={styles.dindiBadge}><Text style={styles.dindiText}>{t.dindi}</Text></View>
        </View>

        {/* ── SOS Button ── */}
        <View style={styles.sosSection}>
          <TouchableOpacity
            onPress={() => setShowConfirm(true)}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Animated.View style={[styles.sosOuter, { transform: [{ scale: pulse }] }]} />
            <View style={styles.sosButton}>
              <Text style={styles.sosText}>SOS</Text>
              <Text style={styles.sosSub}>{t.sosSub}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.sosInstruction}>{t.sosInstruction}</Text>
          {loading && (
            <View style={styles.loadingPill}>
              <Text style={styles.loadingText}>⏳ Getting location & sending…</Text>
            </View>
          )}
        </View>

        {/* ── Quick Action Cards ── */}
        <View style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: '#E8F8EF' }]}>
            <Text style={{ fontSize: 22 }}>🛡️</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t.offlineTitle}</Text>
            <Text style={styles.cardDesc}>{t.offlineDesc}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ID Card')}>
          <View style={[styles.cardIcon, { backgroundColor: '#EEF2FF' }]}>
            <Text style={{ fontSize: 22 }}>🪪</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t.idCard}</Text>
            <Text style={styles.cardDesc}>{t.idDesc}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Map')}>
          <View style={[styles.cardIcon, { backgroundColor: '#FFF3E0' }]}>
            <Text style={{ fontSize: 22 }}>🗺️</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t.map}</Text>
            <Text style={styles.cardDesc}>{t.mapDesc}</Text>
          </View>
        </TouchableOpacity>

        {/* ── SOS History ── */}
        {sosHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>🕑 SOS History</Text>
            {sosHistory.map(entry => (
              <View key={entry.id} style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: statusColor(entry.status) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTime}>{formatTime(entry.timestamp)}</Text>
                  <Text style={styles.historyName}>{entry.name}</Text>
                </View>
                <View style={[styles.historyBadge, { backgroundColor: statusColor(entry.status) + '22' }]}>
                  <Text style={[styles.historyStatus, { color: statusColor(entry.status) }]}>
                    {statusIcon(entry.status)} {entry.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── SOS Confirm Modal ── */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>{t.sosConfirmTitle}</Text>
            <Text style={styles.confirmMsg}>{t.sosConfirmMsg}</Text>
            <View style={styles.confirmDetails}>
              <Text style={styles.confirmDetail}>📡 Gets your GPS location</Text>
              <Text style={styles.confirmDetail}>🔥 Writes to Firebase (if online)</Text>
              <Text style={styles.confirmDetail}>💬 Sends SMS to emergency contact</Text>
              <Text style={styles.confirmDetail}>📵 Queues locally if offline</Text>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmSOS}>
              <Text style={styles.confirmBtnText}>{t.sosConfirmBtn}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirm(false)}>
              <Text style={styles.cancelBtnText}>{t.sosCancelBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── SOS Active Fullscreen Overlay ── */}
      <Modal visible={sosActive} transparent animationType="fade">
        <View style={styles.sosOverlay}>
          <Animated.View style={[styles.rippleRing, makeRingStyle(ring1)]} />
          <Animated.View style={[styles.rippleRing, makeRingStyle(ring2)]} />
          <Animated.View style={[styles.rippleRing, makeRingStyle(ring3)]} />

          <Text style={styles.sosOverlayIcon}>🚨</Text>
          <Text style={styles.sosOverlayTitle}>{t.sosActiveTitle}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{t.sosActiveStatus}</Text>
          </View>
          <Text style={styles.sosOverlayDesc}>{t.sosActiveDesc}</Text>

          {/* Latest history entry status */}
          {sosHistory[0] && (
            <View style={styles.liveStatusPill}>
              <Text style={styles.liveStatusText}>
                {statusIcon(sosHistory[0].status)} {sosHistory[0].status === 'Sent' ? 'Alert Sent to Firebase & SMS' : 'Queued — Waiting for connectivity'}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.cancelAlarmBtn} onPress={cancelSOS}>
            <Text style={styles.cancelAlarmText}>{t.cancelAlarm}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  // Flash overlay (Reanimated, full screen)
  flashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E74C3C',
    zIndex: 9999,
    pointerEvents: 'none',
  } as any,

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 38, height: 38, backgroundColor: '#FFE5D9', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  appTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  langBadge: { borderWidth: 1.5, borderColor: '#E8640A', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  langText: { color: '#E8640A', fontWeight: 'bold', fontSize: 13 },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#2ECC71' },

  // Status banner
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 12,
  },
  bannerText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },

  // Hero card
  bannerCard: { backgroundColor: '#D35400', borderRadius: 16, margin: 16, padding: 20 },
  bannerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  bannerSub: { color: '#FFDAB9', fontSize: 13, marginTop: 4 },
  dindiBadge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 14 },
  dindiText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  // SOS Button
  sosSection: { alignItems: 'center', marginVertical: 16 },
  sosOuter: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(231,76,60,0.25)', alignSelf: 'center', top: 0 },
  sosButton: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#E74C3C', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#E74C3C', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  sosText: { color: '#FFF', fontSize: 46, fontWeight: 'bold' },
  sosSub: { color: '#FFF', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  sosInstruction: { textAlign: 'center', color: '#555', marginTop: 14, paddingHorizontal: 40, fontSize: 13, lineHeight: 20 },
  loadingPill: { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 10 },
  loadingText: { color: '#555', fontSize: 13, fontWeight: '600' },

  // Action cards
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EEE' },
  cardIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50' },
  cardDesc: { fontSize: 12, color: '#7F8C8D', marginTop: 3 },

  // SOS History
  historySection: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden' },
  historyTitle: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50', padding: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  historyRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  historyTime: { fontSize: 11, color: '#999' },
  historyName: { fontSize: 13, fontWeight: '600', color: '#2C3E50', marginTop: 2 },
  historyBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  historyStatus: { fontSize: 11, fontWeight: 'bold' },

  // Confirm modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: '100%' },
  confirmTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', textAlign: 'center', marginBottom: 10 },
  confirmMsg: { fontSize: 14, color: '#7F8C8D', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  confirmDetails: { backgroundColor: '#FFF9F0', borderRadius: 10, padding: 12, marginBottom: 16 },
  confirmDetail: { fontSize: 13, color: '#555', marginBottom: 4 },
  confirmBtn: { backgroundColor: '#E74C3C', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.5 },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#7F8C8D', fontSize: 14 },

  // SOS fullscreen overlay
  sosOverlay: { flex: 1, backgroundColor: '#C0392B', justifyContent: 'center', alignItems: 'center', padding: 30 },
  rippleRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  sosOverlayIcon: { fontSize: 72, marginBottom: 10 },
  sosOverlayTitle: { fontSize: 34, fontWeight: 'bold', color: '#FFF', letterSpacing: 2 },
  statusPill: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginVertical: 16 },
  statusPillText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  sosOverlayDesc: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22, fontSize: 14, marginBottom: 16 },
  liveStatusPill: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 24 },
  liveStatusText: { color: '#FFF', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  cancelAlarmBtn: { borderWidth: 2, borderColor: '#FFF', borderRadius: 30, paddingHorizontal: 40, paddingVertical: 14 },
  cancelAlarmText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});

