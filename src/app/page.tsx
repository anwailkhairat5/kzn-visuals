'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import initialConfig from '@/data/portfolio-config.json';
import { parseMediaUrl } from '@/utils/mediaParser';

const Lanyard = dynamic(() => import('@/components/Lanyard'), { ssr: false });
const DarkVeil = dynamic(() => import('@/components/DarkVeil'), { ssr: false });
const GooeyNav = dynamic(() => import('@/components/GooeyNav'), { ssr: false });
const DepthText = dynamic(() => import('@/components/DepthText'), { ssr: false });
const ProfileCard = dynamic(() => import('@/components/ProfileCard'), { ssr: false });

const NAV_ITEMS = [
  { label: 'Home', shortLabel: 'Home', href: '#home', id: 'home' },
  { label: 'About', shortLabel: 'About', href: '#about', id: 'about' },
  { label: 'Skills', shortLabel: 'Skills', href: '#skills', id: 'skills' },
  { label: 'Projects', shortLabel: 'Projects', href: '#projects', id: 'projects' },
  { label: 'Experience', shortLabel: 'Exp', href: '#experience', id: 'experience' },
  { label: 'Certificates', shortLabel: 'Certs', href: '#certificates', id: 'certificates' },
  { label: 'Contact', shortLabel: 'Contact', href: '#contact', id: 'contact' },
];

