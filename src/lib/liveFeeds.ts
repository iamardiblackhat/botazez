/* Shared live TV feed list — used by LiveAlerts (TV News tab) and
   DashboardRow (TV News square). Verified live YouTube channel IDs. */

export interface LiveFeed {
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  url: string;
  category: 'mainstream' | 'finance' | 'government' | 'conflict';
  region: string;
}

export const BUILTIN_FEEDS: LiveFeed[] = [
  // ── North America ──
  { name: 'NBC News NOW', city: 'New York', country: 'US', lat: 40.759, lng: -73.980, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCeY0bbntWzzVIaj2z3QigXg&autoplay=1&mute=1', category: 'mainstream', region: 'americas' },
  { name: 'CBS News 24/7', city: 'New York', country: 'US', lat: 40.764, lng: -73.973, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC8p1vwvWtl6T73JiExfWs1g&autoplay=1&mute=1', category: 'mainstream', region: 'americas' },
  { name: 'ABC News Live', city: 'New York', country: 'US', lat: 40.763, lng: -73.979, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCBi2mrWuNuyYy4gbM6fU18Q&autoplay=1&mute=1', category: 'mainstream', region: 'americas' },
  { name: 'Bloomberg TV', city: 'New York', country: 'US', lat: 40.756, lng: -73.988, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC_vQ72b7v5n2938v9d5c80w&autoplay=1&mute=1', category: 'finance', region: 'americas' },
  { name: 'C-SPAN', city: 'Washington DC', country: 'US', lat: 38.897, lng: -77.036, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCb--64Gl51jIEVE-GLDAVTg&autoplay=1&mute=1', category: 'government', region: 'americas' },
  { name: 'CBC News', city: 'Toronto', country: 'CA', lat: 43.644, lng: -79.387, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCKy1dAqELon0zgzZPOz9SVw&autoplay=1&mute=1', category: 'mainstream', region: 'americas' },
  // ── Europe ──
  { name: 'Sky News', city: 'London', country: 'GB', lat: 51.500, lng: -0.118, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCoMdktPbSTixAyNGwb-UYkQ&autoplay=1&mute=1', category: 'mainstream', region: 'europe' },
  { name: 'France 24 EN', city: 'Paris', country: 'FR', lat: 48.830, lng: 2.280, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCQfwfsi5VrQ8yKZ-UWmAEFg&autoplay=1&mute=1', category: 'mainstream', region: 'europe' },
  { name: 'DW News', city: 'Berlin', country: 'DE', lat: 52.508, lng: 13.376, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCknLrEdhRCp1aegoMqRaCZg&autoplay=1&mute=1', category: 'mainstream', region: 'europe' },
  { name: 'Euronews', city: 'Lyon', country: 'FR', lat: 45.764, lng: 4.836, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCtUbOIRGKZkW7555n6x6q6g&autoplay=1&mute=1', category: 'mainstream', region: 'europe' },
  { name: 'TRT World', city: 'Istanbul', country: 'TR', lat: 41.008, lng: 28.978, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC7fWeaHZQg1p9-4v98L1D1A&autoplay=1&mute=1', category: 'mainstream', region: 'europe' },
  { name: 'UKRINFORM', city: 'Kyiv', country: 'UA', lat: 50.450, lng: 30.523, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCaDkCK6iFHPE0lmpaYL-WxQ&autoplay=1&mute=1', category: 'conflict', region: 'europe' },
  // ── Middle East ──
  { name: 'Al Jazeera EN', city: 'Doha', country: 'QA', lat: 25.286, lng: 51.534, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&mute=1', category: 'mainstream', region: 'middleeast' },
  { name: 'Al Mayadeen', city: 'Beirut', country: 'LB', lat: 33.8886, lng: 35.4955, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCZCFHCU-2eGF7V5ciMkoPHw&autoplay=1&mute=1', category: 'conflict', region: 'middleeast' },
  { name: 'LBCI Lebanon', city: 'Beirut', country: 'LB', lat: 33.8930, lng: 35.5018, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCpE6gpKewomi17XDyPfpFjA&autoplay=1&mute=1', category: 'mainstream', region: 'middleeast' },
  // ── Asia Pacific ──
  { name: 'NHK World', city: 'Tokyo', country: 'JP', lat: 35.690, lng: 139.692, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCSPEjw8F2nQDtmUKPFNF7_A&autoplay=1&mute=1', category: 'mainstream', region: 'asia' },
  { name: 'CNA 24/7', city: 'Singapore', country: 'SG', lat: 1.290, lng: 103.852, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC83jt4dlz1Gjl58fzQrrKZg&autoplay=1&mute=1', category: 'mainstream', region: 'asia' },
  { name: 'WION', city: 'New Delhi', country: 'IN', lat: 28.614, lng: 77.209, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC_gUM8rL-Lrg6O3adPW9K1g&autoplay=1&mute=1', category: 'mainstream', region: 'asia' },
  { name: 'Arirang', city: 'Seoul', country: 'KR', lat: 37.566, lng: 126.978, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCw9-5Y1CjW7Qy1Yf5q1y2-Q&autoplay=1&mute=1', category: 'mainstream', region: 'asia' },
  { name: 'ABC AU', city: 'Sydney', country: 'AU', lat: -33.868, lng: 151.209, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC5iLnYoF4Ryb63YdGD9RfWQ&autoplay=1&mute=1', category: 'mainstream', region: 'asia' },
  // ── Africa ──
  { name: 'Africanews', city: 'Pointe-Noire', country: 'CG', lat: -4.778, lng: 11.865, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC5T2fB_W0Z31T0c8yN36a8A&autoplay=1&mute=1', category: 'mainstream', region: 'africa' },
  { name: 'SABC News', city: 'Johannesburg', country: 'ZA', lat: -26.204, lng: 28.047, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC8yH-uI81UUtEMDsowQyx1g&autoplay=1&mute=1', category: 'mainstream', region: 'africa' },
  // ── Latin America ──
  { name: 'teleSUR EN', city: 'Caracas', country: 'VE', lat: 10.491, lng: -66.902, url: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCmuTmpLY35O3csvhyA6vrkg&autoplay=1&mute=1', category: 'mainstream', region: 'americas' },
];
