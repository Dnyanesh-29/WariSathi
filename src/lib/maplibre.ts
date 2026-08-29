// Single point of import for MapLibreGL.
// Both MapTab and GroupTab must import from here, never directly,
// to avoid the "Tried to register two views with the same name MLRNCamera" crash.
let MapLibreGL: any = null;
try {
  const _maplibre = require('@maplibre/maplibre-react-native');
  MapLibreGL = _maplibre.default || _maplibre;
  if (!MapLibreGL || Object.keys(MapLibreGL).length === 0) {
    console.error('[MapLibre] module loaded but is empty/undefined');
  }
} catch (e: any) {
  // Log so the error is visible in Metro / adb logcat
  console.error('[MapLibre] failed to load:', e?.message ?? e);
}

export default MapLibreGL;