export default function Home() {
  const [config, setConfig] = useState(initialConfig);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [activeMediaProject, setActiveMediaProject] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 1024);
    checkMobile();

    window.addEventListener('resize', checkMobile);

    // Instant local cache check for administrator view
    try {
      const cached = localStorage.getItem('kzn_portfolio_config');
      if (cached) {
        setConfig(JSON.parse(cached));
      }
    } catch {}

    // Fetch live config from cloud/admin with cache-busting
    fetch('/api/admin/config?t=' + Date.now(), { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setConfig(json.data);
          try {
            localStorage.setItem('kzn_portfolio_config', JSON.stringify(json.data));
          } catch {}
        }
      })
      .catch(() => {});

    // Listen for real-time config updates from Admin preview
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'KZN_PREVIEW_CONFIG' && event.data?.config) {
        setConfig(event.data.config);
      }
    };
    window.addEventListener('message', handleMessage);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'kzn_portfolio_config' && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Shortcut: Ctrl+Shift+A or Alt+A to jump straight to Admin
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) || (e.altKey && (e.key === 'a' || e.key === 'A'))) {
        e.preventDefault();
        window.location.href = '/admin';
      }
      if (e.key === 'Escape') {
        setActiveMediaProject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const sections = document.querySelectorAll('header[id], section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-40% 0px -50% 0px' }
    );

    sections.forEach((s) => observer.observe(s));

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('keydown', handleKeyDown);
      sections.forEach((s) => observer.unobserve(s));
    };
  }, []);

  return (
    <div className="relative min-h-screen text-[#f4f6ff]">
      {/* ── INTERACTIVE DARKVEIL WEBGL BACKGROUND ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {mounted && (
          <DarkVeil
            color={config.theme?.primaryColor || '#2f77ff'}
            speed={config.theme?.veilSpeed ?? 0.45}
            scale={1}
            rotation={0}
            flow={1.1}
            warp={0.05}
            variation={0}
            sheen={0.25}
            glow={config.theme?.veilGlow ?? 0.55}
            brightness={config.theme?.veilBrightness ?? 1.15}
            grain={0.02}
            quality={0.6}
            fade={0}
            opacity={1}
            mouseInteraction={config.theme?.mouseInteraction ?? true}
            mouseStrength={1.15}
            intro={true}
            lightMode={false}
          />
        )}
        {/* Soft atmospheric gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#04050d]/15 via-transparent to-[#04050d]/45 pointer-events-none" />
      </div>

      {/* ── NAVIGATION ── */}
      <nav className="site-nav" aria-label="Menu utama">
        <div className="wrap">
          <a className="logo" href="#home">
            {config.general?.brandLogo || 'Anwail Khairat'}<i>.</i>
          </a>

          {/* ── GOOEY SVG LIQUID PILL NAVIGATION ── */}
          <div className="nav-gooey-wrapper">
            {mounted && (
              <GooeyNav
                items={NAV_ITEMS}
                activeIndex={Math.max(
                  0,
                  NAV_ITEMS.findIndex((item) => item.id === activeSection)
                )}
                theme="dark"
                size={isMobile ? 'sm' : 'md'}
                frame={true}
                particleCount={16}
                spread={isMobile ? Math.min(34, Math.round((config.gooeyNav?.spread ?? 48) * 0.7)) : (config.gooeyNav?.spread ?? 48)}
                animationTime={500}
                timeVariance={250}
                gooeyness={config.gooeyNav?.gooeyness ?? 0.55}
                wobble={0.4}
                color={config.gooeyNav?.color || '#2f77ff'}
                activeTextColor={config.gooeyNav?.activeTextColor || '#ffffff'}
                colors={config.gooeyNav?.colors || ['#18d3ff', '#2f77ff', '#8b5cf6', '#38bdf8']}
                hoverEffect={true}
                onChange={(index, item) => {
                  if (item?.href) {
                    const target = document.querySelector(item.href);
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main>
        {/* ── HERO SECTION ── */}
        <header className="wrap hero" id="home">
          {/* ── 1. 3D LANYARD CARD (MUNCUL PERTAMA DI PALING ATAS PADA MOBILE & IPAD) ── */}
          <div className="stage" id="stage">
            {mounted && (
              <div className="w-full h-full relative">
                <Lanyard
                  frontImage={config.lanyard?.frontImage || '/card-front.png'}
                  backImage={config.lanyard?.backImage || '/card-back.png'}
                  strapImage={config.lanyard?.strapImage || '/band.png'}
                  imageFit="cover"
                  cardColor={config.lanyard?.cardColor || '#0d6f9d'}
                  orientation="portrait"
                  finish={(config.lanyard?.finish as any) || 'glossy'}
                  cornerRadius={0.3}
                  size={isMobile ? (config.lanyard?.cardSizeMobile ?? 0.52) : (config.lanyard?.cardSizeDesktop ?? 0.38)}
                  anchor={isMobile ? 'center' : (config.lanyard?.anchorDesktop ?? 0.82)}
                  strapLength={isMobile ? (config.lanyard?.strapLengthMobile ?? 0.34) : (config.lanyard?.strapLengthDesktop ?? 0.28)}
                  strapColor={config.lanyard?.strapColor || '#04050d'}
                  strapWidth={0.65}
                  metal="silver"
                  gravity={config.lanyard?.gravity ?? 1}
                  damping={config.lanyard?.damping ?? 0.5}
                  elasticity={config.lanyard?.elasticity ?? 0.5}
                  breeze={config.lanyard?.breeze ?? 0.4}
                  interactive={true}
                  intro={true}
                />
              </div>
            )}
          </div>

          {/* ── 2. INDIKATOR PANDUAN SCROLL DI MOBILE & IPAD ── */}
          <div className="mobile-scroll-hint">
            <span>Geser kartu 3D • Scroll ke bawah untuk info</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* ── 3. TEKS HERO (MUNCUL SETELAH SCROLL KE BAWAH PADA MOBILE & IPAD) ── */}
          <div className="hero-content">
            <div className="eyebrow">{config.general?.eyebrow || 'WELCOME TO MY PORTFOLIO'}</div>
            <h1 className="hero-heading">
              <span className="hero-greeting">Hi, I’m</span>
              <span className="hero-name-wrapper">
                {mounted ? (
                  <DepthText
                    text={config.depthText?.text || 'Anwail Khairat'}
                    fontSize={isMobile ? 'clamp(1.8rem, 6.5vw, 2.6rem)' : 'clamp(2.3rem, 4.0vw, 3.5rem)'}
                    layers={config.depthText?.layers ?? 30}
                    depth={config.depthText?.depth ?? 2.0}
                    faceColor={config.depthText?.faceColor || '#ffffff'}
                    depthColor={config.depthText?.depthColor || '#2f77ff'}
                    gradientDepth={false}
                    hoverPush={config.depthText?.hoverPush ?? 0.5}
                    float={config.depthText?.float ?? true}
                    tilt={config.depthText?.tilt ?? 7.5}
                    pointerTracking={true}
                    autoOrbit={config.depthText?.autoOrbit ?? true}
                    orbitSpeed={config.depthText?.orbitSpeed ?? 0.35}
                    shadow={config.depthText?.shadow ?? true}
                    intro={true}
                  />
                ) : (
                  <span className="g">{config.depthText?.text || 'Anwail Khairat'}</span>
                )}
              </span>
            </h1>
            <p className="role">{config.general?.role || 'Videographer, Video Editor & VFX Artist'}</p>
            <p className="lead">{config.general?.lead}</p>
            <div className="btns">
              <a className="btn p" href={config.general?.cvUrl || '#download-cv'}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-currentColor stroke-2">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
                Download CV
              </a>
              <a
                className="btn"
                href={config.general?.whatsappUrl || 'https://wa.me/6285136304385?text=Halo...'}
                target="_blank"
                rel="noopener noreferrer"
                title="Chat via WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-currentColor text-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </a>
              <a
                className="btn"
                href={config.general?.instagramUrl || 'https://www.instagram.com/kzn.visuals'}
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram @kzn.visuals"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-currentColor text-[#E1306C]">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                Instagram
              </a>
              <a className="btn" href="#contact">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-currentColor stroke-2">
                  <path d="M4 4h16v16H4zM4 6l8 7 8-7" />
                </svg>
                Contact Me
              </a>
            </div>
          </div>

          {/* Scroll Down Button for Desktop */}
          <a className="down" href="#about" aria-label="Scroll ke bawah">
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14m0 0l-6-6m6 6l6-6" />
            </svg>
          </a>
        </header>

        {/* ── ABOUT SECTION WITH 3D PROFILECARD ── */}
        <section id="about" className="about-section">
          <div className="wrap">
            <div className="about-layout">
              {/* ProfileCard: Di samping About Me pada Desktop, di atas About Me pada Mobile */}
              <div className="about-card-col">
                <ProfileCard
                  name={(config as any).profileCard?.name || config.general?.fullName || 'Anwail Khairat'}
                  title={(config as any).profileCard?.title || config.general?.role || 'Videographer & VFX Artist'}
                  handle={(config as any).profileCard?.handle || 'kzn.visuals'}
                  status={(config as any).profileCard?.status || 'Open to Work'}
                  statusColor={(config as any).profileCard?.statusColor || '#22c55e'}
                  contactText={(config as any).profileCard?.contactText || 'WhatsApp Me'}
                  avatarUrl={(config as any).profileCard?.avatarUrl || '/uploads/Cinematic_Blue_Gimbal_Portrait_1793902850583.png'}
                  miniAvatarUrl={(config as any).profileCard?.miniAvatarUrl || '/uploads/Professional_Passport_Portrait_1793902304602.png'}
                  holo={(config as any).profileCard?.holo ?? 0.85}
                  glare={(config as any).profileCard?.glare ?? 0.55}
                  tiltStrength={(config as any).profileCard?.tiltStrength ?? 14}
                  parallax={(config as any).profileCard?.parallax ?? 10}
                  radius={(config as any).profileCard?.radius ?? 20}
                  photoFit={((config as any).profileCard?.photoFit as any) || 'cover'}
                  photoPosition={(config as any).profileCard?.photoPosition || 'center 20%'}
                  scrimOpacity={(config as any).profileCard?.scrimOpacity ?? 0.35}
                  theme={(config as any).profileCard?.theme || 'dark'}
                  onContactClick={() => {
                    window.open(config.general?.whatsappUrl || 'https://wa.me/6285136304385?text=Halo...', '_blank');
                  }}
                />
              </div>

              {/* Teks Deskripsi About Me (Rata Kiri Kanan & Rapi) */}
              <div className="about-text-col">
                <div className="eyebrow" style={{ marginBottom: '10px' }}>
                  {(config.about as any)?.eyebrow || 'ABOUT THE CREATOR'}
                </div>
                <h2>
                  {config.about?.heading ? config.about.heading.split(' ')[0] : 'About'}{' '}
                  <span className="g">{config.about?.heading ? config.about.heading.split(' ').slice(1).join(' ') : 'Me'}</span>
                </h2>
                <p className="sub" style={{ margin: '0 0 18px 0' }}>{config.about?.lead}</p>
                {config.about?.sub && (
                  <p className="about-subtext">{config.about.sub}</p>
                )}
                
                {/* Highlights / Quick stats badges */}
                <div className="about-stats-row">
                  {((config.about as any)?.stats || [
                    { id: '1', number: '95%+', label: 'Client Satisfaction' },
                    { id: '2', number: '7+', label: 'Juara Penghargaan' },
                    { id: '3', number: '3.40', label: 'IPK Multimedia' }
                  ]).map((stat: any, idx: number) => (
                    <div key={stat.id || idx} className="about-stat-item">
                      <span className="about-stat-number">{stat.number}</span>
                      <span className="about-stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SKILLS SECTION ── */}
        <section id="skills">
          <div className="wrap">
            <h2>
              My <span className="g">Skills</span>
            </h2>
            <p className="sub">
              Keahlian teknis, software, dan workflow modern yang saya terapkan dalam setiap karya visual.
            </p>
            <div className="chips">
              {(config.about?.skills || [
                'Videografi', 'Fotografi', 'Adobe Premiere Pro', 'After Effects', 'Photoshop', 'Illustrator', 'VFX Compositing', '3D Tracking', 'AI Workflow'
              ]).map((s: string) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── PROJECTS SECTION (DILENGKAPI FITUR TONTON INSTAGRAM & DRIVE LANGSUNG) ── */}
        <section id="projects">
          <div className="wrap">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <h2>
                  Featured <span className="g">Projects</span>
                </h2>
                <p className="sub" style={{ margin: '6px 0 0' }}>
                  Koleksi karya video promosi, commercial reel, film pendek, dan visual effects. Klik kartu untuk menonton langsung!
                </p>
              </div>
            </div>

            <div className="grid">
              {(config.projects || []).map((proj: any, idx: number) => {
                const parsed = parseMediaUrl(proj.link);
                return (
                  <div
                    key={proj.id || idx}
                    className="box project-card-interactive group transition-all"
                    onClick={() => setActiveMediaProject(proj)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${parsed.badgeColor}`}>
                        {parsed.badgeText}
                      </span>
                      <a
                        href={parsed.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-white/50 hover:text-[#18d3ff] transition-colors p-1"
                        title="Buka langsung di tab baru"
                      >
                        ↗
                      </a>
                    </div>
                    
                    <h3>{proj.title}</h3>
                    <p className="mb-4">{proj.description}</p>
                    
                    <div className="flex flex-wrap gap-1.5 items-center justify-between pt-2">
                      <div className="flex flex-wrap gap-1">
                        {(proj.tags || []).map((t: string) => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-[#18d3ff] group-hover:underline flex items-center gap-1 mt-2">
                        ▶ Tonton Video
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── EXPERIENCE SECTION ── */}
        <section id="experience">
          <div className="wrap">
            <h2>
              Work <span className="g">Experience</span>
            </h2>
            <p className="sub">
              Rekam jejak profesional di production house, creative agency, freelance, dan organisasi kemahasiswaan.
            </p>
            <div className="grid">
              {((config as any).experience || []).map((exp: any) => (
                <div key={exp.id} className="box">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3>{exp.title}</h3>
                    {exp.tag && <span className="tag text-[10px] mt-0">{exp.tag}</span>}
                  </div>
                  <div className="text-xs text-[#38bdf8] font-medium mb-3">
                    {exp.subtitle ? exp.subtitle : ''} {exp.period ? '• (' + exp.period + ')' : ''}
                  </div>
                  <p>{exp.description}</p>
                </div>
              ))}
            </div>

            {/* PENDIDIKAN RESMI DARI CV */}
            {((config as any).education && (config as any).education.length > 0) && (
              <div className="mt-12 pt-10 border-t border-white/10">
                <h3 className="text-xl font-black text-white mb-2">
                  🎓 Riwayat <span className="g">Pendidikan</span>
                </h3>
                <div className="grid mt-4">
                  {((config as any).education || []).map((edu: any) => (
                    <div key={edu.id} className="box bg-gradient-to-br from-blue-950/20 to-transparent">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-lg font-bold text-white">{edu.institution}</h4>
                        <span className="tag text-[10px] mt-0">IPK: {edu.gpa}</span>
                      </div>
                      <div className="text-xs text-[#38bdf8] font-medium mb-3">
                        {edu.degree} • {edu.period} • {edu.location}
                      </div>
                      <p>{edu.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── CERTIFICATES & AWARDS SECTION ── */}
        <section id="certificates">
          <div className="wrap">
            <h2>
              Awards & <span className="g">Achievements</span>
            </h2>
            <p className="sub">
              Daftar kejuaraan kompetisi video kreatif tingkat regional, nasional, dan internasional serta sertifikasi keahlian.
            </p>
            <div className="grid">
              {((config as any).certificates || []).map((cert: any) => (
                <div key={cert.id} className="box">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3>{cert.title}</h3>
                    {cert.tag && <span className="tag text-[10px] mt-0">{cert.tag}</span>}
                  </div>
                  <div className="text-xs text-[#38bdf8] font-medium mb-3">
                    {cert.issuer ? cert.issuer : ''} {cert.period ? '• ' + cert.period : ''}
                  </div>
                  <p>{cert.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTACT SECTION (WHATSAPP, INSTAGRAM, EMAIL - ZERO GITHUB) ── */}
        <section id="contact">
          <div className="wrap">
            <h2>
              Let’s <span className="g">Connect</span>
            </h2>
            <p className="sub">
              Terbuka untuk project komersial, freelance videografi & editing video, serta kolaborasi industri kreatif.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 max-w-4xl mx-auto">
              {/* WhatsApp Card */}
              <a
                href={config.general?.whatsappUrl || 'https://wa.me/6285136304385?text=Halo...'}
                target="_blank"
                rel="noopener noreferrer"
                className="box p-5 hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">WhatsApp Chat</h4>
                  <p className="text-xs text-white/60 mb-2">Respon cepat untuk konsultasi proyek & brief</p>
                  <span className="text-xs text-emerald-400 font-mono font-semibold">+62 851-3630-4385</span>
                </div>
                <span className="mt-4 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  Kirim Pesan Langsung ↗
                </span>
              </a>

              {/* Instagram Card */}
              <a
                href={config.general?.instagramUrl || 'https://www.instagram.com/kzn.visuals'}
                target="_blank"
                rel="noopener noreferrer"
                className="box p-5 hover:border-pink-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-3 group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">Instagram</h4>
                  <p className="text-xs text-white/60 mb-2">Lihat karya video, daily reel, dan update terbaru</p>
                  <span className="text-xs text-pink-400 font-mono font-semibold">@kzn.visuals</span>
                </div>
                <span className="mt-4 text-xs font-semibold text-pink-400 flex items-center gap-1">
                  Kunjungi Profil Instagram ↗
                </span>
              </a>

              {/* Email Card */}
              <a
                href={`mailto:${config.general?.contactEmail || 'anwailkhairat5@gmail.com'}`}
                className="box p-5 hover:border-blue-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-currentColor stroke-2">
                      <path d="M4 4h16v16H4zM4 6l8 7 8-7" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">Email Resmi</h4>
                  <p className="text-xs text-white/60 mb-2">Pengiriman brief resmi & dokumen kerjasama</p>
                  <span className="text-xs text-blue-400 font-mono font-semibold truncate block">
                    {config.general?.contactEmail || 'anwailkhairat5@gmail.com'}
                  </span>
                </div>
                <span className="mt-4 text-xs font-semibold text-blue-400 flex items-center gap-1">
                  Kirim Pesan Email ↗
                </span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── INTERACTIVE VIDEO PREVIEW MODAL (INSTAGRAM, GOOGLE DRIVE, YOUTUBE) ── */}
      {activeMediaProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity"
          onClick={() => setActiveMediaProject(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-[#0c101c] border border-white/20 rounded-3xl shadow-2xl overflow-hidden modal-fade-enter"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-white/10 bg-white/5">
              <div>
                <span className="text-[11px] font-bold text-[#18d3ff] tracking-wider uppercase block">
                  {parseMediaUrl(activeMediaProject.link).label}
                </span>
                <h3 className="text-base sm:text-lg font-black text-white truncate max-w-md">
                  {activeMediaProject.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveMediaProject(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm font-bold"
                aria-label="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Video Player Body */}
            <div className="p-4 sm:p-6 bg-black/40">
              {(() => {
                const parsed = parseMediaUrl(activeMediaProject.link);
                if (parsed.type === 'instagram') {
                  return (
                    <div className="w-full flex justify-center bg-black/60 rounded-2xl overflow-hidden py-2">
                      <iframe
                        src={parsed.embedUrl}
                        className="w-full max-w-[440px] h-[480px] sm:h-[540px] border-0 rounded-xl"
                        scrolling="no"
                        allowTransparency
                        title={activeMediaProject.title}
                      />
                    </div>
                  );
                } else if (parsed.type === 'gdrive') {
                  return (
                    <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
                      <iframe
                        src={parsed.embedUrl}
                        className="w-full h-full border-0"
                        allow="autoplay; fullscreen"
                        title={activeMediaProject.title}
                      />
                    </div>
                  );
                } else if (parsed.type === 'youtube') {
                  return (
                    <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
                      <iframe
                        src={parsed.embedUrl}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={activeMediaProject.title}
                      />
                    </div>
                  );
                } else if (parsed.type === 'video') {
                  return (
                    <video
                      src={parsed.embedUrl}
                      controls
                      autoPlay
                      className="w-full aspect-video bg-black rounded-2xl"
                    />
                  );
                } else {
                  return (
                    <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-sm text-white/70 mb-4">
                        Project ini tertaut ke halaman eksternal.
                      </p>
                      <a
                        href={parsed.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn p inline-flex"
                      >
                        Kunjungi Halaman Asli ↗
                      </a>
                    </div>
                  );
                }
              })()}

              {/* Description & Metadata (Rata Kiri-Kanan Rapi) */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-xs sm:text-sm text-white/80 text-justify leading-relaxed mb-4">
                  {activeMediaProject.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(activeMediaProject.tags || []).map((t: string) => (
                      <span key={t} className="tag text-[10px] mt-0">{t}</span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={parseMediaUrl(activeMediaProject.link).originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-[#2f77ff] hover:bg-[#3d82ff] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                    >
                      <span>Buka di Sumber Asli</span>
                      <span>↗</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveMediaProject(null)}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold transition-all"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer>
        <div className="flex flex-col items-center gap-3">
          <span>{config.general?.footerText || '© 2026 Anwail Khairat. All rights reserved.'}</span>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <Link
              href="/admin"
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-[#2f77ff]/20 hover:text-[#18d3ff] border border-white/10 hover:border-[#18d3ff]/40 transition-all flex items-center gap-2 shadow-sm"
              title="Buka Panel Admin CMS (Shortcut: Ctrl + Shift + A)"
            >
              <span>⚙️ Panel Admin</span>
              <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">
                Ctrl+Shift+A
              </kbd>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
