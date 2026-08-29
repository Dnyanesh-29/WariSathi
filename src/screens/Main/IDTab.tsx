import { Text } from '../../components/CustomText';
import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert,
  KeyboardAvoidingView, Platform, Modal, StatusBar, Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import { Colors } from '../../theme/colors';
import { Feather } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PilgrimProfile {
  name: string;
  dindi: string;
  bloodGroup: string;
  emergencyPhone: string;
  medicalCondition: string;
}

interface QRPayload {
  n: string; // name
  d: string; // dindi
  b: string; // bloodGroup
  e: string; // emergencyPhone
  m?: string; // medicalCondition (optional)
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const DEFAULT_PROFILE: PilgrimProfile = {
  name: '', dindi: '', bloodGroup: 'O+', emergencyPhone: '', medicalCondition: '',
};

const SCAN_WINDOW_SIZE = 240;

// Get initials from name
const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

// ---------------------------------------------------------------------------
// My Badge Sub-Tab
// ---------------------------------------------------------------------------
const MyBadgeTab = ({
  profile,
  onGoRegister,
}: {
  profile: PilgrimProfile | null;
  onGoRegister: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  if (!profile?.name) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <Feather name="credit-card" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No Badge Yet</Text>
        <Text style={styles.emptyDesc}>
          Register your pilgrim details to generate your personal QR ID badge.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onGoRegister}>
          <Feather name="edit-3" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Register Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const qrPayload: QRPayload = {
    n: profile.name,
    d: profile.dindi,
    b: profile.bloodGroup,
    e: profile.emergencyPhone,
    m: profile.medicalCondition || undefined,
  };
  const qrData = JSON.stringify(qrPayload);
  const initials = getInitials(profile.name);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* — Main Badge Card — */}
        <View style={styles.badgeCard}>
          {/* Gradient Header */}
          <View style={styles.badgeHeaderGradient}>
            <Text style={styles.badgeHeaderLabel}>ASHADHI WARI • PILGRIM ID</Text>
            <Text style={styles.badgeHeaderSub}>WariSathi Emergency Card</Text>
          </View>

          <View style={styles.badgeBody}>
            {/* Avatar + Name row */}
            <View style={styles.profileRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <View style={styles.dindiRow}>
                  <Feather name="flag" size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.dindiText}>{profile.dindi}</Text>
                </View>
              </View>
            </View>

