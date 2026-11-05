'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import initialConfig from '@/data/portfolio-config.json';

const Lanyard = dynamic(() => import('@/components/Lanyard'), { ssr: false });
const DarkVeil = dynamic(() => import('@/components/DarkVeil'), { ssr: false });
const GooeyNav = dynamic(() => import('@/components/GooeyNav'), { ssr: false });
const DepthText = dynamic(() => import('@/components/DepthText'), { ssr: false });

const NAV_ITEMS = [
  { label: 'Home', href: '#home', id: 'home' },
  { label: 'About', href: '#about', id: 'about' },
  { label: 'Skills', href: '#skills', id: 'skills' },
  { label: 'Projects', href: '#projects', id: 'projects' },
  { label: 'Experience', href: '#experience', id: 'experience' },
  { label: 'Certificates', href: '#certificates', id: 'certificates' },
  { label: 'Contact', href: '#contact', id: 'contact' },
];

export default function Home() {
  const [config, setConfig] = useState(initialConfig);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();

    window.addEventListener('resize', checkMobile);

    // Fetch live config from admin if available
    fetch('/api/admin/config')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setConfig(json.data);
        }
      })
      .catch(() => {});

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
      <nav aria-label="Menu utama">
        <div className="wrap">
          <a className="logo" href="#home">
            {config.general?.brandLogo || 'Anwail Khairat'}<i>.</i>
          </a>
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
                spread={config.gooeyNav?.spread ?? 48}
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
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div className="eyebrow">{config.general?.eyebrow || 'WELCOME TO MY PORTFOLIO'}</div>
            <h1 className="hero-heading">
              <span className="hero-greeting">Hi, I’m</span>
              <span className="hero-name-wrapper">
                {mounted ? (
                  <DepthText
                    text={config.depthText?.text || 'Anwail Khairat'}
                    layers={config.depthText?.layers ?? 30}
                    depth={config.depthText?.depth ?? 2.0}
                    faceColor={config.depthText?.faceColor || '#ffffff'}
                    depthColor={config.depthText?.depthColor || '#2f77ff'}
                    gradientDepth={false}
                    hoverPush={config.depthText?.hoverPush ?? 0.5}
                    float={config.depthText?.float ?? true}
                    tilt={config.depthText?.tilt ?? 7.5}
                    pointerTracking={true}
                    smoothing={0.14}
                    perspective={900}
                    autoOrbit={config.depthText?.autoOrbit ?? true}
                    orbitSpeed={config.depthText?.orbitSpeed ?? 0.35}
                    fontSize="clamp(1.75rem, 5vw, 4.4rem)"
                    fontWeight={900}
                    shadow={config.depthText?.shadow ?? true}
                    outline={false}
                    intro={true}
                  />
                ) : (
                  <span className="g">{config.depthText?.text || 'Anwail Khairat'}</span>
                )}
              </span>
            </h1>
            <p className="role">{config.general?.role || 'Multimedia Engineering Student'}</p>
            <p className="lead">{config.general?.lead}</p>
            <div className="btns">
              <a className="btn p" href={config.general?.cvUrl || '#download-cv'}>
                <svg viewBox="0 0 24 24">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
                Download CV
              </a>
              <a
                className="btn"
                href={config.general?.githubUrl || 'https://github.com/anwailkhairat5'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M9 19c-4 1-4-2-6-2m12 4v-3.5a3 3 0 00-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2a4.8 4.8 0 00-1.3-3.3 4.5 4.5 0 00-.1-3.3s-1.1-.3-3.5 1.3a12 12 0 00-6.2 0C6.500 2.200 5.400 2.500 5.400 2.500a4.500 4.500 0 00-.1 3.300A4.800 4.800 0 004 9.100c0 4.800 3 5.900 5.800 6.200A3 3 0 009 17.500V21" />
                </svg>
                GitHub
              </a>
              <a
                className="btn"
                href={config.general?.linkedinUrl || 'https://linkedin.com'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 4a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                LinkedIn
              </a>
              <a className="btn" href="#contact">
                <svg viewBox="0 0 24 24">
                  <path d="M4 4h16v16H4zM4 6l8 7 8-7" />
                </svg>
                Contact Me
              </a>
            </div>
          </div>

          {/* ── 3D LANYARD INTERACTIVE PHYSICS COMPONENT ── */}
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
                  size={isMobile ? 0.40 : 0.46}
                  anchor={isMobile ? 'center' : 0.74}
                  strapLength={isMobile ? 0.28 : 0.32}
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

          {/* Scroll Down Button */}
          <a className="down" href="#about" aria-label="Scroll ke bawah">
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14m0 0l-6-6m6 6l6-6" />
            </svg>
          </a>
        </header>

        {/* ── ABOUT SECTION ── */}
        <section id="about">
          <div className="wrap">
            <h2>
              {config.about?.heading ? config.about.heading.split(' ')[0] : 'About'}{' '}
              <span className="g">{config.about?.heading ? config.about.heading.split(' ').slice(1).join(' ') : 'Me'}</span>
            </h2>
            <p className="sub">{config.about?.lead}</p>
          </div>
        </section>

        {/* ── SKILLS SECTION ── */}
        <section id="skills">
          <div className="wrap">
            <h2>
              My <span className="g">Skills</span>
            </h2>
            <p className="sub">
              Keahlian dan software yang saya gunakan dalam workflow kreatif dan produksi multimedia.
            </p>
            <div className="chips">
              {(config.about?.skills || ['Blender', 'Tripo AI', '3D Modeling']).map((s: string) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── PROJECTS SECTION ── */}
        <section id="projects">
          <div className="wrap">
            <h2>
              Featured <span className="g">Projects</span>
            </h2>
            <p className="sub">
              Koleksi project riset, animasi 3D, dan produksi film pendek.
            </p>
            <div className="grid">
              {(config.projects || []).map((proj: any) => (
                <a key={proj.id} className="box" href={proj.link || '#projects'}>
                  <h3>{proj.title}</h3>
                  <p>{proj.description}</p>
                  {(proj.tags || []).map((t: string) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── EXPERIENCE SECTION ── */}
        <section id="experience">
          <div className="wrap">
            <h2>
              My <span className="g">Experience</span>
            </h2>
            <div className="grid">
              <div className="box">
                <h3>3D &amp; Multimedia Production</h3>
                <p>
                  Politeknik Negeri Lhokseumawe (2024 — Sekarang) • Terlibat dalam proyek produksi film pendek, eksplorasi AI-generated 3D modeling workflow, dan animasi.
                </p>
                <span className="tag">Campus Project</span>
              </div>
              <div className="box">
                <h3>Freelance Video Editor &amp; 3D Artist</h3>
                <p>
                  Remote (2022 — Sekarang) • Mengerjakan editing video komersial, motion graphic, dan aset visual 3D untuk berbagai kebutuhan klien kreatif.
                </p>
                <span className="tag">Freelance</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── CERTIFICATES SECTION ── */}
        <section id="certificates">
          <div className="wrap">
            <h2>
              My <span className="g">Certificates</span>
            </h2>
            <div className="grid">
              <div className="box">
                <h3>Sertifikasi Kompetensi Multimedia</h3>
                <p>
                  BNSP &amp; Politeknik Negeri Lhokseumawe — Terverifikasi dalam bidang produksi multimedia, editing, dan teknologi grafis (2025).
                </p>
                <span className="tag">BNSP Certified</span>
              </div>
              <div className="box">
                <h3>Pelatihan 3D Animation &amp; Visual Effects</h3>
                <p>
                  Program peningkatan kompetensi multimedia kreatif dan workflow animasi 3D (2024).
                </p>
                <span className="tag">Professional Course</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTACT SECTION ── */}
        <section id="contact">
          <div className="wrap">
            <h2>
              Let’s <span className="g">Connect</span>
            </h2>
            <p className="sub">
              Terbuka untuk kolaborasi, riset skripsi, dan project kreatif.
            </p>
            <a className="btn p" href={`mailto:${config.general?.contactEmail || 'anwail.studio@gmail.com'}`}>
              Kirim Email
            </a>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer>
        <div className="flex flex-col items-center gap-2">
          <span>{config.general?.footerText || '© 2026 Anwail Khairat. All rights reserved.'}</span>
          <Link href="/admin" className="text-xs text-white/30 hover:text-[#18d3ff] transition-colors">
            ⚙ Panel Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
