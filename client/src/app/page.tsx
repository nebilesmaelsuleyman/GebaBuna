'use client';

import React, { useEffect, useRef } from 'react';
import NextLink from 'next/link';
import {
  TrendingUp,
  MapPin,
  ShieldCheck,
  Mic,
  Star,
  CheckCircle2,
  ArrowRight,
  Send,
  Zap,
  BarChart2,
  Leaf,
  Badge,
  ShoppingBag,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// WebGL Coffee Bean Background
// ---------------------------------------------------------------------------
function CoffeeBeanCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(syncSize).observe(canvas);
    }
    syncSize();

    const gl = canvas.getContext('webgl') || (canvas.getContext as any)('experimental-webgl');
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
mat2 rot(float a) {
  float s = sin(a); float c = cos(a);
  return mat2(c, -s, s, c);
}
float sdCoffeeBean(vec2 p, float scale) {
  p /= scale;
  vec2 pEllip = p;
  pEllip.y *= 1.35;
  float d = length(pEllip) - 1.0;
  float crease = abs(p.x - 0.12 * sin(p.y * 3.1415));
  float creaseDepth = smoothstep(0.12, 0.0, crease) * (1.0 - smoothstep(0.7, 0.95, abs(p.y)));
  return (d - creaseDepth * 0.18) * scale;
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  vec3 col = vec3(0.969, 0.953, 0.925);
  float bgGlow = length(uv - vec2(0.8, 0.3));
  col = mix(col, vec3(0.910, 0.855, 0.780), bgGlow * 0.28);
  vec2 mouseNorm = (u_mouse.xy / u_resolution.xy) - 0.5;
  vec3 beanDark = vec3(0.38, 0.22, 0.10);
  vec3 beanMid = vec3(0.55, 0.34, 0.18);
  vec3 beanHighlight = vec3(0.78, 0.54, 0.28);
  for (int layer = 0; layer < 2; layer++) {
    float fLayer = float(layer);
    float speed = 0.12 + fLayer * 0.08;
    float layerScale = 2.4 - fLayer * 0.8;
    vec2 st = p * layerScale;
    st.y += u_time * speed * 0.3;
    st.x += sin(u_time * 0.2 + fLayer * 2.0) * 0.1 + mouseNorm.x * (0.05 + fLayer * 0.05);
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 cellId = id + g;
        float rnd = hash(cellId);
        if (rnd > 0.36) continue;
        vec2 offset = vec2(hash(cellId + 1.3), hash(cellId + 2.7)) - 0.5;
        vec2 beanPos = f - g - offset * 0.4;
        float rotAngle = rnd * 6.28 + u_time * (0.15 * (rnd - 0.5)) + sin(u_time * 0.3 + rnd * 4.0) * 0.4;
        beanPos = rot(rotAngle) * beanPos;
        float beanSize = 0.045 + rnd * 0.035;
        float d = sdCoffeeBean(beanPos, beanSize);
        float shadow = smoothstep(0.02, 0.0, d - 0.012);
        col = mix(col, col * 0.92, shadow * 0.35);
        float alpha = smoothstep(0.004, -0.004, d);
        if (alpha > 0.0) {
          vec2 normBean = beanPos / beanSize;
          float crease = abs(normBean.x - 0.12 * sin(normBean.y * 3.1415));
          float creaseMask = smoothstep(0.09, 0.02, crease);
          vec3 bCol = mix(beanMid, beanDark, creaseMask * 0.65);
          float hl = smoothstep(0.3, 0.8, -normBean.x + normBean.y * 0.5);
          bCol = mix(bCol, beanHighlight, hl * 0.3);
          float beanOpacity = (0.10 + fLayer * 0.08) * alpha;
          col = mix(col, bCol, beanOpacity);
        }
      }
    }
  }
  gl_FragColor = vec4(col, 1.0);
}`;

    function cs(type: number, src: string) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
        mouse.y = (1 - (e.clientY - rect.top) / rect.height) * canvas.height;
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    let raf: number;
    function render(t: number) {
      if (typeof ResizeObserver === 'undefined') syncSize();
      gl.viewport(0, 0, canvas!.width, canvas!.height);
      gl.uniform1f(uTime, t * 0.001);
      gl.uniform2f(uRes, canvas!.width, canvas!.height);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 opacity-70"
      style={{ display: 'block' }}
    />
  );
}

// ---------------------------------------------------------------------------
// ECX Price data (static display — matches Stitch design)
// ---------------------------------------------------------------------------
const ecxRows = [
  { origin: 'Jimma G5 (Agaro)', process: 'Natural Sundried', processColor: 'text-coffee-500', broker: '310 ETB', ecx: '395 ETB', buna: '425 ETB', advantage: '+115 ETB/kg (+37%)' },
  { origin: 'Sidama G2 (Aleta Wondo)', process: 'Fully Washed', processColor: 'text-forest-600', broker: '390 ETB', ecx: '480 ETB', buna: '520 ETB', advantage: '+130 ETB/kg (+33%)' },
  { origin: 'Yirgacheffe G1 (Konga)', process: 'Anaerobic Natural', processColor: 'text-gold-700', broker: '460 ETB', ecx: '590 ETB', buna: '670 ETB', advantage: '+210 ETB/kg (+45%)' },
  { origin: 'Lekempti G4 (Wollega)', process: 'Natural Sundried', processColor: 'text-coffee-500', broker: '305 ETB', ecx: '380 ETB', buna: '415 ETB', advantage: '+110 ETB/kg (+36%)' },
  { origin: 'Harar Longberry G4', process: 'Heirloom Dry Process', processColor: 'text-coffee-500', broker: '340 ETB', ecx: '435 ETB', buna: '470 ETB', advantage: '+130 ETB/kg (+38%)' },
];

// ---------------------------------------------------------------------------
// Feature cards data
// ---------------------------------------------------------------------------
const features = [
  {
    icon: <Zap className="w-6 h-6" />,
    color: 'text-gold-600 bg-gold-500/10',
    tag: 'Computer Vision AI',
    tagColor: 'text-gold-700',
    badge: '50K+ Lab Samples',
    accuracy: '98.4% ECX Grading Accuracy',
    title: 'AI Coffee Bean Grade & Defect Analyzer',
    desc: 'Snap a photo of drying cherry beds on Telegram. Neural models trained on ECX physical grading labs detect screen size, moisture, and defect ratios in under 4 seconds.',
    footer: (
      <div className="mt-auto p-3 rounded-xl bg-coffee-50 border border-coffee-200 flex items-center justify-between text-sm">
        <div>
          <span className="text-xs text-coffee-500 block">Scan Result (Jimma Lot #04)</span>
          <strong className="text-coffee-900 text-sm">Grade 2 • Screen 16+ (88%)</strong>
        </div>
        <span className="text-gold-700 font-bold text-sm">428 ETB/kg Fair Value</span>
      </div>
    ),
  },
  {
    icon: <Mic className="w-6 h-6" />,
    color: 'text-forest-600 bg-forest-500/10',
    tag: 'Zero Literacy Barrier',
    tagColor: 'text-forest-700',
    badge: '',
    accuracy: 'Afaan Oromoo & Amharic',
    title: 'Voice Notes in Afaan Oromoo & Amharic',
    desc: 'No typing needed. Smallholders record voice memos stating volume and washing station location. AI transcribes and executes binding agreements instantly.',
    footer: (
      <div className="mt-auto p-3 rounded-xl bg-coffee-50 border border-coffee-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-coffee-900 flex items-center justify-center shrink-0">
          <span className="text-white text-xs">▶</span>
        </div>
        <div className="flex items-end gap-0.5 flex-1 h-5">
          {[2, 5, 3, 6, 4, 2, 3].map((h, i) => (
            <div key={i} className={`w-1 rounded-full ${i < 5 ? 'bg-gold-500' : 'bg-gold-300'}`} style={{ height: `${h * 4}px` }} />
          ))}
        </div>
        <span className="text-xs text-forest-600 font-semibold">Oromoo → English Verified</span>
      </div>
    ),
  },
  {
    icon: <BarChart2 className="w-6 h-6" />,
    color: 'text-gold-600 bg-gold-500/10',
    tag: 'Regulatory Enforcement',
    tagColor: 'text-gold-700',
    badge: '',
    accuracy: 'ECX Floor Integration',
    title: 'Statutory ECX Price Safeguard',
    desc: 'Direct link with official ECX rules blocks predatory low-ball offers. Any bid below regulatory guidelines triggers automated protection safeguards.',
    footer: (
      <div className="mt-auto p-3 rounded-xl bg-coffee-50 border border-coffee-200 flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-forest-600 font-bold text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>100% Minimum Floor Protection</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-forest-100 text-forest-700 font-bold text-xs">CTA COMPLIANT</span>
      </div>
    ),
  },
  {
    icon: <Star className="w-6 h-6" />,
    color: 'text-forest-600 bg-forest-500/10',
    tag: 'Reputation Protocol',
    tagColor: 'text-forest-700',
    badge: '',
    accuracy: 'On-chain Provenance',
    title: 'Gabaa Trust Score & Rank',
    desc: 'Track record for smallholders and washing stations. High ratings for prompt lot delivery and consistent moisture unlock advance harvest financing.',
    footer: (
      <div className="mt-auto flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-coffee-100 border border-coffee-200 text-xs font-bold text-coffee-900">
          🏅 Gold Harvester
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 text-xs font-bold">
          <CheckCircle2 className="w-3 h-3" /> 5★ Prompt Payer
        </span>
      </div>
    ),
  },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function HomePage() {
  return (
    <div className="min-h-screen">
      <CoffeeBeanCanvas />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden pt-8 pb-14 lg:pb-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Left */}
            <div className="lg:col-span-7 flex flex-col gap-5 z-10">
              {/* Eyebrow pill */}
              <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-coffee-200/60">
                <span className="w-2.5 h-2.5 rounded-full bg-forest-500 animate-pulse inline-block" />
                <span className="text-xs font-semibold text-coffee-800 tracking-wide">
                  🇪🇹 Jimma • Sidama • Yirgacheffe • Harar • Backed by ECX Data
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-coffee-950 max-w-2xl">
                Fair Prices for Ethiopian Coffee Farmers.{' '}
                <span className="text-cherry-700">Transparent deals</span> for buyers who pay the floor.
              </h1>

              {/* Subtitle */}
              <p className="text-base text-coffee-600 max-w-xl leading-relaxed">
                Empowering Ethiopian smallholders to bypass middlemen with real-time ECX market prices, instant AI bean grading, and Telegram voice trades in Afaan Oromoo & Amharic.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="https://t.me/BunaFairPriceBot"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-cherry-600 hover:bg-cherry-500 text-white font-bold text-sm shadow-md transition-all transform hover:-translate-y-0.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Launch Telegram Bot</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <NextLink
                  href="/market"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/90 backdrop-blur-sm text-coffee-900 font-semibold text-sm border border-coffee-200 hover:border-coffee-400 transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-forest-600" />
                  <span>View ECX Prices</span>
                </NextLink>
              </div>

              {/* Metrics bar */}
              <div className="grid grid-cols-3 gap-3 pt-3 max-w-xl">
                {[
                  { value: '14,200+', label: 'Farmers Enrolled', color: 'text-coffee-900' },
                  { value: '0% Cut', label: 'Zero Middleman Markup', color: 'text-forest-600' },
                  { value: 'Daily ECX', label: 'Auction Verified', color: 'text-gold-700' },
                ].map((m) => (
                  <div key={m.label} className="flex flex-col p-3 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-coffee-200/50">
                    <span className={`text-xl font-extrabold ${m.color}`}>{m.value}</span>
                    <span className="text-[11px] text-coffee-500 mt-0.5">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Farmer hero card */}
            <div className="lg:col-span-5 mt-8 lg:mt-0">
              <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-coffee-100 aspect-[4/5] sm:aspect-square lg:aspect-[4/5]">
                <img
                  src="https://images.unsplash.com/photo-1447708961282-4f2c4bfb4b1a?auto=format&fit=crop&w=800&q=80"
                  alt="Ethiopian coffee farmer harvesting ripe red cherries"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-coffee-950/80 via-transparent to-black/20 pointer-events-none" />

                {/* Origin badge */}
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-forest-600" />
                  <span className="text-xs font-bold text-coffee-900 tracking-wide">Jimma Zone • 1,940m</span>
                </div>

                {/* ECX certified */}
                <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest-600 text-white shadow-md text-xs font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  ECX Certified Lot
                </div>

                {/* Bottom trade pill */}
                <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-xl bg-white/95 backdrop-blur-md shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-forest-100 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-forest-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-coffee-900">Farmer Lemma G. accepted</span>
                      <span className="text-[11px] text-coffee-500">425 ETB/kg • 18 bags cherry</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 text-xs font-bold">PAID VIA CBE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ECX PRICE COMPARISON TABLE ───────────────────────────── */}
      <section className="w-full py-14 bg-white/80 backdrop-blur-sm" id="ecx-table">
        <div className="max-w-[1440px] mx-auto px-4 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
            <div className="max-w-2xl">
              <div className="flex items-center gap-1.5 text-gold-700 text-xs font-bold uppercase tracking-widest mb-1.5">
                <BarChart2 className="w-4 h-4" />
                Transparency Engine
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-coffee-950 tracking-tight">
                Live ECX vs. Middle Broker vs. Buna Fair Price
              </h2>
              <p className="text-sm text-coffee-600 mt-1">
                Real-time parity with central Addis Ababa commodity auction terminals.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-forest-100 border border-forest-200 text-forest-800 text-xs font-bold self-start md:self-auto">
              <ShieldCheck className="w-4 h-4" />
              Farmers earn +28% to +38% more cash in hand
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-hidden rounded-2xl bg-white shadow-sm border border-coffee-200">
            {/* Table header bar */}
            <div className="px-5 py-3.5 bg-coffee-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-forest-600" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-coffee-900">ECX Central Terminal Feeds</span>
                <span className="text-xs text-coffee-400">· Updated 12m ago</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-white border border-coffee-200 text-xs text-gold-700 font-bold">ETB / kg</span>
                <span className="px-2 py-0.5 rounded bg-coffee-100 text-xs text-coffee-500">USD / lb</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-coffee-50/60 text-coffee-500 text-xs uppercase tracking-wider">
                    <th className="py-3 px-5">Coffee Origin & Grade</th>
                    <th className="py-3 px-5">Process</th>
                    <th className="py-3 px-5">Middle Broker</th>
                    <th className="py-3 px-5">Official ECX Floor</th>
                    <th className="py-3 px-5 bg-gold-500/5 text-gold-700">Buna Verified Direct</th>
                    <th className="py-3 px-5 text-right">Farmer Advantage</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-coffee-900 divide-y divide-coffee-100">
                  {ecxRows.map((row, i) => (
                    <tr key={i} className={`hover:bg-coffee-50 transition-colors ${i % 2 === 1 ? 'bg-coffee-50/40' : ''}`}>
                      <td className="py-3 px-5 font-semibold">{row.origin}</td>
                      <td className={`py-3 px-5 text-xs font-semibold ${row.processColor}`}>{row.process}</td>
                      <td className="py-3 px-5 text-red-500 font-mono line-through opacity-70">{row.broker}</td>
                      <td className="py-3 px-5 font-mono">{row.ecx}</td>
                      <td className="py-3 px-5 bg-gold-500/5 font-mono text-gold-700 font-bold">{row.buna}</td>
                      <td className="py-3 px-5 text-right">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full bg-forest-100 text-forest-800 text-xs font-bold">
                          {row.advantage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 KEY INNOVATIONS ────────────────────────────────────── */}
      <section className="w-full py-16 bg-transparent" id="innovations">
        <div className="max-w-[1440px] mx-auto px-4 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-forest-600">Pioneering Technology</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-coffee-950 tracking-tight mt-1">
              Key Innovations for Fair Trade
            </h2>
            <p className="text-sm text-coffee-600 mt-2">
              Rebuilt commodities trading for Telegram bots, 2G connectivity, and voice memos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className="flex flex-col p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-coffee-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.color}`}>
                      {f.icon}
                    </div>
                    <div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${f.tagColor}`}>{f.tag}</span>
                      <div className="text-[11px] text-coffee-500 font-semibold mt-0.5">{f.accuracy}</div>
                    </div>
                  </div>
                  {f.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-forest-100 text-forest-700 text-xs font-bold">{f.badge}</span>
                  )}
                </div>
                <h3 className="text-base font-bold text-coffee-950 mb-2">{f.title}</h3>
                <p className="text-sm text-coffee-500 mb-4 leading-relaxed">{f.desc}</p>
                {f.footer}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TELEGRAM BOT SHOWCASE ────────────────────────────────── */}
      <section className="w-full py-16 bg-coffee-50/80 backdrop-blur-sm" id="telegram-preview">
        <div className="max-w-[1440px] mx-auto px-4 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Steps */}
            <div className="lg:col-span-6 flex flex-col gap-5">
              <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-gold-500/15 text-gold-700 text-xs font-bold uppercase tracking-wider">
                <Send className="w-3.5 h-3.5" />
                Direct Telegram Protocol
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-coffee-950 tracking-tight">
                How Farmers Sell in 90 Seconds
              </h2>
              <p className="text-sm text-coffee-600">
                No paperwork or complex portals. Open Telegram, snap a photo, speak in your language, and get paid directly to Telebirr or CBE Birr.
              </p>

              <div className="flex flex-col gap-3 mt-1">
                {[
                  { step: 1, title: 'Snap & Speak', desc: 'Photo & voice memo in Afaan Oromoo or Amharic.', color: 'bg-forest-100 text-forest-700' },
                  { step: 2, title: 'Instant AI ECX Valuation', desc: 'Computer vision calculates grade and matches export bids.', color: 'bg-gold-100 text-gold-700' },
                  { step: 3, title: 'Escrow Telebirr & CBE Payout', desc: 'Guaranteed instant settlement upon depot drop-off.', color: 'bg-forest-100 text-forest-700' },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3 p-3 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm border border-coffee-100">
                    <div className={`w-8 h-8 rounded-full ${s.color} flex items-center justify-center font-bold text-sm shrink-0`}>
                      {s.step}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-coffee-900">{s.title}</h4>
                      <p className="text-xs text-coffee-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <a
                  href="https://t.me/BunaFairPriceBot"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-cherry-600 hover:bg-cherry-500 text-white font-bold text-sm shadow-md transition-all"
                >
                  <Send className="w-4 h-4" />
                  Open @BunaFairBot on Telegram
                </a>
              </div>
            </div>

            {/* Right: Chat mockup */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-[390px] rounded-2xl bg-white shadow-xl overflow-hidden border border-coffee-200">
                {/* Chat header */}
                <div className="bg-coffee-900 px-4 py-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-coffee-950 font-bold text-xs">BF</div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold">Buna Fair Price Bot</span>
                        <ShieldCheck className="w-3 h-3 text-forest-400" />
                      </div>
                      <span className="text-[10px] text-coffee-300">automated trade desk</span>
                    </div>
                  </div>
                  <span className="text-coffee-400 text-xs">•••</span>
                </div>

                {/* Messages */}
                <div className="p-3.5 flex flex-col gap-3 bg-coffee-50/80">
                  {/* Outgoing */}
                  <div className="self-end max-w-[88%] p-2.5 rounded-xl bg-gold-500 text-coffee-950 shadow-sm text-sm">
                    <div className="w-full h-28 rounded-lg bg-coffee-200 overflow-hidden relative mb-1.5">
                      <img
                        className="w-full h-full object-cover"
                        src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80"
                        alt="Coffee cherries on drying bed"
                      />
                      <span className="absolute bottom-1 right-2 text-[10px] text-white/90 bg-black/50 px-1 py-0.5 rounded">Bed #3</span>
                    </div>
                    <p className="text-xs">Jimma Agaro lot, 20 bags sundried ready. 🎙️ Voice memo attached.</p>
                  </div>

                  {/* Incoming */}
                  <div className="self-start max-w-[92%] p-3 rounded-xl bg-white shadow-sm text-coffee-900 flex flex-col gap-2 border border-coffee-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-forest-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> AI Scan: Grade 2 (Specialty)
                      </span>
                      <span className="text-gold-700 font-bold">98.4% match</span>
                    </div>
                    <div className="text-xs text-coffee-500 flex justify-between border-y border-coffee-100 py-1.5">
                      <span>Screen 16+ · Moisture 11.2%</span>
                      <strong className="text-gold-700 font-mono">420 – 435 ETB/kg</strong>
                    </div>
                    <button className="w-full py-2 px-3 rounded-lg bg-forest-600 text-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-forest-500 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accept Offer at 430 ETB/kg
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TWO-SIDED BENEFITS ────────────────────────────────────── */}
      <section className="w-full py-16 bg-transparent">
        <div className="max-w-[1440px] mx-auto px-4 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* For Farmers */}
            <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-coffee-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/15 text-gold-800 text-xs font-bold">
                    <Leaf className="w-3.5 h-3.5" /> For Farmers & Stations
                  </span>
                  <span className="text-[11px] text-coffee-400 font-semibold uppercase tracking-wider">PRODUCER PROTOCOL</span>
                </div>
                <h3 className="text-lg font-bold text-coffee-950 mb-3">Full ECX Market Rates, Zero Broker Deductions</h3>
                <ul className="space-y-2.5 text-sm text-coffee-600">
                  {[
                    { icon: <ShieldCheck className="w-4 h-4 text-forest-500" />, text: 'Protected floor rates on phone or feature device' },
                    { icon: <TrendingUp className="w-4 h-4 text-forest-500" />, text: 'Direct Telebirr and CBE Birr instant payouts' },
                    { icon: <Mic className="w-4 h-4 text-forest-500" />, text: 'Voice memos in native Afaan Oromoo & Amharic' },
                    { icon: <Badge className="w-4 h-4 text-forest-500" />, text: 'Reputation unlocking seasonal input advances' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">{item.icon}{item.text}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-6">
                <a href="https://t.me/BunaFairPriceBot" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-gold-700 font-bold hover:underline">
                  Join as Coffee Producer <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* For Exporters */}
            <div className="p-6 rounded-2xl bg-coffee-50/80 backdrop-blur-sm border border-coffee-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-500/15 text-forest-800 text-xs font-bold">
                    <ShoppingBag className="w-3.5 h-3.5" /> For Exporters & Roasters
                  </span>
                  <span className="text-[11px] text-coffee-400 font-semibold uppercase tracking-wider">INSTITUTIONAL DESK</span>
                </div>
                <h3 className="text-lg font-bold text-coffee-950 mb-3">Direct Origin Traceability, Zero Default Risk</h3>
                <ul className="space-y-2.5 text-sm text-coffee-600">
                  {[
                    { icon: <MapPin className="w-4 h-4 text-forest-500" />, text: '100% Kebele & washing bed GPS provenance' },
                    { icon: <ShieldCheck className="w-4 h-4 text-forest-500" />, text: 'Certified Q-grader SCA scores pre-vetted' },
                    { icon: <CheckCircle2 className="w-4 h-4 text-forest-500" />, text: 'Bank escrow released only after terminal inspection' },
                    { icon: <BarChart2 className="w-4 h-4 text-forest-500" />, text: 'Automated EUDR deforestation compliance data' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">{item.icon}{item.text}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-6">
                <NextLink href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-forest-700 font-bold hover:underline">
                  Apply for Exporter Access <ArrowRight className="w-4 h-4" />
                </NextLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS & METRICS ───────────────────────────────── */}
      <section className="w-full py-14 bg-coffee-50/70 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 md:px-10">
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 p-5 rounded-2xl bg-white/90 backdrop-blur-sm border border-coffee-200 text-center sm:text-left">
            {[
              { value: '48,000+', label: '60kg Jute Bags Direct Traded', color: 'text-coffee-950' },
              { value: '118M ETB', label: 'Direct Smallholder Payouts', color: 'text-gold-700' },
              { value: '0', label: 'Disputed Contracts Since Launch', color: 'text-forest-600' },
            ].map((s) => (
              <div key={s.label}>
                <span className={`text-2xl sm:text-3xl font-extrabold ${s.color}`}>{s.value}</span>
                <span className="block text-xs text-coffee-500 mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                quote: '"With Buna Fair Price on Telegram, I recorded a 20-second voice note in Afaan Oromoo. That evening I received 430 ETB/kg directly in my CBE Birr—34% more than local brokers offered."',
                name: 'Lemma Desta',
                role: 'Coffee Producer • Jimma Zone',
                avatar: 'LD',
                avatarBg: 'bg-gold-500',
              },
              {
                quote: '"Buna Fair gives us transparent cupping logs, exact GPS plots, and escrow clarity. We now source 40% of our single-origin Sidama directly through this platform."',
                name: 'Bethlehem K.',
                role: 'Director, Abyssinia Specialty Origin Labs',
                avatar: 'BK',
                avatarBg: 'bg-forest-600',
              },
            ].map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-white/95 backdrop-blur-sm border border-coffee-200 shadow-sm flex flex-col justify-between">
                <p className="text-sm text-coffee-800 italic leading-relaxed">{t.quote}</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-coffee-100">
                  <div className={`w-10 h-10 rounded-full ${t.avatarBg} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-coffee-900 block">{t.name}</span>
                    <span className="text-[11px] text-coffee-500">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BANNER ─────────────────────────────────────── */}
      <section className="w-full py-16 relative overflow-hidden bg-coffee-950 text-cream-100">
        {/* Subtle radial glows */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, #c42e1e 0%, transparent 50%), radial-gradient(circle at 80% 20%, #226e46 0%, transparent 40%)',
          }}
        />
        <div className="max-w-[1440px] mx-auto px-4 md:px-10 text-center flex flex-col items-center gap-5 relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold-300">
            Ethiopian coffee deserves a sovereign price
          </span>
          <h2 className="max-w-2xl text-2xl font-extrabold leading-tight tracking-tight text-cream-50 sm:text-4xl">
            Ready to Trade Coffee at Fair Ethiopian Market Value?
          </h2>
          <p className="text-sm max-w-lg text-coffee-300">
            Join over 14,000 smallholders and certified exporters on the official transparent exchange network.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <a
              href="https://t.me/BunaFairPriceBot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-cherry-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-cherry-500"
            >
              <Send className="w-4 h-4" />
              Launch Telegram Bot
            </a>
            <NextLink
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-white/15"
            >
              <ShieldCheck className="w-4 h-4" />
              Register as Verified Buyer
            </NextLink>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 pt-4 text-xs text-coffee-400">
            {['Telebirr & CBE Escrow', 'ECX floor protection', 'Coffee & Tea Authority'].map((badge) => (
              <span key={badge} className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest-300" /> {badge}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
