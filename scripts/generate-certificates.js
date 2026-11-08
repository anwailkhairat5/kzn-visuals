const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'certificates');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const certs = [
  {
    id: 'award-1',
    file: 'cert-qris.svg',
    issuer: 'BANK INDONESIA',
    subtitle: 'REGIONAL CREATIVE MEDIA COMPETITION',
    title: 'JUARA 1 — VIDEO REELS QRIS',
    recipient: 'Anwail Khairat',
    date: '2024',
    sealText: 'JUARA 1',
    sealColor: '#0284c7',
    primaryColor: '#0369a1',
    accentColor: '#38bdf8'
  },
  {
    id: 'award-2',
    file: 'cert-iqra.svg',
    issuer: 'IQRA USK & INTERNATIONAL COMMITTEE',
    subtitle: 'ISLAMIC INTERNATIONAL AWARD',
    title: 'JUARA 2 — INTERNATIONAL VIDEO REELS',
    recipient: 'Anwail Khairat',
    date: '2024',
    sealText: '2ND PLACE',
    sealColor: '#059669',
    primaryColor: '#047857',
    accentColor: '#34d399'
  },
  {
    id: 'award-3',
    file: 'cert-cimb.svg',
    issuer: 'PT BANK CIMB NIAGA TBK',
    subtitle: 'KOMPETISI VIDEO INSPIRATIF TINGKAT NASIONAL',
    title: 'JUARA FAVORIT SE-INDONESIA',
    recipient: 'Anwail Khairat',
    date: 'KARYA: AKU DAN MIMPIKU',
    sealText: 'FAVORIT',
    sealColor: '#be123c',
    primaryColor: '#9f1239',
    accentColor: '#fb7185'
  },
  {
    id: 'award-4',
    file: 'cert-gentar.svg',
    issuer: 'GENTAR MEDIA INDONESIA',
    subtitle: 'FESTIVAL KREATIF MILENIAL',
    title: 'JUARA 1 — VIDEO REELS KREATIVITAS MILENIAL',
    recipient: 'Anwail Khairat',
    date: '2024',
    sealText: 'JUARA 1',
    sealColor: '#7c3aed',
    primaryColor: '#6d28d9',
    accentColor: '#a78bfa'
  },
  {
    id: 'award-5',
    file: 'cert-kip.svg',
    issuer: 'KOMISI INDEPENDEN PEMILIHAN (KIP ACEH)',
    subtitle: 'FESTIVAL FILM PENDEK DEMOKRASI & INTEGRITAS',
    title: 'JUARA 1 — FILM PENDEK "MONEY POLITIC"',
    recipient: 'Anwail Khairat',
    date: '2024',
    sealText: 'JUARA 1',
    sealColor: '#d97706',
    primaryColor: '#b45309',
    accentColor: '#fbbf24'
  },
  {
    id: 'award-6',
    file: 'cert-pase.svg',
    issuer: 'BANK INDONESIA',
    subtitle: 'PASE FESTIVAL VIDEO COMPETITION',
    title: 'JUARA 1 — VIDEO REELS PASE FEST',
    recipient: 'Anwail Khairat',
    date: '2024',
    sealText: 'JUARA 1',
    sealColor: '#0284c7',
    primaryColor: '#075985',
    accentColor: '#38bdf8'
  },
  {
    id: 'award-7',
    file: 'cert-cbp.svg',
    issuer: 'BANK INDONESIA',
    subtitle: 'AJANG PEMILIHAN DUTA KONTEN KREATIF',
    title: 'JUARA 1 — DUTA CONTENT CREATOR CBP RUPIAH',
    recipient: 'Anwail Khairat',
    date: '2024',
    sealText: 'DUTA 1',
    sealColor: '#0891b2',
    primaryColor: '#0e7490',
    accentColor: '#22d3ee'
  },
  {
    id: 'award-8',
    file: 'cert-toefl.svg',
    issuer: 'STANDARDIZED ENGLISH PROFICIENCY TEST',
    subtitle: 'INSTITUTIONAL TESTING PROGRAM (ITP)',
    title: 'CERTIFICATE OF ENGLISH PROFICIENCY (SCORE 400)',
    recipient: 'Anwail Khairat',
    date: '2026',
    sealText: 'VERIFIED',
    sealColor: '#4f46e5',
    primaryColor: '#4338ca',
    accentColor: '#818cf8'
  }
];

