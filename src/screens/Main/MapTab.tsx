import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../../context/LangContext';
import * as Location from 'expo-location';
import { Text } from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { POI_DATA } from '../../data/pois';
import { WARI_SCHEDULE } from '../../data/schedule';

// Safe import — MapLibreGL requires native build. Will be undefined in Expo Go.
// setAccessToken(null) is called inside lib/maplibre.ts at module load.
import MapLibreGL from '../../lib/maplibre';

// Bottom sheet — safe import
let BottomSheet: any = null;
let BottomSheetScrollView: any = null;
try {
  const bs = require('@gorhom/bottom-sheet');
  BottomSheet = bs.default;
  BottomSheetScrollView = bs.BottomSheetScrollView;
} catch {}

// Use Carto Voyager vector style for premium look and offline compatibility
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

// ─── Palkhi Route ─────────────────────────────────────────────────────────────
// Key waypoints [lng, lat] for Tukaram Maharaj Palkhi 2025 — used for OSRM request
const ROUTE_WAYPOINTS: [number, number][] = [
  [73.7645, 18.7157], // Dehu
  [73.7671, 18.6497], // Akurdi
  [73.8567, 18.5204], // Pune Nanapeth
  [74.0150, 18.4370], // Loni Kalbhor
  [74.1710, 18.3590], // Yavat
  [74.3200, 18.2500], // Varvand
  [74.4500, 18.2000], // Undawadi Gawalyachi
  [74.5814, 18.1525], // Baramati
  [74.6500, 18.1100], // Sansar (Katewadi)
  [74.7500, 18.0500], // Nimgaon Ketki (Belwandi)
  [75.0275, 18.1139], // Indapur
  [75.0500, 17.9800], // Sarati
  [74.9673, 17.8868], // Akluj
  [74.9500, 17.8500], // Borgaon (Malinagar)
  [75.1000, 17.8000], // Pirachi Kuroli (Tondale-Bondale)
  [75.2667, 17.7000], // Wakhari (Bajirao Vihir)
  [75.3236, 17.6805], // Pandharpur
];

// Fallback straight-line route (used if OSRM is unavailable / offline)
const PALKHI_ROUTE_FALLBACK = {
  type: 'Feature' as const,
  geometry: {
    type: 'LineString' as const,
    coordinates: ROUTE_WAYPOINTS,
  },
};

// ─── 2026 Tukaram Maharaj Palkhi Events ───────────────────────────────────────
type EventStatus = 'completed' | 'ongoing' | 'upcoming';
interface WariEvent {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: EventStatus;
  description: string;
  emoji: string;
}

