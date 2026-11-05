import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = 'D:/Website Portofolio/kzn-visuals/public';

// 1. Strap / Band (1024 x 256)
const bandSvg = `
<svg width="1024" height="256" viewBox="0 0 1024 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#050811"/>
      <stop offset="50%" stop-color="#0a0f1d"/>
      <stop offset="100%" stop-color="#050811"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="256" fill="url(#bandGrad)"/>
  
  <!-- Cyber stitch lines -->
  <line x1="0" y1="18" x2="1024" y2="18" stroke="#00f0ff" stroke-width="3" stroke-opacity="0.3" stroke-dasharray="10,8"/>
  <line x1="0" y1="238" x2="1024" y2="238" stroke="#00f0ff" stroke-width="3" stroke-opacity="0.3" stroke-dasharray="10,8"/>
  
  <!-- Ribbon elements -->
  <g transform="translate(140, 128)">
    <rect x="-35" y="-35" width="70" height="70" rx="14" fill="#00f0ff" fill-opacity="0.15" stroke="#00f0ff" stroke-width="3"/>
    <text x="0" y="11" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="900" font-size="30" fill="#00f0ff">3D</text>
  </g>
  <text x="210" y="146" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="900" font-size="52" fill="#ffffff" letter-spacing="8">3D CARD</text>

  <g transform="translate(620, 128)">
    <rect x="-35" y="-35" width="70" height="70" rx="14" fill="#00f0ff" fill-opacity="0.15" stroke="#00f0ff" stroke-width="3"/>
    <text x="0" y="11" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="900" font-size="32" fill="#00f0ff">KZ</text>
  </g>
  <text x="690" y="146" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="900" font-size="52" fill="#ffffff" letter-spacing="8">KZN.VISUALS</text>
</svg>
`;

