const ROUTE_WAYPOINTS = [
  [73.7645, 18.7157], [73.7671, 18.6497], [73.8567, 18.5204],
  [73.9250, 18.5048], [74.0150, 18.4370], [74.1710, 18.3590],
  [74.3200, 18.2500], [74.5814, 18.1525], [75.0275, 18.1139],
  [74.9673, 17.8868], [74.9000, 17.8600], [74.8833, 17.8833],
  [75.0500, 17.7500], [75.1667, 17.7167], [75.2667, 17.7000],
  [75.3236, 17.6805]
];
const coords = ROUTE_WAYPOINTS.map(([lng, lat]) => `${lng},${lat}`).join(';');
fetch(`https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`)
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