// ─── 2025 Tukaram Maharaj Palkhi Events ───────────────────────────────────────
const EVENTS_DATA: { [lang: string]: WariEvent[] } = {
  en: [
    { id: 'e1',  emoji: '🚩', name: 'Dehu – Palkhi Prasthan',        lat: 18.7157, lng: 73.7645, status: 'completed', description: 'Jul 7 · Palkhi departure ceremony and spiritual send-off from Dehu' },
    { id: 'e2',  emoji: '🙏', name: 'Akurdi – Abhang Aarti',          lat: 18.6497, lng: 73.7671, status: 'completed', description: 'Jul 8 · Abhang Aarti at Vitthal Temple, Akurdi' },
    { id: 'e3',  emoji: '🛕', name: 'Pune – Palkhi Arrival',          lat: 18.5204, lng: 73.8567, status: 'ongoing',   description: 'Jul 9-10 · 2-day stay at Nivdunga Vitthal-Rukmini Temple, Nana Peth' },
    { id: 'e4',  emoji: '🚶', name: 'Loni Kalbhor Halt',              lat: 18.4370, lng: 74.0150, status: 'upcoming',  description: 'Jul 11 · Night halt at Kadamwakvasti Palkhi Tal' },
    { id: 'e5',  emoji: '🚶', name: 'Yavat Halt',                     lat: 18.3590, lng: 74.1710, status: 'upcoming',  description: 'Jul 12 · Night halt at Yavat' },
    { id: 'e6',  emoji: '🚶', name: 'Varvand Halt',                   lat: 18.2500, lng: 74.3200, status: 'upcoming',  description: 'Jul 13 · Night halt at Varvand' },
    { id: 'e7',  emoji: '🚶', name: 'Undawadi Gawalyachi Halt',       lat: 18.2000, lng: 74.4500, status: 'upcoming',  description: 'Jul 14 · Night halt at Undawadi Gawalyachi' },
    { id: 'e8',  emoji: '🚶', name: 'Baramati Halt',                  lat: 18.1525, lng: 74.5814, status: 'upcoming',  description: 'Jul 15 · Stay at Sharada Vidyalaya, Baramati' },
    { id: 'e9',  emoji: '🐑', name: 'Katewadi – Sheep Ringan',        lat: 18.1100, lng: 74.6500, status: 'upcoming',  description: 'Jul 16 · Traditional Sheep Ringan at Katewadi — shepherd community tradition' },
    { id: 'e10', emoji: '🔵', name: 'Belwandi – 1st Gol Ringan',      lat: 18.0500, lng: 74.7500, status: 'upcoming',  description: 'Jul 17 · First major Gol Ringan of the Wari at Belwandi' },
    { id: 'e11', emoji: '🔵', name: 'Indapur – 2nd Gol Ringan',       lat: 18.1139, lng: 75.0275, status: 'upcoming',  description: 'Jul 18 · Second Gol Ringan at Indapur Palkhi Tal' },
    { id: 'e12', emoji: '🌊', name: 'Neera River – Neera Snan',       lat: 17.9650, lng: 74.9800, status: 'upcoming',  description: 'Jul 20 · Sacred ritual bath (Neera Snan) of the Padukas in the Neera River' },
    { id: 'e13', emoji: '🔵', name: 'Akluj – 3rd Gol Ringan',         lat: 17.8868, lng: 74.9673, status: 'upcoming',  description: 'Jul 20 · Third and final Gol Ringan at Mane Vidyalaya, Akluj' },
    { id: 'e14', emoji: '🟠', name: 'Malinagar – 1st Standing Ringan',lat: 17.8500, lng: 74.9500, status: 'upcoming',  description: 'Jul 21 · First Standing Ringan at Malinagar — Warkaris form lines' },
    { id: 'e15', emoji: '🏃', name: 'Tondale-Bondale – Dhava',        lat: 17.8000, lng: 75.1000, status: 'upcoming',  description: 'Jul 22 · Devotional Dhava (run) at Tondale-Bondale, stay at Pirachi Kuroli' },
    { id: 'e16', emoji: '🟠', name: 'Wakhari – 2nd Standing Ringan',  lat: 17.7000, lng: 75.2667, status: 'upcoming',  description: 'Jul 23 · Second Standing Ringan at Bajirao Vihir, Wakhari' },
    { id: 'e17', emoji: '🟠', name: 'Final Standing Ringan',          lat: 17.6900, lng: 75.3100, status: 'upcoming',  description: 'Jul 24 · Third and final Standing Ringan on the route to Pandharpur' },
    { id: 'e18', emoji: '🚩', name: 'Pandharpur Entry',               lat: 17.6805, lng: 75.3236, status: 'upcoming',  description: 'Jul 24 · Paduka Abhang Aarti and grand ceremonial entry into Pandharpur' },
    { id: 'e19', emoji: '🛕', name: 'Pandharpur – Nagar Pradakshina', lat: 17.6790, lng: 75.3210, status: 'upcoming',  description: 'Jul 25 · Traditional Nagar Pradakshina and Vitthal-Rukmini Darshan' },
  ],
  mr: [
    { id: 'e1',  emoji: '🚩', name: 'देहू – पालखी प्रस्थान',           lat: 18.7157, lng: 73.7645, status: 'completed', description: '७ जुलै · पालखी प्रस्थान सोहळा' },
    { id: 'e2',  emoji: '🙏', name: 'आकुर्डी – अभंग आरती',            lat: 18.6497, lng: 73.7671, status: 'completed', description: '८ जुलै · अभंग आरती व विठ्ठल मंदिरात मुक्काम' },
    { id: 'e3',  emoji: '🛕', name: 'पुणे – पालखी आगमन',              lat: 18.5204, lng: 73.8567, status: 'ongoing',   description: '९-१० जुलै · निवडुंगा विठ्ठल-रुखमिणी मंदिरात मुक्काम' },
    { id: 'e4',  emoji: '🚶', name: 'लोणी काळभोर मुक्काम',             lat: 18.4370, lng: 74.0150, status: 'upcoming',  description: '११ जुलै · कदमवाकवस्ती पालखी तळावर मुक्काम' },
    { id: 'e5',  emoji: '🚶', name: 'यावत मुक्काम',                    lat: 18.3590, lng: 74.1710, status: 'upcoming',  description: '१२ जुलै · यावत येथे मुक्काम' },
    { id: 'e6',  emoji: '🚶', name: 'वरवंड मुक्काम',                   lat: 18.2500, lng: 74.3200, status: 'upcoming',  description: '१३ जुलै · वरवंड येथे मुक्काम' },
    { id: 'e7',  emoji: '🚶', name: 'उंडवडी गवळ्याची मुक्काम',        lat: 18.2000, lng: 74.4500, status: 'upcoming',  description: '१४ जुलै · उंडवडी गवळ्याची येथे मुक्काम' },
    { id: 'e8',  emoji: '🚶', name: 'बारामती मुक्काम',                 lat: 18.1525, lng: 74.5814, status: 'upcoming',  description: '१५ जुलै · शारदा विद्यालय, बारामती येथे मुक्काम' },
    { id: 'e9',  emoji: '🐑', name: 'काटेवाडी – मेंढ्यांचे रिंगण',    lat: 18.1100, lng: 74.6500, status: 'upcoming',  description: '१६ जुलै · काटेवाडी येथे पारंपारिक मेंढ्यांचे रिंगण' },
    { id: 'e10', emoji: '🔵', name: 'बेलवंडी – पहिले गोल रिंगण',       lat: 18.0500, lng: 74.7500, status: 'upcoming',  description: '१७ जुलै · वारीतील पहिले मोठे गोल रिंगण' },
    { id: 'e11', emoji: '🔵', name: 'इंदापूर – दुसरे गोल रिंगण',        lat: 18.1139, lng: 75.0275, status: 'upcoming',  description: '१८ जुलै · इंदापूर येथे दुसरे गोल रिंगण' },
    { id: 'e12', emoji: '🌊', name: 'नीरा नदी – नीरा स्नान',            lat: 17.9650, lng: 74.9800, status: 'upcoming',  description: '२० जुलै · पादुकांचे पवित्र नीरा स्नान' },
    { id: 'e13', emoji: '🔵', name: 'अकलूज – तिसरे गोल रिंगण',         lat: 17.8868, lng: 74.9673, status: 'upcoming',  description: '२० जुलै · माने विद्यालय, अकलूज येथे तिसरे गोल रिंगण' },
    { id: 'e14', emoji: '🟠', name: 'माळीनगर – पहिले उभे रिंगण',       lat: 17.8500, lng: 74.9500, status: 'upcoming',  description: '२१ जुलै · माळीनगर येथे पहिले उभे रिंगण' },
    { id: 'e15', emoji: '🏃', name: 'तोंडले-बोंडले – धावा',            lat: 17.8000, lng: 75.1000, status: 'upcoming',  description: '२२ जुलै · तोंडले-बोंडले येथे धावा' },
    { id: 'e16', emoji: '🟠', name: 'वाखरी – दुसरे उभे रिंगण',         lat: 17.7000, lng: 75.2667, status: 'upcoming',  description: '२३ जुलै · बाजीराव विहीर येथे दुसरे उभे रिंगण' },
    { id: 'e17', emoji: '🟠', name: 'अंतिम उभे रिंगण',                  lat: 17.6900, lng: 75.3100, status: 'upcoming',  description: '२४ जुलै · पंढरपूरच्या वाटेवर तिसरे उभे रिंगण' },
    { id: 'e18', emoji: '🚩', name: 'पंढरपूर प्रवेश',                   lat: 17.6805, lng: 75.3236, status: 'upcoming',  description: '२४ जुलै · पादुका अभंग आरती व पंढरपुरात भव्य प्रवेश' },
    { id: 'e19', emoji: '🛕', name: 'पंढरपूर – नगर प्रदक्षिणा',         lat: 17.6790, lng: 75.3210, status: 'upcoming',  description: '२५ जुलै · पारंपारिक नगर प्रदक्षिणा व विठ्ठल-रुखमिणी दर्शन' },
  ],
};

