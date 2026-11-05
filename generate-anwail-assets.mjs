import sharp from 'sharp';
import path from 'path';

const publicDir = 'D:/Website Portofolio/kzn-visuals/public';

// 1. Strap / Band (1024 x 256)
const bandSvg = `
<svg width="1024" height="256" viewBox="0 0 1024 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="256" fill="#04050d"/>
  
  <!-- Subtle stitch lines -->
  <line x1="0" y1="18" x2="1024" y2="18" stroke="#18d3ff" stroke-width="3" stroke-opacity="0.35" stroke-dasharray="10,8"/>
  <line x1="0" y1="238" x2="1024" y2="238" stroke="#18d3ff" stroke-width="3" stroke-opacity="0.35" stroke-dasharray="10,8"/>
  
  <!-- Repeated 3D CARD + ANWAIL text -->
  <g transform="translate(140, 128)">
    <circle cx="0" cy="0" r="32" fill="#6d6bf5"/>
    <text x="0" y="10" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="28" fill="#ffffff">3D</text>
  </g>
  <text x="210" y="146" font-family="'Inter', sans-serif" font-weight="800" font-size="52" fill="#ffffff" letter-spacing="8">3D CARD</text>

  <g transform="translate(620, 128)">
    <circle cx="0" cy="0" r="32" fill="#18d3ff"/>
    <text x="0" y="10" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="28" fill="#04050d">A</text>
  </g>
  <text x="690" y="146" font-family="'Inter', sans-serif" font-weight="800" font-size="52" fill="#ffffff" letter-spacing="8">ANWAIL.STUDIO</text>
</svg>
`;

// 2. Card Front (1024 x 1440) - Modeled after user's HTML card spec
const cardFrontSvg = `
<svg width="1024" height="1440" viewBox="0 0 1024 1440" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background linear gradient from user HTML: #16a6c6 -> #0d6f9d -> #0a2d5a -> #050a1c -->
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#16a6c6"/>
      <stop offset="38%" stop-color="#0d6f9d"/>
      <stop offset="72%" stop-color="#0a2d5a"/>
      <stop offset="100%" stop-color="#050a1c"/>
    </linearGradient>

    <!-- Glowing spotlight -->
    <radialGradient id="spotlight" cx="50%" cy="35%" r="48%">
      <stop offset="0%" stop-color="#18d3ff" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#0d6f9d" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Card Base -->
  <rect width="1024" height="1440" rx="46" fill="url(#cardGrad)"/>
  <rect width="1024" height="1440" rx="46" fill="url(#spotlight)"/>
  <rect x="4" y="4" width="1016" height="1432" rx="42" fill="none" stroke="#18d3ff" stroke-width="3" stroke-opacity="0.45"/>

  <!-- Top Header: ANWAIL.STUDIO | PASS 2026 -->
  <g transform="translate(64, 90)">
    <text x="0" y="24" font-family="'Inter', sans-serif" font-weight="800" font-size="28" fill="#ffffff" letter-spacing="4" opacity="0.95">ANWAIL.STUDIO</text>
    <text x="896" y="24" text-anchor="end" font-family="'Inter', sans-serif" font-weight="700" font-size="28" fill="#18d3ff" letter-spacing="4" opacity="0.95">PASS 2026</text>
  </g>

  <!-- Divider line -->
  <line x1="64" y1="150" x2="960" y2="150" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.2"/>

  <!-- Center Portrait Graphic (Styled from user HTML SVG) -->
  <g transform="translate(512, 540)">
    <!-- Ambient circular glow -->
    <circle cx="0" cy="0" r="230" fill="#18d3ff" opacity="0.12"/>

    <!-- Head / Hair -->
    <circle cx="0" cy="-60" r="140" fill="#06142e" stroke="#18d3ff" stroke-width="4"/>

    <!-- Eyeglasses from user SVG -->
    <rect x="-120" y="-85" width="100" height="66" rx="28" fill="none" stroke="#18d3ff" stroke-width="9"/>
    <rect x="20" y="-85" width="100" height="66" rx="28" fill="none" stroke="#18d3ff" stroke-width="9"/>
    <line x1="-20" y1="-52" x2="20" y2="-52" stroke="#18d3ff" stroke-width="8"/>

    <!-- Green Jacket / Blazer & Tie -->
    <path d="M-360,420 C-330,220 -180,130 0,130 C180,130 330,220 360,420 Z" fill="#0f5a45" stroke="#18d3ff" stroke-width="3"/>
    <polygon points="0,130 -60,240 60,240" fill="#e8eefc"/>
    <polygon points="0,170 -25,240 25,240" fill="#0a2d5a"/>
  </g>

  <!-- Big Signature Script Name (Anwail) -->
  <g transform="translate(512, 1080)">
    <text x="0" y="0" text-anchor="middle" font-family="'Allura', 'Brush Script MT', 'Segoe Script', cursive" font-size="160" fill="#ffffff" letter-spacing="2">Anwail</text>
  </g>

  <!-- Institution Name -->
  <g transform="translate(512, 1220)">
    <text x="0" y="0" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="800" font-size="28" fill="#e8eefc" letter-spacing="5">POLITEKNIK NEGERI LHOKSEUMAWE</text>
    <text x="0" y="44" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="600" font-size="20" fill="#18d3ff" letter-spacing="3">MULTIMEDIA ENGINEERING</text>
  </g>

  <!-- Subtle bottom decorative line -->
  <line x1="200" y1="1310" x2="824" y2="1310" stroke="#18d3ff" stroke-width="2" stroke-opacity="0.35"/>
  <circle cx="512" cy="1310" r="5" fill="#18d3ff"/>
</svg>
`;