// 2. Card Front (1024 x 1440) - Exactly matching the user's screenshot and code.html
const cardFrontSvg = `
<svg width="1024" height="1440" viewBox="0 0 1024 1440" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Dark void gradient matching code.html: from-[#0c1629] via-[#091122] to-[#040813] -->
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0c1629"/>
      <stop offset="45%" stop-color="#091122"/>
      <stop offset="100%" stop-color="#040813"/>
    </linearGradient>

    <!-- Holographic glare gradient -->
    <linearGradient id="holoGlare" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="30%" stop-color="#00f0ff" stop-opacity="0.12"/>
      <stop offset="65%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05"/>
    </linearGradient>

    <radialGradient id="centerGlow" cx="50%" cy="40%" r="40%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#00f0ff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background Base -->
  <rect width="1024" height="1440" rx="48" fill="url(#bgGrad)"/>
  <rect width="1024" height="1440" rx="48" fill="url(#holoGlare)"/>
  
  <!-- Outer Tech Border -->
  <rect x="4" y="4" width="1016" height="1432" rx="44" fill="none" stroke="#00f0ff" stroke-width="3" stroke-opacity="0.5"/>
  <rect x="12" y="12" width="1000" height="1416" rx="38" fill="none" stroke="#00f0ff" stroke-width="1" stroke-opacity="0.2"/>

  <!-- Tech Corners -->
  <path d="M 16 50 L 16 16 L 50 16" fill="none" stroke="#00f0ff" stroke-width="6"/>
  <path d="M 1008 50 L 1008 16 L 974 16" fill="none" stroke="#00f0ff" stroke-width="6"/>
  <path d="M 16 1390 L 16 1424 L 50 1424" fill="none" stroke="#00f0ff" stroke-width="6"/>
  <path d="M 1008 1390 L 1008 1424 L 974 1424" fill="none" stroke="#00f0ff" stroke-width="6"/>

  <!-- Card Top Header (CREATIVE ID PASS / NO. KZN-2026-VFX) -->
  <g transform="translate(60, 110)">
    <circle cx="16" cy="16" r="10" fill="#00f0ff"/>
    <circle cx="16" cy="16" r="16" fill="none" stroke="#00f0ff" stroke-width="2" opacity="0.6"/>
    <text x="48" y="24" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="900" font-size="28" fill="#00f0ff" letter-spacing="4">CREATIVE ID PASS</text>
    
    <!-- Tag on right -->
    <rect x="660" y="-2" width="240" height="42" rx="10" fill="#000000" fill-opacity="0.6" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.15"/>
    <text x="780" y="26" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="700" font-size="20" fill="#94a3b8" letter-spacing="2">NO. KZN-2026-VFX</text>
  </g>

  <!-- Divider line -->
  <line x1="60" y1="180" x2="964" y2="180" stroke="#00f0ff" stroke-width="2" stroke-opacity="0.2"/>

  <!-- Center Photo Frame Container -->
  <g transform="translate(60, 220)">
    <!-- Inner box -->
    <rect width="904" height="660" rx="32" fill="#050811" stroke="#00f0ff" stroke-width="3" stroke-opacity="0.4"/>
    <rect width="904" height="660" rx="32" fill="url(#centerGlow)"/>

    <!-- Corner badges inside frame -->
    <g transform="translate(36, 40)">
      <rect width="180" height="44" rx="10" fill="#000000" fill-opacity="0.75" stroke="#00f0ff" stroke-width="1.5" stroke-opacity="0.4"/>
      <text x="90" y="28" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="800" font-size="18" fill="#00f0ff" letter-spacing="2">LEVEL 4 SENIOR</text>
    </g>

    <g transform="translate(688, 40)">
      <rect width="180" height="44" rx="10" fill="#000000" fill-opacity="0.75" stroke="#00f0ff" stroke-width="1.5" stroke-opacity="0.4"/>
      <text x="90" y="28" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="800" font-size="18" fill="#ffffff" letter-spacing="2">4K / 8K RAW</text>
    </g>

    <!-- Center Icon: Glowing Camera / Video Symbol -->
    <g transform="translate(452, 300)">
      <!-- Pulsing cyan outer rings -->
      <circle cx="0" cy="0" r="140" fill="#090e1a" stroke="#00f0ff" stroke-width="5" stroke-opacity="0.8"/>
      <circle cx="0" cy="0" r="160" fill="none" stroke="#00f0ff" stroke-width="2" stroke-dasharray="12,10" stroke-opacity="0.4"/>
      
      <!-- Video camera icon vector -->
      <g transform="translate(-54, -42) scale(4.5)">
        <rect x="1" y="5" width="15" height="14" rx="2" fill="none" stroke="#00f0ff" stroke-width="1.8"/>
        <polygon points="17,8 23,4 23,20 17,16" fill="#00f0ff"/>
        <circle cx="8.5" cy="12" r="3" fill="#00f0ff"/>
      </g>

      <!-- Verified check badge on icon bottom-right -->
      <circle cx="95" cy="95" r="30" fill="#14b8a6" stroke="#050811" stroke-width="6"/>
      <path d="M 85 95 L 92 102 L 106 88" fill="none" stroke="#050811" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>

    <!-- Title below icon -->
    <text x="452" y="540" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="900" font-size="32" fill="#bae6fd" letter-spacing="6">CREATIVE DIRECTOR</text>
    <text x="452" y="585" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="600" font-size="20" fill="#00f0ff" opacity="0.8" letter-spacing="4">POST-PRODUCTION SPECIALIST</text>
  </g>

  <!-- Identity Details -->
  <g transform="translate(70, 960)">
    <g>
      <text x="0" y="50" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="54" fill="#ffffff" letter-spacing="2">
        DAVIN <tspan fill="#00f0ff">ARDYAN</tspan>
      </text>
      
      <!-- Verified Pill -->
      <g transform="translate(680, 10)">
        <rect width="180" height="46" rx="23" fill="#14b8a6" fill-opacity="0.15" stroke="#14b8a6" stroke-width="2" stroke-opacity="0.6"/>
        <circle cx="30" cy="23" r="6" fill="#14b8a6"/>
        <text x="100" y="30" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="800" font-size="19" fill="#2dd4bf" letter-spacing="3">VERIFIED</text>
      </g>
    </g>

    <text x="0" y="105" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="30" fill="#cbd5e1" letter-spacing="1">Lead Video Editor &amp; VFX Specialist</text>
    <text x="0" y="150" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="500" font-size="24" fill="#64748b" letter-spacing="2">Unicam Studio • Film &amp; Commercial</text>
  </g>

  <!-- Divider line -->
  <line x1="60" y1="1200" x2="964" y2="1200" stroke="#00f0ff" stroke-width="2" stroke-opacity="0.2"/>

  <!-- Digital Barcode & QR Code Footer -->
  <g transform="translate(70, 1260)">
    <!-- Barcode lines -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="6" height="70" fill="#00f0ff"/>
      <rect x="12" y="0" width="3" height="70" fill="#00f0ff"/>
      <rect x="22" y="0" width="9" height="70" fill="#00f0ff"/>
      <rect x="38" y="0" width="3" height="70" fill="#00f0ff"/>
      <rect x="48" y="0" width="6" height="70" fill="#00f0ff"/>
      <rect x="62" y="0" width="12" height="70" fill="#00f0ff"/>
      <rect x="82" y="0" width="3" height="70" fill="#00f0ff"/>
      <rect x="92" y="0" width="9" height="70" fill="#00f0ff"/>
      <rect x="110" y="0" width="6" height="70" fill="#00f0ff"/>
      <rect x="124" y="0" width="3" height="70" fill="#00f0ff"/>
      <rect x="134" y="0" width="9" height="70" fill="#00f0ff"/>
      <rect x="150" y="0" width="14" height="70" fill="#00f0ff"/>
      <rect x="172" y="0" width="4" height="70" fill="#00f0ff"/>
      <rect x="184" y="0" width="8" height="70" fill="#00f0ff"/>
      <rect x="200" y="0" width="5" height="70" fill="#00f0ff"/>
      <rect x="214" y="0" width="10" height="70" fill="#00f0ff"/>
    </g>

    <text x="450" y="44" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="700" font-size="22" fill="#94a3b8" letter-spacing="4">SECURE • PASS 2026</text>

    <!-- QR Code Box -->
    <g transform="translate(790, -5)">
      <rect width="80" height="80" rx="14" fill="#00f0ff" fill-opacity="0.15" stroke="#00f0ff" stroke-width="2.5" stroke-opacity="0.6"/>
      <rect x="14" y="14" width="20" height="20" fill="#00f0ff"/>
      <rect x="46" y="14" width="20" height="20" fill="#00f0ff"/>
      <rect x="14" y="46" width="20" height="20" fill="#00f0ff"/>
      <rect x="46" y="46" width="12" height="12" fill="#00f0ff"/>
    </g>
  </g>
</svg>
`;

