export interface Halt {
  id: string;
  village: string;
  date: string;
  distanceFromStart: string;
}

// Tukaram Maharaj Palkhi Yatra 2026 — Dehu to Pandharpur
export const WARI_SCHEDULE_EN: Halt[] = [
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

export const WARI_SCHEDULE_MR: Halt[] = [
  { id: '1',  village: 'देहू (प्रस्थान)',       date: '७ जुलै (मंगळ)', distanceFromStart: '० किमी' },
  { id: '2',  village: 'आकुर्डी',               date: '८ जुलै (बुध)', distanceFromStart: '१२ किमी' },
  { id: '3',  village: 'पुणे (नाना पेठ)',        date: '९-१० जुलै (गुरु-शुक्र)', distanceFromStart: '३५ किमी' },
  { id: '4',  village: 'लोणी काळभोर',            date: '११ जुलै (शनि)', distanceFromStart: '६० किमी' },
  { id: '5',  village: 'यवत',                   date: '१२ जुलै (रवि)', distanceFromStart: '७८ किमी' },
  { id: '6',  village: 'वरवंड',                 date: '१३ जुलै (सोम)', distanceFromStart: '९५ किमी' },
  { id: '7',  village: 'उंडवडी गवळ्याची',       date: '१४ जुलै (मंगळ)', distanceFromStart: '१०५ किमी' },
  { id: '8',  village: 'बारामती',                date: '१५ जुलै (बुध)', distanceFromStart: '१२० किमी' },
  { id: '9',  village: 'सणसर',                  date: '१६ जुलै (गुरु)', distanceFromStart: '१३५ किमी' },
  { id: '10', village: 'निमगाव केतकी',          date: '१७ जुलै (शुक्र)', distanceFromStart: '१५० किमी' },
  { id: '11', village: 'इंदापूर',               date: '१८ जुलै (शनि)', distanceFromStart: '१६५ किमी' },
  { id: '12', village: 'सराटी',                 date: '१९ जुलै (रवि)', distanceFromStart: '१८० किमी' },
  { id: '13', village: 'अकलूज',                 date: '२० जुलै (सोम)', distanceFromStart: '१९५ किमी' },
  { id: '14', village: 'बोरगाव',                date: '२१ जुलै (मंगळ)', distanceFromStart: '२१० किमी' },
  { id: '15', village: 'पिराची कुरोली',         date: '२२ जुलै (बुध)', distanceFromStart: '२२५ किमी' },
  { id: '16', village: 'वाखरी',                 date: '२३ जुलै (गुरु)', distanceFromStart: '२४० किमी' },
  { id: '17', village: 'पंढरपूर (आगमन)',        date: '२४ जुलै (शुक्र)', distanceFromStart: '२५० किमी' },
  { id: '18', village: 'नगर प्रदक्षिणा',         date: '२५ जुलै (शनि)', distanceFromStart: '२५० किमी' },
];
