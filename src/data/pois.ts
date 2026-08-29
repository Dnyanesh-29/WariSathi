export type POIType = 'water' | 'medical' | 'toilet' | 'shelter';

export interface POI {
  id: string;
  name: string;
  type: POIType;
  lat: number;
  lng: number;
}

export const POI_DATA: POI[] = [
  // Sample POIs along Alandi to Pandharpur roughly
  { id: '1', name: 'Alandi Water Point', type: 'water', lat: 18.6757, lng: 73.8966 },
  { id: '2', name: 'Pune City Med Camp', type: 'medical', lat: 18.5204, lng: 73.8567 },
  { id: '3', name: 'Saswad Rest Shelter', type: 'shelter', lat: 18.3415, lng: 74.0298 },
  { id: '4', name: 'Jejuri Toilets', type: 'toilet', lat: 18.2750, lng: 74.1610 },
  { id: '5', name: 'Jejuri Water Point', type: 'water', lat: 18.2760, lng: 74.1620 },
  { id: '6', name: 'Valhe Medical Camp', type: 'medical', lat: 18.1756, lng: 74.1481 },
  { id: '7', name: 'Lonand Shelter', type: 'shelter', lat: 18.0667, lng: 74.1833 },
  { id: '8', name: 'Phaltan Water Point', type: 'water', lat: 17.9833, lng: 74.4333 },
  { id: '9', name: 'Natepute Med Camp', type: 'medical', lat: 17.8500, lng: 74.7500 },
  { id: '10', name: 'Malshiras Toilets', type: 'toilet', lat: 17.8000, lng: 74.9167 },
  { id: '11', name: 'Velapur Shelter', type: 'shelter', lat: 17.7500, lng: 75.0500 },
  { id: '12', name: 'Bhandishegaon Water Point', type: 'water', lat: 17.7167, lng: 75.1667 },
  { id: '13', name: 'Wakhari Med Camp', type: 'medical', lat: 17.7000, lng: 75.2667 },
  { id: '14', name: 'Pandharpur Entry Toilets', type: 'toilet', lat: 17.6778, lng: 75.3236 },
  { id: '15', name: 'Pandharpur Main Shelter', type: 'shelter', lat: 17.6700, lng: 75.3200 },
];
