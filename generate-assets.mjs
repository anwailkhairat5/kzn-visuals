import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = 'D:/Website Portofolio/kzn-visuals/public';

// 1. Strap / Band (1024 x 256) - Exactly like in Davin's screenshot ("3D CARD   3D CARD")
const bandSvg = `
<svg width="1024" height="256" viewBox="0 0 1024 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="256" fill="#080c14"/>
  <!-- Stitch lines -->
  <line x1="0" y1="16" x2="1024" y2="16" stroke="#1e293b" stroke-width="4" stroke-dasharray="8,6"/>
  <line x1="0" y1="240" x2="1024" y2="240" stroke="#1e293b" stroke-width="4" stroke-dasharray="8,6"/>
  
  <!-- Repeated 3D CARD + KZN text exactly like reference -->
  <g transform="translate(140, 128)">
    <circle cx="0" cy="0" r="32" fill="#0284c7"/>
    <text x="0" y="10" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#ffffff">3D</text>
  </g>
  <text x="210" y="144" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="52" fill="#ffffff" letter-spacing="6">3D CARD</text>

  <g transform="translate(620, 128)">
    <circle cx="0" cy="0" r="32" fill="#0284c7"/>
    <text x="0" y="10" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#ffffff">K</text>
  </g>
  <text x="690" y="144" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="52" fill="#ffffff" letter-spacing="6">KZN.VISUALS</text>
</svg>
`;

// 2. Card Front (1024 x 1440) - Modeled faithfully after Davin's Pass in the screenshot
const cardFrontSvg = `
<svg width="1024" height="1440" viewBox="0 0 1024 1440" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Cyan-Blue gradient background matching Davin's card -->
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="25%" stop-color="#0369a1"/>
      <stop offset="60%" stop-color="#073b61"/>
      <stop offset="90%" stop-color="#04182b"/>
      <stop offset="100%" stop-color="#020b14"/>
    </linearGradient>

    <!-- Glowing cyan spotlight in upper-center -->
    <radialGradient id="spotlight" cx="50%" cy="38%" r="45%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="#0284c7" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
    </radialGradient>

    <!-- Golden/cyan badge gradient -->
    <linearGradient id="badgeGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>

  <!-- Card Body -->
  <rect width="1024" height="1440" rx="42" fill="url(#cardGrad)"/>
  <rect width="1024" height="1440" rx="42" fill="url(#spotlight)"/>
  <rect width="1018" height="1434" x="3" y="3" rx="39" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-opacity="0.5"/>

  <!-- Top Left: Studio Logo (matching the Ruangguru placement in screenshot) -->
  <g transform="translate(180, 80)">
    <text x="0" y="16" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" fill="#ffffff" letter-spacing="1">kzn.</text>
    <text x="68" y="16" font-family="system-ui, -apple-system, sans-serif" font-weight="300" font-size="34" fill="#7dd3fc" letter-spacing="1">visuals</text>
    <text x="0" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#bae6fd" letter-spacing="4">STUDIO PASS</text>
  </g>

  <!-- Top Right: Event / Season Crest (matching Clash of Champions tag) -->
  <g transform="translate(860, 75)">
    <text x="0" y="10" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="18" fill="#e0f2fe" letter-spacing="2">CREATIVE PRODUCER</text>
    <text x="0" y="32" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="13" fill="#7dd3fc" letter-spacing="3">SEASON 2026</text>
  </g>

  <!-- Center Portrait Area (Stylized Director Silhouette with Cinema Lighting) -->
  <g transform="translate(512, 530)">
    <!-- Ambient head glow -->
    <ellipse cx="0" cy="20" rx="240" ry="260" fill="#38bdf8" opacity="0.18"/>
    
    <!-- Stylized modern camera / director icon portrait -->
    <circle cx="0" cy="-60" r="110" fill="#041628" stroke="#38bdf8" stroke-width="4"/>
    <!-- Head / Hair silhouette -->
    <path d="M-70,-70 Q0,-160 70,-70 Q90,-20 70,30 Q0,50 -70,30 Z" fill="#031020"/>
    
    <!-- Modern glasses (matching Davin's glasses in screenshot) -->
    <rect x="-65" y="-70" width="55" height="36" rx="8" fill="none" stroke="#38bdf8" stroke-width="6"/>
    <rect x="10" y="-70" width="55" height="36" rx="8" fill="none" stroke="#38bdf8" stroke-width="6"/>
    <line x1="-10" y1="-52" x2="10" y2="-52" stroke="#38bdf8" stroke-width="5"/>

    <!-- Shoulders & Green/Cyan Blazer (matching the green jacket in screenshot) -->
    <path d="M-220,240 C-200,120 -110,60 0,60 C110,60 200,120 220,240 Z" fill="#064e3b" stroke="#047857" stroke-width="4"/>
    <!-- Inner shirt & collar -->
    <polygon points="0,60 -40,160 40,160" fill="#f8fafc"/>
    <polygon points="0,90 -20,160 20,160" fill="#0f172a"/>
  </g>

  <!-- Big Signature Script Name (exactly like "Davin" in reference image) -->
  <g transform="translate(512, 950)">
    <!-- Signature text in white with soft glow -->
    <text x="0" y="0" text-anchor="middle" font-family="'Brush Script MT', 'Segoe Script', cursive, sans-serif" font-style="italic" font-weight="700" font-size="118" fill="#ffffff" letter-spacing="1">kzn.visuals</text>
    
    <!-- Organization / Studio Name below signature -->
    <text x="0" y="48" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="24" fill="#e0f2fe" letter-spacing="4">VISUAL DIRECTOR &amp; CINEMATOGRAPHER</text>
    <text x="0" y="80" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" fill="#7dd3fc" letter-spacing="2">INDONESIA • CREATIVE PRODUCTION</text>
  </g>

  <!-- Bottom verification footer and badges -->
  <g transform="translate(512, 1260)">
    <!-- Thin glowing line -->
    <line x1="-360" y1="-40" x2="360" y2="-40" stroke="#38bdf8" stroke-width="2" opacity="0.4"/>

    <text x="0" y="0" text-anchor="middle" font-family="monospace" font-size="17" fill="#7dd3fc" letter-spacing="3">OFFICIAL PASS • CHAPTER JAKARTA ID</text>
    
    <!-- Small social / channel icon badges at bottom -->
    <g transform="translate(0, 32)">
      <rect x="-60" y="-14" width="36" height="28" rx="6" fill="#0284c7"/>
      <text x="-42" y="5" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#ffffff">4K</text>

      <rect x="-10" y="-14" width="36" height="28" rx="6" fill="#0369a1"/>
      <text x="8" y="5" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#ffffff">RAW</text>

      <rect x="40" y="-14" width="36" height="28" rx="6" fill="#0f766e"/>
      <text x="58" y="5" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="13" fill="#ffffff">3D</text>
    </g>
  </g>
</svg>
`;

