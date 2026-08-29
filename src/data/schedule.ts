export interface Halt {
  id: string;
  village: string;
  date: string;
  distanceFromStart: string;
}

// Tukaram Maharaj Palkhi Yatra 2026 — Dehu to Pandharpur
export const WARI_SCHEDULE: Halt[] = [
  { id: '1',  village: 'Dehu (Departure)',       date: 'Jul 7 (Tue)', distanceFromStart: '0 km'   },
  { id: '2',  village: 'Akurdi',                  date: 'Jul 8 (Wed)', distanceFromStart: '12 km'  },
  { id: '3',  village: 'Pune (Nana Peth)',        date: 'Jul 9-10 (Thu-Fri)', distanceFromStart: '35 km'  },
  { id: '4',  village: 'Loni Kalbhor',            date: 'Jul 11 (Sat)', distanceFromStart: '60 km'  },
  { id: '5',  village: 'Yavat',                   date: 'Jul 12 (Sun)', distanceFromStart: '78 km'  },
  { id: '6',  village: 'Varvand',                 date: 'Jul 13 (Mon)', distanceFromStart: '95 km'  },
  { id: '7',  village: 'Undawadi Gawalyachi',     date: 'Jul 14 (Tue)', distanceFromStart: '105 km' },
  { id: '8',  village: 'Baramati',                date: 'Jul 15 (Wed)', distanceFromStart: '120 km' },
  { id: '9',  village: 'Sansar',                  date: 'Jul 16 (Thu)', distanceFromStart: '135 km' },
  { id: '10', village: 'Nimgaon Ketki',           date: 'Jul 17 (Fri)', distanceFromStart: '150 km' },
  { id: '11', village: 'Indapur',                 date: 'Jul 18 (Sat)', distanceFromStart: '165 km' },
  { id: '12', village: 'Sarati',                  date: 'Jul 19 (Sun)', distanceFromStart: '180 km' },
  { id: '13', village: 'Akluj',                   date: 'Jul 20 (Mon)', distanceFromStart: '195 km' },
  { id: '14', village: 'Borgaon',                 date: 'Jul 21 (Tue)', distanceFromStart: '210 km' },
  { id: '15', village: 'Pirachi Kuroli',          date: 'Jul 22 (Wed)', distanceFromStart: '225 km' },
  { id: '16', village: 'Wakhari',                 date: 'Jul 23 (Thu)', distanceFromStart: '240 km' },
  { id: '17', village: 'Pandharpur (Arrival)',    date: 'Jul 24 (Fri)', distanceFromStart: '250 km' },
  { id: '18', village: 'Nagar Pradakshina',       date: 'Jul 25 (Sat)', distanceFromStart: '250 km' },
];