// 3. Card Back (1024 x 1440)
const cardBackSvg = `
<svg width="1024" height="1440" viewBox="0 0 1024 1440" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="backGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1836"/>
      <stop offset="100%" stop-color="#04050d"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="1440" rx="46" fill="url(#backGrad)"/>
  <rect x="4" y="4" width="1016" height="1432" rx="42" fill="none" stroke="#18d3ff" stroke-width="2.5" stroke-opacity="0.3"/>

  <!-- Magnetic Stripe -->
  <rect x="0" y="140" width="1024" height="150" fill="#020409"/>
  <line x1="0" y1="140" x2="1024" y2="140" stroke="#18d3ff" stroke-width="2" stroke-opacity="0.35"/>
  <line x1="0" y1="290" x2="1024" y2="290" stroke="#18d3ff" stroke-width="2" stroke-opacity="0.35"/>

  <!-- Watermark logo -->
  <g transform="translate(512, 750)" opacity="0.05">
    <text x="0" y="0" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="640" fill="#ffffff">A</text>
  </g>

  <!-- QR Code Box -->
  <g transform="translate(180, 420)">
    <rect width="240" height="240" rx="24" fill="#050a1c" stroke="#18d3ff" stroke-width="3" stroke-opacity="0.6"/>
    <rect x="30" y="30" width="60" height="60" fill="#18d3ff"/>
    <rect x="40" y="40" width="40" height="40" fill="#050a1c"/>
    <rect x="150" y="30" width="60" height="60" fill="#18d3ff"/>
    <rect x="160" y="40" width="40" height="40" fill="#050a1c"/>
    <rect x="30" y="150" width="60" height="60" fill="#18d3ff"/>
    <rect x="40" y="160" width="40" height="40" fill="#050a1c"/>
    <rect x="120" y="120" width="30" height="30" fill="#18d3ff"/>
    <rect x="160" y="160" width="50" height="50" fill="#18d3ff"/>
  </g>

  <!-- QR Info -->
  <g transform="translate(480, 480)">
    <text x="0" y="0" font-family="'Inter', sans-serif" font-weight="800" font-size="30" fill="#ffffff">STUDENT ID CARD</text>
    <text x="0" y="45" font-family="'Inter', sans-serif" font-size="22" fill="#aab3d1">Anwail · Portfolio</text>
    <text x="0" y="85" font-family="'Inter', sans-serif" font-size="18" fill="#18d3ff">Teknologi Rekayasa Multimedia</text>
    <text x="0" y="125" font-family="'Inter', sans-serif" font-size="16" fill="#64748b">LHOKSEUMAWE, ACEH</text>
  </g>

  <!-- Credentials statement -->
  <g transform="translate(180, 780)">
    <rect width="664" height="280" rx="16" fill="#050a1c" stroke="#ffffff" stroke-width="1" stroke-opacity="0.1"/>
    <text x="30" y="48" font-family="'Inter', sans-serif" font-weight="700" font-size="18" fill="#18d3ff">OFFICIAL CREATIVE PASS</text>
    <text x="30" y="94" font-family="'Inter', sans-serif" font-size="18" fill="#aab3d1">Politeknik Negeri Lhokseumawe</text>
    <text x="30" y="126" font-family="'Inter', sans-serif" font-size="18" fill="#aab3d1">Jurusan Teknologi Informasi dan Komputer</text>
    <text x="30" y="174" font-family="'Inter', sans-serif" font-size="16" fill="#64748b">ID: #PNL-2026-TRM-ANWAIL</text>
    <text x="30" y="212" font-family="'Inter', sans-serif" font-size="16" fill="#64748b">VALID: 2026 / 2027</text>
  </g>

  <g transform="translate(512, 1260)">
    <text x="0" y="0" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="700" font-size="20" fill="#18d3ff" letter-spacing="4">ANWAIL.STUDIO</text>
    <text x="0" y="35" text-anchor="middle" font-family="'Inter', sans-serif" font-size="16" fill="#64748b">3D Production &amp; Multimedia Portfolio</text>
  </g>
</svg>
`;

async function run() {
  await sharp(Buffer.from(bandSvg)).png().toFile(path.join(publicDir, 'band.png'));
  await sharp(Buffer.from(cardFrontSvg)).png().toFile(path.join(publicDir, 'card-front.png'));
  await sharp(Buffer.from(cardBackSvg)).png().toFile(path.join(publicDir, 'card-back.png'));
  console.log('Anwail assets generated successfully!');
}

run().catch(console.error);