function generateSVG(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="bg-${c.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbfcfd"/>
      <stop offset="100%" stop-color="#edf2f7"/>
    </linearGradient>
    <linearGradient id="sealGrad-${c.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c.accentColor}"/>
      <stop offset="100%" stop-color="${c.primaryColor}"/>
    </linearGradient>
    <filter id="shadow-${c.id}" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="500" rx="16" fill="url(#bg-${c.id})"/>
  
  <!-- Outer Border Frame -->
  <rect x="20" y="20" width="760" height="460" rx="12" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>
  <rect x="28" y="28" width="744" height="444" rx="8" fill="none" stroke="${c.primaryColor}" stroke-width="2" stroke-opacity="0.35" stroke-dasharray="12 4"/>

  <!-- Top Accent Header Bar -->
  <path d="M28 36 Q 400 44 772 36" fill="none" stroke="${c.primaryColor}" stroke-width="3" stroke-linecap="round"/>

  <!-- Issuer -->
  <text x="400" y="80" text-anchor="middle" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="${c.primaryColor}" letter-spacing="3.5">${c.issuer}</text>
  <text x="400" y="102" text-anchor="middle" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="600" fill="#64748b" letter-spacing="1.5">${c.subtitle}</text>

  <!-- Certificate Heading -->
  <text x="400" y="148" text-anchor="middle" font-family="'Georgia', serif" font-size="24" font-weight="bold" fill="#0f172a" letter-spacing="2">CERTIFICATE OF ACHIEVEMENT</text>
  <line x1="280" y1="162" x2="520" y2="162" stroke="${c.accentColor}" stroke-width="2" stroke-linecap="round"/>

  <!-- Recipient Lead -->
  <text x="400" y="194" text-anchor="middle" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="11.5" font-style="italic" fill="#64748b">Diberikan Dengan Bangga Kepada :</text>

  <!-- Recipient Name -->
  <text x="400" y="240" text-anchor="middle" font-family="'Georgia', serif" font-size="32" font-weight="bold" fill="#0284c7" letter-spacing="1">${c.recipient}</text>
  <line x1="220" y1="254" x2="580" y2="254" stroke="#94a3b8" stroke-width="1"/>

  <!-- Title Award -->
  <text x="400" y="288" text-anchor="middle" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="13" font-style="italic" fill="#475569">Atas Prestasi Membanggakan Sebagai :</text>
  <text x="400" y="320" text-anchor="middle" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="#0f172a" letter-spacing="0.5">${c.title}</text>

  <!-- Date / Period -->
  <text x="400" y="348" text-anchor="middle" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#64748b" letter-spacing="1">TAHUN / PERIODE: ${c.date}</text>

  <!-- Gold / Rosette Seal (Right Side) -->
  <g transform="translate(640, 375)" filter="url(#shadow-${c.id})">
    <!-- Ribbon tails -->
    <path d="M-12 18 L-22 68 L-2 56 L12 68 L2 18 Z" fill="${c.primaryColor}" opacity="0.9"/>
    <path d="M2 18 L-8 68 L12 56 L26 68 L16 18 Z" fill="${c.accentColor}" opacity="0.9"/>
    <!-- Seal Medallion -->
    <circle cx="0" cy="0" r="38" fill="url(#sealGrad-${c.id})"/>
    <circle cx="0" cy="0" r="32" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 2"/>
    <text x="0" y="-4" text-anchor="middle" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" fill="#ffffff" letter-spacing="1">${c.sealText}</text>
    <text x="0" y="12" text-anchor="middle" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#ffffff" letter-spacing="0.5">OFFICIAL</text>
  </g>

  <!-- Signature Lines (Left Side) -->
  <g transform="translate(120, 395)">
    <path d="M 0 -15 Q 30 -35 50 -10 T 110 -25" fill="none" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="-10" y1="5" x2="130" y2="5" stroke="#94a3b8" stroke-width="1"/>
    <text x="60" y="20" text-anchor="middle" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="700" fill="#334155">KOMITE PENYELENGGARA</text>
    <text x="60" y="32" text-anchor="middle" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="8.5" fill="#64748b">Tanda Tangan &amp; Cap Sah</text>
  </g>
</svg>`;
}

certs.forEach(c => {
  const filePath = path.join(dir, c.file);
  fs.writeFileSync(filePath, generateSVG(c), 'utf8');
  console.log('Saved certificate SVG to', filePath);
});

console.log('All 8 certificates generated successfully!');