// ─── Filter Types ─────────────────────────────────────────────────────────────
type FilterType = 'all' | 'water' | 'medical' | 'toilet' | 'shelter' | 'events';

const FILTERS_EN: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'water', label: 'Water' },
  { key: 'medical', label: 'Medical' },
  { key: 'toilet', label: 'Toilets' },
  { key: 'shelter', label: 'Shelters' },
  { key: 'events', label: 'Events' },
];

const FILTERS_MR: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'सर्व' },
  { key: 'water', label: 'पाणी' },
  { key: 'medical', label: 'वैद्यकीय' },
  { key: 'toilet', label: 'शौचालये' },
  { key: 'shelter', label: 'निवारे' },
  { key: 'events', label: 'कार्यक्रम' },
];

// ─── Helper: Distance Between Coords ─────────────────────────────────────────
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const MapTab = () => {
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const isMr = lang === 'mr';
  const FILTERS = isMr ? FILTERS_MR : FILTERS_EN;
  const events = EVENTS_DATA[isMr ? 'mr' : 'en'] ?? EVENTS_DATA.en;

  // ─── Real road route via OSRM ────────────────────────────────────────────────
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(PALKHI_ROUTE_FALLBACK);
  const [routeLoading, setRouteLoading] = useState(true);

  useEffect(() => {
    const coords = ROUTE_WAYPOINTS.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Use 'driving' profile for a cleaner highway route, as the Palkhi walks on main roads.
    // The 'foot' profile often creates weird loops and detours on small paths.
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.[0]?.geometry) {
          setRouteGeoJSON({ type: 'Feature' as const, geometry: data.routes[0].geometry });
        }
      })
      .catch((e) => {
        console.warn('Failed to fetch real road route, using straight-line fallback:', e);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setRouteLoading(false);
      });
  }, []);

  const cameraRef = useRef<any>(null);
  const bottomSheetRef = useRef<any>(null);
  const snapPoints = useMemo(() => ['15%', '50%', '90%'], []);

  const [mapError, setMapError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<{ name: string; type?: string; description?: string } | null>(null);

  // GPS from expo-location — not MapLibreGL.UserLocation
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationLoading(false);
          return;
        }
        // Get initial fix quickly
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLat(loc.coords.latitude);
        setUserLng(loc.coords.longitude);
        setLocationLoading(false);

        // Watch for updates
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 20 },
          (loc) => {
            setUserLat(loc.coords.latitude);
            setUserLng(loc.coords.longitude);
          }
        );
      } catch {
        setLocationLoading(false);
      }
    })();

    return () => { subscription?.remove(); };
  }, []);

  // ─── GeoJSON for User Location ─────────────────────────────────────────────
  const userGeoJSON = useMemo(() => {
    if (userLat == null || userLng == null) {
      return { type: 'FeatureCollection' as const, features: [] };
    }
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [userLng, userLat] },
      }],
    };
  }, [userLat, userLng]);

  // ─── Filtered POI GeoJSON ──────────────────────────────────────────────────
  const poisGeoJSON = useMemo(() => {
    if (activeFilter === 'events') {
      return { type: 'FeatureCollection' as const, features: [] };
    }
    
    const filtered =
      activeFilter === 'all'
        ? POI_DATA
        : POI_DATA.filter((p) => p.type === activeFilter);

    return {
      type: 'FeatureCollection' as const,
      features: filtered.map((poi) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [poi.lng, poi.lat] },
        properties: { name: poi.name, type: poi.type, description: '' },
      })),
    };
  }, [activeFilter]);

  // ─── Events GeoJSON ────────────────────────────────────────────────────────
  const eventsGeoJSON = useMemo(() => {
    // Only show events if the 'events' filter is active. Hide them otherwise.
    if (activeFilter !== 'events') {
      return { type: 'FeatureCollection' as const, features: [] };
    }

    return {
      type: 'FeatureCollection' as const,
      features: events.map((ev) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [ev.lng, ev.lat] },
        properties: { name: ev.name, emoji: ev.emoji ?? '📍', status: ev.status, description: ev.description },
      })),
    };
  }, [activeFilter, events]);

  // ─── Sorted POIs By Distance ───────────────────────────────────────────────
  const sortedPOIs = useMemo(() => {
    const base = activeFilter === 'all' || activeFilter === 'events'
      ? POI_DATA
      : POI_DATA.filter((p) => p.type === activeFilter);

    if (userLat == null || userLng == null) return base;
    return [...base].sort(
      (a, b) =>
        getDistanceKm(userLat, userLng, a.lat, a.lng) -
        getDistanceKm(userLat, userLng, b.lat, b.lng)
    );
  }, [activeFilter, userLat, userLng]);

  // ─── Fly to POI ────────────────────────────────────────────────────────────
  const flyTo = useCallback((lng: number, lat: number) => {
    cameraRef.current?.flyTo({
      center: [lng, lat],
      zoom: 14,
      duration: 800,
    });
    // Hide panels so map is visible
    bottomSheetRef.current?.snapToIndex(0);
    setShowSchedule(false);
  }, []);

  // ─── POI Press Handler ─────────────────────────────────────────────────────
  const handlePOIPress = useCallback((props: { name: string; type?: string; description?: string }) => {
    setSelectedPOI(props);
    // Collapse bottom sheet when selecting a POI to reveal the callout
    bottomSheetRef.current?.snapToIndex(0);
    setShowSchedule(false);
  }, []);

  // ─── Filter Press Handler ──────────────────────────────────────────────────
  const handleFilterPress = useCallback((filterKey: FilterType) => {
    setActiveFilter(filterKey);
    setSelectedPOI(null);
    setShowSchedule(false);
    bottomSheetRef.current?.snapToIndex(1); // Open sheet slightly to show filtered results

    const items = filterKey === 'all' || filterKey === 'events'
      ? POI_DATA
      : POI_DATA.filter((p) => p.type === filterKey);

    if (items.length > 0) {
      const lats = items.map(i => i.lat);
      const lngs = items.map(i => i.lng);
      
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      // MapLibre v11: [west, south, east, north]
      cameraRef.current?.fitBounds(
        [minLng, minLat, maxLng, maxLat],
        {
          padding: { top: 100, bottom: 200, left: 50, right: 50 },
          duration: 1000
        }
      );
    }
  }, []);

  // ─── Render: No native build ───────────────────────────────────────────────
  if (!MapLibreGL) {
    return (
      <View style={styles.placeholder}>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>🗺️</Text>
        <Text style={styles.placeholderTitle}>Map Not Available</Text>
        <Text style={styles.placeholderDesc}>
          Map requires the native dev build APK installed on your device.{'\n\n'}
          Install the APK from EAS Build, then reopen the app.
        </Text>
      </View>
    );
  }

  // ─── Render: Map Error ─────────────────────────────────────────────────────
  if (mapError) {
    return (
      <View style={styles.placeholder}>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>⚠️</Text>
        <Text style={styles.placeholderTitle}>Map Failed to Load</Text>
        <Text style={styles.placeholderDesc}>{mapError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => setMapError(null)}>
          <Text style={{ color: Colors.surface, fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render: Event status color ────────────────────────────────────────────
  const eventStatusColor = (status: EventStatus) => {
    if (status === 'completed') return Colors.success;
    if (status === 'ongoing') return Colors.primary;
    return '#3498DB'; // upcoming = blue
  };

  const showPOIs = activeFilter !== 'events';
  const showEvents = activeFilter === 'all' || activeFilter === 'events';

  return (
    <View style={styles.container}>
      {/* ─── MAP ─────────────────────────────────────────────────────────── */}
      <MapLibreGL.Map
        style={styles.map}
        mapStyle={MAP_STYLE}
        logo={false}
        attribution={false}
        onDidFailLoadingMap={(err: any) =>
          setMapError(err?.message ?? 'Unknown map error')
        }
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          initialViewState={{
            center: [73.8953, 18.6729], // Alandi [lng, lat]
            zoom: 10,
          }}
        />

        {/* ── Palkhi Route Line ─────────────────────────────────────────── */}
        <MapLibreGL.GeoJSONSource id="route" data={routeGeoJSON}>
          {/* Casing (Outline) layer - Darker Blue */}
          <MapLibreGL.Layer
            type="line"
            id="routeLineCasing"
            style={{
              lineColor: '#1756A9', // Dark blue casing
              lineWidth: 8,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          {/* Main line - Bright Blue (Google Maps style) */}
          <MapLibreGL.Layer
            type="line"
            id="routeLineMain"
            style={{
              lineColor: '#3498DB', // Bright blue
              lineWidth: 5,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapLibreGL.GeoJSONSource>

        {/* ── POI Markers (FeatureCollection → SymbolLayer) ────────────── */}
        <MapLibreGL.GeoJSONSource
          id="pois"
          data={poisGeoJSON}
          onPress={(e: any) => {
            const props = e?.features?.[0]?.properties;
            if (props) handlePOIPress(props);
          }}
        >
          {/* Hitbox layer (invisible but large for easy tapping) */}
          <MapLibreGL.Layer
            type="circle"
            id="poiHitbox"
            style={{
              circleRadius: 30,
              circleOpacity: 0,
            }}
          />
          <MapLibreGL.Layer
            type="circle"
            id="poiCircles"
            style={{
              circleRadius: 10,
              circleColor: [
                'match',
                ['get', 'type'],
                'water', '#3498DB',
                'medical', '#E74C3C',
                'toilet', '#F39C12',
                'shelter', '#9B59B6',
                Colors.primary // fallback
              ],
              circleStrokeWidth: 2,
              circleStrokeColor: '#FFFFFF',
            }}
          />
          <MapLibreGL.Layer
            type="symbol"
            id="poiSymbols"
            style={{
              textField: ['get', 'name'],
              textSize: 11,
              textColor: Colors.textPrimary,
              textHaloColor: '#FFFFFF',
              textHaloWidth: 1,
              textOffset: [0, 1.8],
              textAnchor: 'top',
            }}
          />
        </MapLibreGL.GeoJSONSource>

        {/* ── Events Markers ────────────────────────────────────────────── */}
        <MapLibreGL.GeoJSONSource
          id="events"
          data={eventsGeoJSON}
          onPress={(e: any) => {
            const props = e?.features?.[0]?.properties;
            if (props) handlePOIPress(props);
          }}
        >
          {/* Hitbox layer */}
          <MapLibreGL.Layer
            type="circle"
            id="eventHitbox"
            style={{
              circleRadius: 35,
              circleOpacity: 0,
            }}
          />
          {/* Emoji label — replaces the old text label */}
          <MapLibreGL.Layer
            type="symbol"
            id="eventEmoji"
            style={{
              textField: ['get', 'emoji'],
              textSize: 16,
              textAnchor: 'center',
              textOffset: [0, 0],
            }}
          />
          {/* Event name below the dot */}
          <MapLibreGL.Layer
            type="symbol"
            id="eventLabels"
            style={{
              textField: ['get', 'name'],
              textSize: 10,
              textColor: Colors.textPrimary,
              textHaloColor: '#FFFFFF',
              textHaloWidth: 1,
              textOffset: [0, 2.4],
              textAnchor: 'top',
            }}
          />
        </MapLibreGL.GeoJSONSource>

        {/* ── User Location (GeoJSONSource instead of UserLocation component) */}
        <MapLibreGL.GeoJSONSource id="user" data={userGeoJSON}>
          <MapLibreGL.Layer
            type="circle"
            id="userCircle"
            style={{
              circleRadius: 10,
              circleColor: Colors.primary,
              circleStrokeWidth: 3,
              circleStrokeColor: '#FFFFFF',
            }}
          />
          <MapLibreGL.Layer
            type="circle"
            id="userPulse"
            style={{
              circleRadius: 20,
              circleColor: Colors.primary,
              circleOpacity: 0.25,
            }}
          />
        </MapLibreGL.GeoJSONSource>
      </MapLibreGL.Map>

      {/* ─── Filter Bar ──────────────────────────────────────────────────── */}
      <View style={[styles.filterBar, { top: insets.top }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => handleFilterPress(f.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === f.key && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ─── Top-right Controls ──────────────────────────────────────────── */}
      <View style={[styles.topControls, { top: insets.top + 76 }]}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => setShowSchedule(!showSchedule)}
        >
          <Text style={styles.controlBtnText}>{isMr ? '📅 वेळापत्रक' : '📅 Schedule'}</Text>
        </TouchableOpacity>

        {userLat != null && (
          <TouchableOpacity
            style={[styles.controlBtn, { marginTop: 8 }]}
            onPress={() => flyTo(userLng!, userLat!)}
          >
            <Text style={styles.controlBtnText}>{isMr ? '📍 माझे स्थान' : '📍 My Location'}</Text>
          </TouchableOpacity>
        )}

        {locationLoading && (
          <View style={[styles.controlBtn, { marginTop: 8, alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}
      </View>

      {/* ─── Schedule Overlay ─────────────────────────────────────────────── */}
      {showSchedule && (
        <View style={[styles.schedulePanel, { top: insets.top + 130 }]}>
          <View style={styles.schedulePanelHeader}>
            <Text style={[Typography.headingMedium, { fontSize: 16 }]}>{isMr ? 'वारी वेळापत्रक' : 'Wari Schedule'}</Text>
            <TouchableOpacity onPress={() => setShowSchedule(false)}>
              <Text style={{ color: Colors.textSecondary, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {WARI_SCHEDULE.map((s) => (
              <View key={s.id} style={styles.scheduleRow}>
                <Text style={Typography.bodyMedium}>{s.village}</Text>
                <Text style={Typography.bodySmall}>
                  {isMr
                    ? s.date.replace('Day', 'दिवस') + ' · ' + s.distanceFromStart
                    : s.date + ' · ' + s.distanceFromStart
                  }
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── Selected POI Callout ─────────────────────────────────────────── */}
      {selectedPOI && (
        <View style={styles.callout}>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.bodyLarge, { fontWeight: 'bold' }]}>{selectedPOI.name}</Text>
            {selectedPOI.type && (
              <Text style={Typography.bodySmall}>
                {isMr
                  ? ({ water: 'पाणी', medical: 'वैद्यकीय', toilet: 'शौचालय', shelter: 'निवारा' } as any)[selectedPOI.type] ?? selectedPOI.type.toUpperCase()
                  : selectedPOI.type.toUpperCase()
                }
              </Text>
            )}
            {selectedPOI.description ? (
              <Text style={[Typography.bodySmall, { marginTop: 2 }]}>{selectedPOI.description}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => setSelectedPOI(null)}>
            <Text style={{ color: Colors.textSecondary, fontSize: 18, paddingLeft: 12 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Bottom Sheet: Nearby POIs ────────────────────────────────────── */}
      {BottomSheet && BottomSheetScrollView ? (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          backgroundStyle={{ backgroundColor: Colors.surface }}
          handleIndicatorStyle={{ backgroundColor: Colors.textSecondary }}
        >
          <View style={styles.sheetContent}>
            <Text style={[Typography.headingMedium, { marginBottom: 12, fontSize: 18 }]}>
              {isMr ? 'जवळचे ठिकाणे' : 'Nearby POIs'}
              {userLat != null && (
                <Text style={[Typography.bodySmall, { fontWeight: 'normal' }]}>
                  {isMr ? ' (अंतरानुसार)' : ' (sorted by distance)'}
                </Text>
              )}
            </Text>
            <BottomSheetScrollView>
              {sortedPOIs.map((poi) => {
                const dist =
                  userLat != null && userLng != null
                    ? getDistanceKm(userLat, userLng, poi.lat, poi.lng).toFixed(1)
                    : null;
                return (
                  <TouchableOpacity
                    key={poi.id}
                    style={styles.poiRow}
                    onPress={() => flyTo(poi.lng, poi.lat)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={Typography.bodyLarge}>{poi.name}</Text>
                      <Text style={Typography.bodySmall}>
                        {isMr
                          ? (({ water: 'पाणी', medical: 'वैद्यकीय', toilet: 'शौचालय', shelter: 'निवारा' } as any)[poi.type] ?? poi.type.toUpperCase())
                          : poi.type.toUpperCase()
                        }{dist != null ? (isMr ? ` · ${dist} किमी दूर` : ` · ${dist} km away`) : ''}
                      </Text>
                    </View>
                    <View style={styles.goButton}>
                      <Text style={{ color: Colors.surface, fontWeight: 'bold', fontSize: 12 }}>{isMr ? 'जा →' : 'GO →'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </BottomSheetScrollView>
          </View>
        </BottomSheet>
      ) : null}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },

  // Filter bar sits above the map — top is set dynamically via insets
  filterBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  filterContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Colors.surface,
  },

  // Top-right controls — top is set dynamically via insets
  topControls: {
    position: 'absolute',
    right: 16,
  },
  controlBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20, // pill shape
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  controlBtnText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Schedule overlay panel — top is set dynamically via insets
  schedulePanel: {
    position: 'absolute',
    right: 16,
    width: 240,
    maxHeight: 360,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  schedulePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
    paddingVertical: 8,
  },

  // POI callout banner
  callout: {
    position: 'absolute',
    bottom: 120, // above the 15% bottom sheet
    left: 20,
    right: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },

  // Bottom sheet
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  poiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  goButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 12,
  },

  // Placeholder / error screen
  placeholder: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 10,
  },
  placeholderDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