// 3. Card Back (1024 x 1440)
const cardBackSvg = `
<svg width="1024" height="1440" viewBox="0 0 1024 1440" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="backGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#021226"/>
      <stop offset="100%" stop-color="#01060e"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="1440" rx="42" fill="url(#backGrad)"/>
  <rect width="1018" height="1434" x="3" y="3" rx="39" fill="none" stroke="#1e3a8a" stroke-width="3"/>

  <!-- Magnetic Stripe -->
  <rect x="0" y="160" width="1024" height="150" fill="#020617"/>
  <line x1="0" y1="160" x2="1024" y2="160" stroke="#0284c7" stroke-width="2"/>
  <line x1="0" y1="310" x2="1024" y2="310" stroke="#0284c7" stroke-width="2"/>

  <!-- Watermark -->
  <g transform="translate(512, 780)" opacity="0.05">
    <text x="0" y="0" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="640" fill="#38bdf8">K</text>
  </g>

  <!-- QR Code box -->
  <g transform="translate(160, 420)">
    <rect width="210" height="210" rx="18" fill="#082f49" stroke="#38bdf8" stroke-width="2"/>
    <rect x="20" y="20" width="55" height="55" fill="#38bdf8"/>
    <rect x="30" y="30" width="35" height="35" fill="#082f49"/>
    <rect x="135" y="20" width="55" height="55" fill="#38bdf8"/>
    <rect x="145" y="30" width="35" height="35" fill="#082f49"/>
    <rect x="20" y="135" width="55" height="55" fill="#38bdf8"/>
    <rect x="30" y="145" width="35" height="35" fill="#082f49"/>
    <rect x="95" y="35" width="20" height="60" fill="#38bdf8"/>
    <rect x="95" y="115" width="40" height="20" fill="#38bdf8"/>
    <rect x="155" y="115" width="35" height="40" fill="#38bdf8"/>

    <g transform="translate(250, 30)">
      <text x="0" y="30" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#ffffff">VERIFIED PORTFOLIO</text>
      <text x="0" y="65" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="20" fill="#93c5fd">Official creative credentials &amp; reels</text>
      <text x="0" y="118" font-family="monospace" font-size="22" fill="#38bdf8">kznvisuals.com</text>
    </g>
  </g>

  <!-- Terms -->
  <g transform="translate(160, 720)">
    <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20" fill="#60a5fa" letter-spacing="2">STUDIO TERMS</text>
    <text x="0" y="38" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="18" fill="#94a3b8">1. Pass grants executive visual production &amp; studio booking.</text>
    <text x="0" y="72" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="18" fill="#94a3b8">2. Commercial inquiries &amp; direction: info@kznvisuals.com</text>
    <text x="0" y="106" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="18" fill="#94a3b8">3. Produced &amp; directed by kzn.visuals creative network.</text>
  </g>

  <!-- Signature line -->
  <g transform="translate(160, 940)">
    <line x1="0" y1="80" x2="420" y2="80" stroke="#1e3a8a" stroke-width="2"/>
    <text x="0" y="115" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16" fill="#64748b" letter-spacing="1">DIRECTOR SIGNATURE</text>
    <text x="30" y="60" font-family="'Brush Script MT', 'Segoe Script', cursive, sans-serif" font-style="italic" font-size="48" fill="#38bdf8">kzn.visuals</text>
  </g>

  <rect x="160" y="1260" width="704" height="2" fill="#1e293b"/>
  <text x="512" y="1320" text-anchor="middle" font-family="monospace" font-size="18" fill="#64748b">ID: KZN-2026-BL-09</text>
</svg>
`;

async function generate() {
  console.log('Rendering reference-matching band.png...');
  await sharp(Buffer.from(bandSvg))
    .png()
    .toFile(path.join(publicDir, 'band.png'));

  console.log('Rendering reference-matching card-front.png...');
  await sharp(Buffer.from(cardFrontSvg))
    .png()
    .toFile(path.join(publicDir, 'card-front.png'));

  console.log('Rendering reference-matching card-back.png...');
  await sharp(Buffer.from(cardBackSvg))
    .png()
    .toFile(path.join(publicDir, 'card-back.png'));

  console.log('Done! Reference matching assets generated.');
}

generate().catch(console.error);