// 3. Card Back (1024 x 1440)
const cardBackSvg = `
<svg width="1024" height="1440" viewBox="0 0 1024 1440" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="backGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1224"/>
      <stop offset="100%" stop-color="#040813"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="1440" rx="48" fill="url(#backGrad)"/>
  <rect x="4" y="4" width="1016" height="1432" rx="44" fill="none" stroke="#00f0ff" stroke-width="2.5" stroke-opacity="0.3"/>

  <!-- Magnetic stripe -->
  <rect x="0" y="140" width="1024" height="150" fill="#020409"/>
  <line x1="0" y1="140" x2="1024" y2="140" stroke="#00f0ff" stroke-width="2" stroke-opacity="0.4"/>
  <line x1="0" y1="290" x2="1024" y2="290" stroke="#00f0ff" stroke-width="2" stroke-opacity="0.4"/>

  <!-- Watermark logo -->
  <g transform="translate(512, 750)" opacity="0.06">
    <text x="0" y="0" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="900" font-size="620" fill="#00f0ff">KZ</text>
  </g>

  <!-- Big QR Box on back -->
  <g transform="translate(180, 420)">
    <rect width="240" height="240" rx="24" fill="#050811" stroke="#00f0ff" stroke-width="3" stroke-opacity="0.6"/>
    <rect x="30" y="30" width="60" height="60" fill="#00f0ff"/>
    <rect x="40" y="40" width="40" height="40" fill="#050811"/>
    <rect x="150" y="30" width="60" height="60" fill="#00f0ff"/>
    <rect x="160" y="40" width="40" height="40" fill="#050811"/>
    <rect x="30" y="150" width="60" height="60" fill="#00f0ff"/>
    <rect x="40" y="160" width="40" height="40" fill="#050811"/>
    <rect x="120" y="120" width="30" height="30" fill="#00f0ff"/>
    <rect x="160" y="160" width="50" height="50" fill="#00f0ff"/>
  </g>

  <!-- Info text on back -->
  <g transform="translate(480, 480)">
    <text x="0" y="0" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="800" font-size="30" fill="#ffffff">SCAN FOR PORTFOLIO</text>
    <text x="0" y="45" font-family="system-ui, sans-serif" font-size="22" fill="#94a3b8">kzn.visuals • Creative Studio</text>
    <text x="0" y="85" font-family="'JetBrains Mono', monospace, sans-serif" font-size="18" fill="#00f0ff">www.kznvisuals.com</text>
    <text x="0" y="125" font-family="'JetBrains Mono', monospace, sans-serif" font-size="16" fill="#64748b">CH. JAKARTA / YOGYAKARTA</text>
  </g>

  <!-- Terms & security notice -->
  <g transform="translate(180, 780)">
    <rect width="664" height="280" rx="16" fill="#050811" stroke="#ffffff" stroke-width="1" stroke-opacity="0.08"/>
    <text x="30" y="45" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="700" font-size="18" fill="#00f0ff">AUTHORIZED CREDENTIAL CARD</text>
    <text x="30" y="90" font-family="system-ui, sans-serif" font-size="18" fill="#94a3b8">This pass is issued exclusively for verified post-production</text>
    <text x="30" y="120" font-family="system-ui, sans-serif" font-size="18" fill="#94a3b8">credits, film festivals, and industry client access.</text>
    <text x="30" y="170" font-family="'JetBrains Mono', monospace, sans-serif" font-size="16" fill="#64748b">ENCRYPTION: SHA-256 • SERIAL: 8849-2026-KZ</text>
    <text x="30" y="210" font-family="'JetBrains Mono', monospace, sans-serif" font-size="16" fill="#64748b">DIRECTOR PASS ID: #0088921</text>
  </g>

  <!-- Bottom chip -->
  <g transform="translate(512, 1260)">
    <text x="0" y="0" text-anchor="middle" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="700" font-size="20" fill="#00f0ff" letter-spacing="4">KZN.VISUALS CINEMATIC PASS 2026</text>
    <text x="0" y="35" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="#64748b">Designed to tell stories through visuals</text>
  </g>
</svg>
`;

async function generate() {
  console.log('Generating band.png...');
  await sharp(Buffer.from(bandSvg)).png().toFile(path.join(publicDir, 'band.png'));

  console.log('Generating card-front.png...');
  await sharp(Buffer.from(cardFrontSvg)).png().toFile(path.join(publicDir, 'card-front.png'));

  console.log('Generating card-back.png...');
  await sharp(Buffer.from(cardBackSvg)).png().toFile(path.join(publicDir, 'card-back.png'));

  console.log('Assets generated successfully!');
}

generate().catch(console.error);
