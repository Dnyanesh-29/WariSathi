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
import { WARI_SCHEDULE_EN, WARI_SCHEDULE_MR } from '../../data/schedule';
import { Ionicons } from '@expo/vector-icons';
import { ChatBotBottomSheet } from '../../components/ChatBotBottomSheet';
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

// ─── 2026 Tukaram Maharaj Palkhi Events ───────────────────────────────────────
const EVENTS_DATA: { [lang: string]: WariEvent[] } = {
  en: [
    { id: 'e1',  emoji: '🚩', name: 'Palkhi Prasthan – Dehu',           lat: 18.7157, lng: 73.7645, status: 'upcoming', description: '7 Jul · Palkhi departure ceremony and spiritual send-off from Dehu' },
    { id: 'e2',  emoji: '🙏', name: 'Abhang Aarti – Akurdi',            lat: 18.6497, lng: 73.7671, status: 'upcoming', description: '8 Jul · Abhang Aarti at Vitthal Temple, Akurdi' },
    { id: 'e3',  emoji: '🛕', name: 'Palkhi Arrival – Pune',            lat: 18.5204, lng: 73.8567, status: 'upcoming', description: '9–10 Jul · 2-day stay at Nivdunga Vitthal-Rukmini Temple, Nana Peth' },
    { id: 'e4',  emoji: '🐑', name: 'Sheep Ringan – Katewadi',          lat: 18.1100, lng: 74.6500, status: 'upcoming', description: '16 Jul · Traditional Sheep Ringan at Katewadi' },
    { id: 'e5',  emoji: '🟢', name: '1st Gol Ringan – Belwandi',        lat: 18.0500, lng: 74.7500, status: 'upcoming', description: '17 Jul · First major Gol Ringan of the Wari at Belwandi' },
    { id: 'e6',  emoji: '🟢', name: '2nd Gol Ringan – Indapur',         lat: 18.1139, lng: 75.0275, status: 'upcoming', description: '18 Jul · Second Gol Ringan at Indapur Palkhi Tal' },
    { id: 'e7',  emoji: '🌊', name: 'Neera Snan – Neera River',         lat: 17.9650, lng: 74.9800, status: 'upcoming', description: '20 Jul · Sacred ritual bath of the Padukas in the Neera River' },
    { id: 'e8',  emoji: '🟢', name: '3rd Gol Ringan – Akluj',           lat: 17.8868, lng: 74.9673, status: 'upcoming', description: '20 Jul · Third and final Gol Ringan at Mane Vidyalaya, Akluj' },
    { id: 'e9',  emoji: '🟠', name: '1st Standing Ringan – Malinagar',  lat: 17.8500, lng: 74.9500, status: 'upcoming', description: '21 Jul · First Standing Ringan at Malinagar' },
    { id: 'e10', emoji: '🏃', name: 'Dhava – Tondale Bondale',          lat: 17.8000, lng: 75.1000, status: 'upcoming', description: '22 Jul · Devotional Dhava (run) at Tondale-Bondale' },
    { id: 'e11', emoji: '🟠', name: '2nd Standing Ringan – Bajirao Vihir', lat: 17.7000, lng: 75.2667, status: 'upcoming', description: '23 Jul · Second Standing Ringan at Bajirao Vihir' },
    { id: 'e12', emoji: '🟠', name: 'Final Standing Ringan',            lat: 17.6900, lng: 75.3100, status: 'upcoming', description: '24 Jul · Third and final Standing Ringan on the route to Pandharpur' },
    { id: 'e13', emoji: '🚩', name: 'Pandharpur Entry',                 lat: 17.6805, lng: 75.3236, status: 'upcoming', description: '24 Jul · Grand ceremonial Palkhi entry into Pandharpur' },
    { id: 'e14', emoji: '🛕', name: 'Nagar Pradakshina – Pandharpur',   lat: 17.6790, lng: 75.3210, status: 'upcoming', description: '25 Jul · Traditional Nagar Pradakshina and Vitthal-Rukmini Darshan' },
  ],
  mr: [
    { id: 'e1',  emoji: '🚩', name: 'पालखी प्रस्थान – देहू',            lat: 18.7157, lng: 73.7645, status: 'upcoming', description: '७ जुलै · पालखी प्रस्थान सोहळा देहू येथून' },
    { id: 'e2',  emoji: '🙏', name: 'अभंग आरती – आकुर्डी',              lat: 18.6497, lng: 73.7671, status: 'upcoming', description: '८ जुलै · विठ्ठल मंदिर, आकुर्डी येथे अभंग आरती' },
    { id: 'e3',  emoji: '🛕', name: 'पालखी आगमन – पुणे',               lat: 18.5204, lng: 73.8567, status: 'upcoming', description: '९-१० जुलै · निवडुंगा विठ्ठल-रुखमिणी मंदिरात मुक्काम' },
    { id: 'e4',  emoji: '🐑', name: 'मेंढ्यांचे रिंगण – काटेवाडी',      lat: 18.1100, lng: 74.6500, status: 'upcoming', description: '१६ जुलै · काटेवाडी येथे मेंढ्यांचे रिंगण' },
    { id: 'e5',  emoji: '🟢', name: 'पहिले गोल रिंगण – बेलवंडी',        lat: 18.0500, lng: 74.7500, status: 'upcoming', description: '१७ जुलै · बेलवंडी येथे पहिले गोल रिंगण' },
    { id: 'e6',  emoji: '🟢', name: 'दुसरे गोल रिंगण – इंदापूर',         lat: 18.1139, lng: 75.0275, status: 'upcoming', description: '१८ जुलै · इंदापूर येथे दुसरे गोल रिंगण' },
    { id: 'e7',  emoji: '🌊', name: 'नीरा स्नान – नीरा नदी',             lat: 17.9650, lng: 74.9800, status: 'upcoming', description: '२० जुलै · नीरा नदीत पादुकांचे पवित्र स्नान' },
    { id: 'e8',  emoji: '🟢', name: 'तिसरे गोल रिंगण – अकलूज',          lat: 17.8868, lng: 74.9673, status: 'upcoming', description: '२० जुलै · माने विद्यालय, अकलूज येथे तिसरे गोल रिंगण' },
    { id: 'e9',  emoji: '🟠', name: 'पहिले उभे रिंगण – माळीनगर',        lat: 17.8500, lng: 74.9500, status: 'upcoming', description: '२१ जुलै · माळीनगर येथे पहिले उभे रिंगण' },
    { id: 'e10', emoji: '🏃', name: 'धावा – तोंडले-बोंडले',              lat: 17.8000, lng: 75.1000, status: 'upcoming', description: '२२ जुलै · तोंडले-बोंडले येथे धावा' },
    { id: 'e11', emoji: '🟠', name: 'दुसरे उभे रिंगण – बाजीराव विहीर',  lat: 17.7000, lng: 75.2667, status: 'upcoming', description: '२३ जुलै · बाजीराव विहीर येथे दुसरे उभे रिंगण' },
    { id: 'e12', emoji: '🟠', name: 'अंतिम उभे रिंगण',                  lat: 17.6900, lng: 75.3100, status: 'upcoming', description: '२४ जुलै · पंढरपूरच्या वाटेवर तिसरे उभे रिंगण' },
    { id: 'e13', emoji: '🚩', name: 'पंढरपूर प्रवेश',                   lat: 17.6805, lng: 75.3236, status: 'upcoming', description: '२४ जुलै · पंढरपुरात भव्य पालखी प्रवेश' },
    { id: 'e14', emoji: '🛕', name: 'नगर प्रदक्षिणा – पंढरपूर',         lat: 17.6790, lng: 75.3210, status: 'upcoming', description: '२५ जुलै · पारंपारिक नगर प्रदक्षिणा व विठ्ठल-रुखमिणी दर्शन' },
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
  const schedule = isMr ? WARI_SCHEDULE_MR : WARI_SCHEDULE_EN;

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
  const chatBotSheetRef = useRef<any>(null);
  const snapPoints = useMemo(() => ['15%', '50%', '90%'], []);

  const [mapError, setMapError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<{ name: string; type?: string; description?: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WariEvent | null>(null);

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
    bottomSheetRef.current?.snapToIndex(0);
    setShowSchedule(false);
  }, []);

  const flyToEvent = useCallback((ev: WariEvent) => {
    cameraRef.current?.flyTo({
      center: [ev.lng, ev.lat],
      zoom: 14,
      duration: 800,
    });
    bottomSheetRef.current?.snapToIndex(0);
    setShowSchedule(false);
    setSelectedPOI(null);
    setSelectedEvent(ev);
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
          {/* Event circle marker */}
          <MapLibreGL.Layer
            type="circle"
            id="eventCircle"
            style={{
              circleRadius: 8,
              circleColor: Colors.primary,
              circleStrokeColor: '#FFFFFF',
              circleStrokeWidth: 2,
            }}
          />
          {/* Event name label */}
          <MapLibreGL.Layer
            type="symbol"
            id="eventLabels"
            style={{
              textField: ['get', 'name'],
              textSize: 11,
              textColor: Colors.textPrimary,
              textHaloColor: '#FFFFFF',
              textHaloWidth: 1.5,
              textOffset: [0, 1.2],
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
            {schedule.map((s) => (
              <View key={s.id} style={styles.scheduleRow}>
                <Text style={Typography.bodyMedium}>{s.village}</Text>
                <Text style={Typography.bodySmall}>
                  {s.date + ' · ' + s.distanceFromStart}
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

      {/* ─── Selected Event Callout ───────────────────────────────────────── */}
      {selectedEvent && (
        <View style={styles.callout}>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.bodyLarge, { fontWeight: 'bold' }]}>{selectedEvent.name}</Text>
            <Text style={[Typography.bodySmall, { color: Colors.primary, marginTop: 2 }]}>
              {selectedEvent.description}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedEvent(null)}>
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
            {activeFilter === 'events' ? (
              <>
                <Text style={[Typography.headingMedium, { marginBottom: 12, fontSize: 18 }]}>
                  {isMr ? '📅 कार्यक्रम' : '📅 Wari Events 2026'}
                </Text>
                <BottomSheetScrollView>
                  {events.map((ev) => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.poiRow}
                      onPress={() => flyToEvent(ev)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={Typography.bodyLarge}>{ev.name}</Text>
                        <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
                          {ev.description}
                        </Text>
                      </View>
                      <View style={styles.goButton}>
                        <Text style={{ color: Colors.surface, fontWeight: 'bold', fontSize: 12 }}>
                          {isMr ? 'जा →' : 'GO →'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </BottomSheetScrollView>
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        </BottomSheet>
      ) : null}

      {/* Floating Action Button for ChatBot */}
      <TouchableOpacity 
        style={styles.chatFab}
        onPress={() => chatBotSheetRef.current?.expand()}
      >
        <Ionicons name="sparkles" size={24} color="#fff" />
      </TouchableOpacity>

      <ChatBotBottomSheet bottomSheetRef={chatBotSheetRef} />
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