            {/* Info grid */}
            <View style={styles.infoGrid}>
              <View style={[styles.infoCell, { borderRightWidth: 1, borderRightColor: Colors.border }]}>
                <Text style={styles.infoLabel}>BLOOD GROUP</Text>
                <Text style={[styles.infoValueLarge, { color: Colors.danger }]}>{profile.bloodGroup}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>EMERGENCY NO.</Text>
                <View style={styles.infoCellRow}>
                  <Feather name="phone" size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.infoValueSmall}>{profile.emergencyPhone || '—'}</Text>
                </View>
              </View>
            </View>

            {/* Medical alert */}
            {!!profile.medicalCondition && (
              <View style={styles.medicalAlert}>
                <Feather name="alert-triangle" size={15} color="#C0392B" style={{ marginRight: 8 }} />
                <Text style={styles.medicalAlertText}>
                  Medical: <Text style={{ fontWeight: 'bold' }}>{profile.medicalCondition}</Text>
                </Text>
              </View>
            )}

            {/* QR Code */}
            <View style={styles.qrContainer}>
              <View style={styles.qrFrame}>
                <QRCode value={qrData} size={150} color="#1A1A2E" backgroundColor="#FFF" />
              </View>
              <Text style={styles.qrLabel}>SCAN FOR OFFLINE MEDICAL INFO</Text>
              <Text style={styles.qrSub}>Works without internet • 100% offline</Text>
            </View>
          </View>

          {/* Footer stripe */}
          <View style={styles.badgeFooter}>
            <Feather name="shield" size={12} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
            <Text style={styles.badgeFooterText}>WariSathi App • Emergency Offline System</Text>
          </View>
        </View>

        {/* Print button */}
        <TouchableOpacity style={styles.printBtn}>
          <Feather name="printer" size={18} color="#FFF" style={{ marginRight: 10 }} />
          <Text style={styles.printBtnText}>Print / Save Badge for Neck Card</Text>
        </TouchableOpacity>
        <Text style={styles.helpNote}>
          Save or print this card. Place it in a plastic sleeve around the neck.
          Ideal for elderly pilgrims and children.
        </Text>
      </Animated.View>
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Register / Edit Sub-Tab
// ---------------------------------------------------------------------------
const RegisterTab = ({
  profile,
  onSave,
}: {
  profile: PilgrimProfile | null;
  onSave: (p: PilgrimProfile) => void;
}) => {
  const [form, setForm] = useState<PilgrimProfile>(profile?.name ? profile : DEFAULT_PROFILE);
  const [bloodModalVisible, setBloodModalVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim() || !form.dindi.trim() || !form.emergencyPhone.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Name, Dindi, and Emergency Phone.');
      return;
    }
    if (form.emergencyPhone.length !== 10 || !/^\d+$/.test(form.emergencyPhone)) {
      Alert.alert('Invalid Phone', 'Enter a valid 10-digit phone number.');
      return;
    }
    await AsyncStorage.setItem('userProfile', JSON.stringify(form));
    onSave(form);
    Alert.alert('Badge Generated!', 'Your QR badge has been saved. Go to "My Badge" to view it.');
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Personal Info</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Pilgrim Full Name *</Text>
            <View style={inputStyle('name')}>
              <Feather name="user" size={16} color={focusedField === 'name' ? Colors.primary : Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={form.name}
                onChangeText={v => setForm({ ...form, name: v })}
                placeholder="e.g. Tukaram Shinde"
                placeholderTextColor="#BBB"
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Dindi Name & Number *</Text>
            <View style={inputStyle('dindi')}>
              <Feather name="flag" size={16} color={focusedField === 'dindi' ? Colors.primary : Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={form.dindi}
                onChangeText={v => setForm({ ...form, dindi: v })}
                placeholder="e.g. Dindi No. 24 (Pune-Saswad)"
                placeholderTextColor="#BBB"
                onFocus={() => setFocusedField('dindi')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Medical Info</Text>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Blood Group *</Text>
              <TouchableOpacity style={[styles.input, styles.selectBtn]} onPress={() => setBloodModalVisible(true)}>
                <Feather name="droplet" size={16} color={Colors.danger} style={styles.inputIcon} />
                <Text style={[styles.inputText, { color: Colors.textPrimary }]}>{form.bloodGroup}</Text>
                <Feather name="chevron-down" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Emergency Phone *</Text>
              <View style={inputStyle('phone')}>
                <Feather name="phone" size={16} color={focusedField === 'phone' ? Colors.primary : Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputText}
                  value={form.emergencyPhone}
                  onChangeText={v => setForm({ ...form, emergencyPhone: v })}
                  placeholder="9822XXXXXX"
                  placeholderTextColor="#BBB"
                  keyboardType="phone-pad"
                  maxLength={10}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Medical Conditions (if any)</Text>
            <View style={inputStyle('medical')}>
              <Feather name="heart" size={16} color={focusedField === 'medical' ? Colors.primary : Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={form.medicalCondition}
                onChangeText={v => setForm({ ...form, medicalCondition: v })}
                placeholder="e.g. Diabetes, Asthma (optional)"
                placeholderTextColor="#BBB"
                onFocus={() => setFocusedField('medical')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
          <Feather name="check-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Generate & Save QR Badge</Text>
        </TouchableOpacity>
        <Text style={styles.formNote}>
          Your data is stored only on your device. Nothing is uploaded to any server.
        </Text>
      </ScrollView>

      {/* Blood Group Modal */}
      <Modal visible={bloodModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setBloodModalVisible(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Blood Group</Text>
            <View style={styles.bloodGrid}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bloodPill, form.bloodGroup === bg && styles.bloodPillActive]}
                  onPress={() => { setForm({ ...form, bloodGroup: bg }); setBloodModalVisible(false); }}
                >
                  <Text style={[styles.bloodPillText, form.bloodGroup === bg && { color: '#FFF' }]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ---------------------------------------------------------------------------
// Animated laser for scanner preview
// ---------------------------------------------------------------------------
const ScannerLaser = () => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 150] });
  return <Animated.View style={[styles.scannerLaser, { transform: [{ translateY }] }]} />;
};

// ---------------------------------------------------------------------------
// Scanned Pilgrim Info Bottom-Sheet Modal
// ---------------------------------------------------------------------------
const ScannedCard = ({
  pilgrim,
  onClose,
}: {
  pilgrim: PilgrimProfile | null;
  onClose: () => void;
}) => {
  const initials = pilgrim ? getInitials(pilgrim.name) : '';
  return (
    <Modal visible={!!pilgrim} transparent animationType="slide">
      <View style={styles.scannedOverlay}>
        <View style={styles.scannedCard}>
          <View style={styles.scannedHandle} />
          <View style={styles.scannedHeaderRow}>
            <View style={styles.avatarCircleSmall}>
              <Text style={styles.avatarInitialsSmall}>{initials}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.scannedName}>{pilgrim?.name}</Text>
              <View style={styles.dindiRow}>
                <Feather name="flag" size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.scannedDindi}>{pilgrim?.dindi}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.scannedCloseBtn} onPress={onClose}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.scannedGrid}>
            <View style={[styles.scannedGridItem, { borderRightWidth: 1, borderRightColor: Colors.border }]}>
              <Feather name="droplet" size={14} color={Colors.danger} style={{ marginBottom: 4 }} />
              <Text style={styles.scannedGridLabel}>BLOOD GROUP</Text>
              <Text style={[styles.scannedGridValue, { color: Colors.danger }]}>{pilgrim?.bloodGroup}</Text>
            </View>
            <View style={styles.scannedGridItem}>
              <Feather name="phone" size={14} color={Colors.primary} style={{ marginBottom: 4 }} />
              <Text style={styles.scannedGridLabel}>EMERGENCY</Text>
              <Text style={styles.scannedGridValue}>{pilgrim?.emergencyPhone || '—'}</Text>
            </View>
          </View>

          {!!pilgrim?.medicalCondition && (
            <View style={styles.medicalAlert}>
              <Feather name="alert-triangle" size={15} color="#C0392B" style={{ marginRight: 8 }} />
              <Text style={styles.medicalAlertText}>
                Medical: <Text style={{ fontWeight: 'bold' }}>{pilgrim.medicalCondition}</Text>
              </Text>
            </View>
          )}

          <View style={styles.offlineBadge}>
            <Feather name="wifi-off" size={12} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.offlineBadgeText}>Decoded entirely offline — no internet required</Text>
          </View>

          <TouchableOpacity style={styles.scannedDoneBtn} onPress={onClose}>
            <Text style={styles.scannedDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Scan Pilgrim Sub-Tab
// ---------------------------------------------------------------------------
const ScanTab = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scannedPilgrim, setScannedPilgrim] = useState<PilgrimProfile | null>(null);
  const processing = useRef(false);

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'WariSathi needs camera access to scan pilgrim QR ID badges.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    processing.current = false;
    setCameraOpen(true);
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (processing.current) return;
    processing.current = true;
    setCameraOpen(false);
    try {
      const payload: QRPayload = JSON.parse(data);
      if (!payload.n || !payload.d || !payload.b || !payload.e) throw new Error('Incomplete payload');
      setScannedPilgrim({
        name: payload.n,
        dindi: payload.d,
        bloodGroup: payload.b,
        emergencyPhone: payload.e,
        medicalCondition: payload.m || '',
      });
    } catch {
      Alert.alert(
        'Invalid QR Code',
        'This is not a valid WariSathi pilgrim badge.',
        [{ text: 'Try Again', onPress: () => { processing.current = false; } }]
      );
    }
  };

  const closeScannedCard = () => {
    setScannedPilgrim(null);
    processing.current = false;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Decorative scanner preview */}
        <TouchableOpacity style={styles.scannerBox} onPress={openCamera} activeOpacity={0.85}>
          <View style={styles.scannerCornerTL} />
          <View style={styles.scannerCornerTR} />
          <View style={styles.scannerCornerBL} />
          <View style={styles.scannerCornerBR} />
          <ScannerLaser />
          <View style={styles.scannerIconWrap}>
            <Feather name="camera" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.scannerInstruction}>Tap to Scan a Pilgrim Badge</Text>
          <Text style={styles.scannerSub}>Align the QR badge within the frame</Text>
        </TouchableOpacity>

        {/* Scan button */}
        <TouchableOpacity style={styles.scanBtn} onPress={openCamera}>
          <Feather name="maximize" size={18} color="#FFF" style={{ marginRight: 10 }} />
          <Text style={styles.scanBtnText}>Open Camera & Scan</Text>
        </TouchableOpacity>

        {permission && !permission.granted && (
          <View style={styles.permissionWarning}>
            <Feather name="alert-circle" size={16} color="#856404" style={{ marginRight: 8 }} />
            <Text style={styles.permissionWarningText}>
              Camera permission not granted. Tap the button above to request access.
            </Text>
          </View>
        )}

        <View style={styles.tipsCard}>
          <View style={styles.tipsTitleRow}>
            <Feather name="info" size={15} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.tipsTitle}>Tips for Best Results</Text>
          </View>
          {[
            'Hold the badge steady and flat',
            'Ensure good lighting — avoid strong glare',
            'Keep the full QR code within the camera frame',
            'Works 100% offline — no data is sent anywhere',
          ].map((tip, i) => (
            <View key={i} style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Full-screen Camera Modal */}
      <Modal visible={cameraOpen} animationType="slide" statusBarTranslucent onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.cameraOverlay} pointerEvents="none">
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddleRow}>
              <View style={styles.overlaySide} />
              <View style={styles.scanWindow}>
                <View style={[styles.cornerBracket, styles.cornerTL]} />
                <View style={[styles.cornerBracket, styles.cornerTR]} />
                <View style={[styles.cornerBracket, styles.cornerBL]} />
                <View style={[styles.cornerBracket, styles.cornerBR]} />
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom} />
          </View>
          <View style={styles.cameraLabels} pointerEvents="none">
            <Text style={styles.cameraTitle}>Scan Pilgrim QR Badge</Text>
            <Text style={styles.cameraSubtitle}>Align the QR code within the frame</Text>
          </View>
          <TouchableOpacity style={styles.cameraCloseBtn} onPress={() => setCameraOpen(false)}>
            <Feather name="x" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.cameraCloseBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ScannedCard pilgrim={scannedPilgrim} onClose={closeScannedCard} />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main IDTab
// ---------------------------------------------------------------------------
export const IDTab = () => {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PilgrimProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'badge' | 'register' | 'scan'>('badge');

  useEffect(() => {
    AsyncStorage.getItem('userProfile').then(s => { if (s) setProfile(JSON.parse(s)); });
  }, []);

  const handleSave = (p: PilgrimProfile) => { setProfile(p); setActiveTab('badge'); };

  const TAB_CONFIG = [
    { key: 'badge' as const, icon: 'credit-card' as const, label: 'My Badge' },
    { key: 'register' as const, icon: 'edit-3' as const, label: 'Register' },
    { key: 'scan' as const, icon: 'camera' as const, label: 'Scan' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Premium Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pilgrim ID</Text>
          <Text style={styles.headerSub}>QR Badge & Emergency Card</Text>
        </View>
        <View style={styles.onlinePill}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlinePillText}>Offline Ready</Text>
        </View>
      </View>

      {/* Pill segmented control */}
      <View style={styles.segmentedControl}>
        {TAB_CONFIG.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.segBtn, activeTab === tab.key && styles.segBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Feather
              name={tab.icon}
              size={15}
              color={activeTab === tab.key ? Colors.primary : Colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segBtnText, activeTab === tab.key && styles.segBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {activeTab === 'badge' && (
          <MyBadgeTab profile={profile} onGoRegister={() => setActiveTab('register')} />
        )}
        {activeTab === 'register' && (
          <RegisterTab profile={profile} onSave={handleSave} />
        )}
        {activeTab === 'scan' && <ScanTab />}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EAFAF1', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#A9DFBF',
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success, marginRight: 6 },
  onlinePillText: { color: '#27AE60', fontSize: 11, fontWeight: '700' },

  // Segmented control
  segmentedControl: {
    flexDirection: 'row', marginHorizontal: 16, marginVertical: 14,
    backgroundColor: '#EDEFF1', borderRadius: 12, padding: 4,
  },
  segBtn: { flex: 1, flexDirection: 'row', paddingVertical: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  segBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 12 },
  segBtnTextActive: { color: Colors.primary },

  // Avatar circle (large)
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#FFF',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  avatarInitials: { color: '#FFF', fontWeight: 'bold', fontSize: 22 },

  // Avatar circle (small, in scanned card)
  avatarCircleSmall: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitialsSmall: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },

  // Badge card
  badgeCard: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#E87D35',
    backgroundColor: Colors.surface, marginBottom: 16,
    shadowColor: '#E87D35', shadowOpacity: 0.2, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  badgeHeaderGradient: {
    backgroundColor: Colors.primary, paddingVertical: 14, alignItems: 'center',
  },
  badgeHeaderLabel: { color: '#FFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 1.2 },
  badgeHeaderSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  badgeBody: { padding: 18 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  profileName: { fontSize: 19, fontWeight: 'bold', color: Colors.textPrimary },
  dindiRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  dindiText: { fontSize: 12, color: Colors.textSecondary },

  // Info grid inside badge
  infoGrid: {
    flexDirection: 'row', backgroundColor: Colors.background,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 14, overflow: 'hidden',
  },
  infoCell: { flex: 1, padding: 14, alignItems: 'center' },
  infoCellRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  infoLabel: { fontSize: 9, fontWeight: 'bold', color: Colors.textSecondary, letterSpacing: 0.8 },
  infoValueLarge: { fontSize: 26, fontWeight: 'bold', marginTop: 4 },
  infoValueSmall: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },

  medicalAlert: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FDEDEC', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#F5B7B1', marginBottom: 14,
  },
  medicalAlertText: { color: '#C0392B', fontSize: 13, flex: 1 },

  qrContainer: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  qrFrame: {
    padding: 14, backgroundColor: '#FFF', borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  qrLabel: { fontSize: 10, fontWeight: 'bold', color: Colors.textSecondary, marginTop: 10, letterSpacing: 1 },
  qrSub: { fontSize: 10, color: '#AAA', marginTop: 3 },

  badgeFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1A1A2E', paddingVertical: 9,
  },
  badgeFooterText: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },

  printBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, padding: 15, borderRadius: 12, marginBottom: 12,
    shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  printBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  helpNote: { textAlign: 'center', color: Colors.textSecondary, fontSize: 12, lineHeight: 18, paddingHorizontal: 8, marginBottom: 8 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF3EA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 2, borderColor: '#FFD9BC',
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28, paddingHorizontal: 20 },

  // Form
  formContainer: { paddingBottom: 48, paddingTop: 4 },
  formSection: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  formSectionTitle: { fontSize: 13, fontWeight: 'bold', color: Colors.primary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
  formGroup: { marginBottom: 14 },
  formRow: { flexDirection: 'row' },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, marginBottom: 7 },
  input: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  inputFocused: { borderColor: Colors.primary, backgroundColor: '#FFF9F5' },
  inputIcon: { marginRight: 10 },
  inputText: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  selectBtn: { justifyContent: 'space-between' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, padding: 16, borderRadius: 12,
    marginTop: 4,
    shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  formNote: { textAlign: 'center', fontSize: 11, color: Colors.textSecondary, marginTop: 10, lineHeight: 17 },

  // Blood group modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: 300 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 18, textAlign: 'center' },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  bloodPill: {
    width: 64, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  bloodPillActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  bloodPillText: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },

  // Scan tab
  scannerBox: {
    height: 230, backgroundColor: '#0D0D1A', marginBottom: 16, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: Colors.primary,
    shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  scannerCornerTL: { position: 'absolute', top: 20, left: 20, width: 28, height: 28, borderTopWidth: 3, borderLeftWidth: 3, borderColor: Colors.primary, borderTopLeftRadius: 4 },
  scannerCornerTR: { position: 'absolute', top: 20, right: 20, width: 28, height: 28, borderTopWidth: 3, borderRightWidth: 3, borderColor: Colors.primary, borderTopRightRadius: 4 },
  scannerCornerBL: { position: 'absolute', bottom: 60, left: 20, width: 28, height: 28, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: Colors.primary, borderBottomLeftRadius: 4 },
  scannerCornerBR: { position: 'absolute', bottom: 60, right: 20, width: 28, height: 28, borderBottomWidth: 3, borderRightWidth: 3, borderColor: Colors.primary, borderBottomRightRadius: 4 },
  scannerLaser: {
    position: 'absolute', top: 20, left: 24, right: 24, height: 2,
    backgroundColor: Colors.danger,
    shadowColor: Colors.danger, shadowOpacity: 0.9, shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  scannerIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(232,100,10,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    borderWidth: 1.5, borderColor: 'rgba(232,100,10,0.4)',
  },
  scannerInstruction: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  scannerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', marginTop: 6, paddingHorizontal: 30 },

  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, padding: 16, borderRadius: 14, marginBottom: 16,
    shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  scanBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  permissionWarning: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF3CD', borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FFE69C',
  },
  permissionWarningText: { color: '#856404', fontSize: 12, flex: 1, lineHeight: 18 },

  tipsCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  tipsTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tipsTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.textPrimary },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginRight: 10 },
  tipText: { fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },

  // Camera modal
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { ...StyleSheet.absoluteFill, flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  overlayMiddleRow: { flexDirection: 'row', height: SCAN_WINDOW_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanWindow: { width: SCAN_WINDOW_SIZE, height: SCAN_WINDOW_SIZE, position: 'relative' },
  overlayBottom: { flex: 2, backgroundColor: 'rgba(0,0,0,0.65)' },
  cornerBracket: { position: 'absolute', width: 34, height: 34 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#FFF', borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#FFF', borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#FFF', borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#FFF', borderBottomRightRadius: 4 },
  cameraLabels: { position: 'absolute', top: 64, left: 0, right: 0, alignItems: 'center' },
  cameraTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  cameraSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  cameraCloseBtn: {
    position: 'absolute', bottom: 54, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  cameraCloseBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Scanned card
  scannedOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  scannedCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
    borderTopWidth: 3, borderTopColor: Colors.primary,
  },
  scannedHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  scannedHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  scannedName: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
  scannedDindi: { fontSize: 12, color: Colors.textSecondary },
  scannedCloseBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  scannedGrid: {
    flexDirection: 'row', backgroundColor: Colors.background,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 14, overflow: 'hidden',
  },
  scannedGridItem: { flex: 1, padding: 16, alignItems: 'center' },
  scannedGridLabel: { fontSize: 9, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: 4, letterSpacing: 0.8 },
  scannedGridValue: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF4FF', borderRadius: 8, padding: 10, marginBottom: 18,
    borderWidth: 1, borderColor: '#D0DFFF',
  },
  offlineBadgeText: { color: Colors.primary, fontSize: 12, flex: 1 },
  scannedDoneBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  scannedDoneBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
