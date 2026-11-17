"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * NoiseGradient: an atmospheric, domain-warped colour field (raw WebGL1, no deps).
 *
 * Layers, in order:
 *  1. a warped fbm field mapped through a 4-stop pastel ramp (smooth diffusion, no blobs)
 *  2. a deep colour (indigo) flowing in from the lower edges
 *  3. thin accent veins (gold)
 *  4. a calm zone that quiets the field behind the type
 *  5. fine film grain at full resolution
 *
 * Two passes: the field (1–4) renders at ~40% resolution into a texture; a cheap
 * full-resolution pass upscales it (bilinear, as CSS would) and applies the grain.
 * The grain is the same SVG turbulence tile and the same soft-light + multiply
 * blending the former CSS overlays used, computed in the shader instead of by two
 * full-frame mix-blend-mode layers recomposited 30 times a second.
 *
 * ~30fps, only while on screen. Reduced motion → one still frame, no pointer.
 * No WebGL → CSS gradient + CSS grain fallback. Recovers from context loss.
 */

export type GradientPalette = {
  /** Four pastel stops, light to warm. */
  pastels: [string, string, string, string];
  /** Deep anchor colour. */
  deep: string;
  /** Accent veins. */
  accent: string;
  /** Colour of the calm zone behind type. */
  calm: string;
};

export type NoiseGradientProps = {
  palette: GradientPalette;
  /** Movement speed multiplier (1 = slow drift). */
  speed?: number;
  /** Domain-warp strength 0–2. */
  distortion?: number;
  /** Amount of the deep colour 0–1. */
  deepAmount?: number;
  /** Amount of the accent veins 0–1. */
  accentAmount?: number;
  /** Calm zone: centre in 0–1 (y from top), radius and strength. */
  calm?: { x: number; y: number; radius: number; amount: number };
  /** Pointer influence 0–1 (0 disables pointer tracking). */
  pointer?: number;
  /** Grain opacity 0–1. */
  grain?: number;
  /** Noise scale; larger = finer structure. */
  scale?: number;
  seed?: number;
  className?: string;
  style?: CSSProperties;
};

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uScale, uSeed, uDistortion, uDeepAmt, uAccentAmt, uPointerAmt;
uniform vec3 uPal0, uPal1, uPal2, uPal3, uDeep, uAccent, uCalmCol;
uniform vec4 uCalm;      // x, y (0 top), radius, amount
uniform vec2 uPointer;   // 0–1, y from top

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ return 0.62*snoise(p) + 0.28*snoise(p*2.03+11.7) + 0.10*snoise(p*4.01+3.1); }
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;            // y up
  vec2 uvt = vec2(uv.x, 1.0 - uv.y);            // y from top
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * uScale;
  float t = uTime * 0.09 + uSeed;

  // pointer: a soft local swirl in the field
  vec2 pp = vec2(uPointer.x * aspect, 1.0 - uPointer.y) * uScale;
  vec2 dp = p - pp; float pd = dot(dp, dp);
  p += vec2(-dp.y, dp.x) * uPointerAmt * 0.55 * exp(-pd * 3.0);

  // two-level domain warp → fluid folds
  vec2 w1 = vec2(fbm(vec3(p * 0.55, t)), fbm(vec3(p * 0.55 + 5.2, t + 1.7)));
  vec2 w2 = vec2(fbm(vec3(p * 0.9 + w1 * 1.3 + 1.7, t * 0.8)), fbm(vec3(p * 0.9 + w1 * 1.3 + 9.2, t * 0.8 + 2.3)));
  vec2 q = p + w2 * uDistortion + vec2(t * 0.25, -t * 0.12);

  // 1. pastel ramp
  float f = clamp(snoise(vec3(q * 0.6, t * 0.6)) * 0.6 + 0.08 * snoise(vec3(q * 1.7, t)) + 0.5, 0.0, 1.0);
  vec3 col = mix(uPal0, uPal1, smoothstep(0.05, 0.42, f));
  col = mix(col, uPal2, smoothstep(0.35, 0.68, f));
  col = mix(col, uPal3, smoothstep(0.62, 0.95, f));

  // 2. deep colour rising from the bottom and side edges
  float edge = smoothstep(0.25, 0.75, abs(uv.x - 0.5) * 1.4);
  float d = fbm(vec3(q * 0.5 + 3.3, t * 0.5)) * 0.5 + 0.5;
  float dm = smoothstep(0.42, 0.95, d * 0.85 + (0.42 - uv.y) * 1.25 + edge * 0.35);
  col = mix(col, uDeep, dm * uDeepAmt);
  // lift the indigo slightly where it meets the pastels (dimensional rim)
  col += (uPal0 - col) * 0.18 * smoothstep(0.15, 0.5, dm) * (1.0 - smoothstep(0.5, 0.9, dm));

  // 3. gold veins: broad, soft ridges of a low-frequency noise (diffused, never marbled)
  float a = snoise(vec3(q * 0.6 + 9.1, t * 0.6));
  float vein = 1.0 - smoothstep(0.0, 0.32, abs(a - 0.2));
  vein *= vein;
  col = mix(col, uAccent, vein * uAccentAmt * (0.55 + 0.45 * (1.0 - dm)));

  // 4. calm zone behind the headline
  vec2 cd = (uvt - uCalm.xy) * vec2(aspect * 0.62, 1.0);
  float calm = 1.0 - smoothstep(uCalm.z * 0.35, uCalm.z, length(cd));
  col = mix(col, uCalmCol, calm * uCalm.w);

  col += (hash(gl_FragCoord.xy) - 0.5) * 0.012; // dither
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Pass 2: bilinear upscale of the field + film grain (W3C soft-light, then multiply). */
const POST = `
precision mediump float;
uniform sampler2D uField;
uniform sampler2D uGrain;
uniform vec2 uFull;      // canvas size in device px
uniform float uDpr;      // device px per CSS px
uniform float uSoft;     // soft-light layer opacity
uniform float uMul;      // multiply layer opacity
uniform float uGrainOn;
vec3 softLight(vec3 cb, vec3 cs){
  vec3 dcb = mix(((16.0 * cb - 12.0) * cb + 4.0) * cb, sqrt(cb), step(0.25, cb));
  return mix(cb - (1.0 - 2.0 * cs) * cb * (1.0 - cb), cb + (2.0 * cs - 1.0) * (dcb - cb), step(0.5, cs));
}
void main(){
  vec3 c = texture2D(uField, gl_FragCoord.xy / uFull).rgb;
  if (uGrainOn > 0.5) {
    vec2 css = vec2(gl_FragCoord.x, uFull.y - gl_FragCoord.y) / uDpr; // CSS px from top-left
    vec4 g1 = texture2D(uGrain, fract(css / 150.0));                   // background-size 150px
    vec4 g2 = texture2D(uGrain, fract((css - vec2(37.0, 53.0)) / 110.0)); // 110px at 37px 53px
    c = mix(c, softLight(c, g1.rgb), g1.a * uSoft);
    c = mix(c, c * g2.rgb, g2.a * uMul);
  }
  gl_FragColor = vec4(c, 1.0);
}
`;

const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.15' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.17  0 0 0 0 0.3  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;

/** The grain tile rasterised once by the browser (exactly what the CSS overlay drew). */
let grainTile: Promise<HTMLCanvasElement> | null = null;
function loadGrainTile() {
  grainTile ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 180;
      c.height = 180;
      c.getContext("2d")!.drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml,${encodeURIComponent(GRAIN_SVG).replace(/%2523/g, "%23")}`;
  });
  return grainTile;
}

const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.15' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.17  0 0 0 0 0.3  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
).replace(/%2523/g, "%23")}")`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function fallbackGradient({ pastels, deep, accent, calm }: GradientPalette) {
  return [
    `radial-gradient(42% 38% at 50% 34%, ${calm} 0%, transparent 100%)`,
    `radial-gradient(70% 55% at 50% 115%, ${deep} 0%, transparent 70%)`,
    `radial-gradient(30% 40% at 92% 80%, ${deep}cc 0%, transparent 70%)`,
    `radial-gradient(35% 40% at 78% 30%, ${pastels[3]} 0%, transparent 70%)`,
    `radial-gradient(30% 30% at 70% 55%, ${accent}55 0%, transparent 70%)`,
    `radial-gradient(45% 50% at 15% 25%, ${pastels[1]} 0%, transparent 70%)`,
    `radial-gradient(40% 45% at 22% 70%, ${pastels[2]} 0%, transparent 70%)`,
    pastels[0],
  ].join(",");
}

const DEFAULT_CALM = { x: 0.5, y: 0.35, radius: 0.55, amount: 0.75 };

export function NoiseGradient({
  palette,
  speed = 1,
  distortion = 1,
  deepAmount = 0.9,
  accentAmount = 0.6,
  calm = DEFAULT_CALM,
  pointer = 0.5,
  grain = 0.5,
  scale = 1.3,
  seed = 0,
  className,
  style,
}: NoiseGradientProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generation, setGeneration] = useState(0); // bumps after a WebGL context restore
  const paletteKey = JSON.stringify(palette);
  const calmKey = `${calm.x},${calm.y},${calm.radius},${calm.amount}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: "low-power" });
    if (!gl || gl.isContextLost()) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("NoiseGradient shader:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const link = (fsSrc: string) => {
      const vs = compile(gl.VERTEX_SHADER, VERT);
      const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
      if (!vs || !fs) return null;
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null;
    };
    const prog = link(FRAG);
    const post = link(POST);
    if (!prog || !post) return;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const pr of [prog, post]) {
      const loc = gl.getAttribLocation(pr, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    // Pass 1 uniforms (constant ones set once)
    gl.useProgram(prog);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const pal: GradientPalette = JSON.parse(paletteKey);
    pal.pastels.forEach((c, i) => gl.uniform3fv(u(`uPal${i}`), hexToRgb(c)));
    gl.uniform3fv(u("uDeep"), hexToRgb(pal.deep));
    gl.uniform3fv(u("uAccent"), hexToRgb(pal.accent));
    gl.uniform3fv(u("uCalmCol"), hexToRgb(pal.calm));
    const [cx, cy, cr, ca] = calmKey.split(",").map(Number);
    gl.uniform4f(u("uCalm"), cx, cy, cr, ca);
    gl.uniform1f(u("uScale"), scale);
    gl.uniform1f(u("uSeed"), seed);
    gl.uniform1f(u("uDistortion"), distortion);
    gl.uniform1f(u("uDeepAmt"), deepAmount);
    gl.uniform1f(u("uAccentAmt"), accentAmount);
    const uRes = u("uRes"), uTime = u("uTime"), uPointer = u("uPointer"), uPointerAmt = u("uPointerAmt");

    // Pass 2 uniforms
    gl.useProgram(post);
    const v = (n: string) => gl.getUniformLocation(post, n);
    gl.uniform1i(v("uField"), 0);
    gl.uniform1i(v("uGrain"), 1);
    gl.uniform1f(v("uSoft"), Math.min(1, grain * 1.1)); // same opacities as the former CSS layers
    gl.uniform1f(v("uMul"), grain * 0.22);
    gl.uniform1f(v("uGrainOn"), 0);
    const uFull = v("uFull"), uDpr = v("uDpr"), uGrainOn = v("uGrainOn");

    // Field render target (low resolution, bilinear when sampled)
    const fieldTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();

    // Grain tile (loaded once per page, shared by every gradient)
    let grainTex: WebGLTexture | null = null;
    let disposed = false;
    if (grain > 0) {
      loadGrainTile()
        .then((tile) => {
          if (disposed || gl.isContextLost()) return;
          grainTex = gl.createTexture();
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, grainTex);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tile);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.activeTexture(gl.TEXTURE0);
          gl.useProgram(post);
          gl.uniform1f(uGrainOn, 1);
          wrap.dataset.grain = "gl"; // hides the CSS grain overlays
          draw();
        })
        .catch(() => {
          /* keep the CSS grain overlays */
        });
    }

    // Field at ~40% (30% on small or low-power devices); output at CSS size × DPR (max 1.5).
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    let seen = "";
    let dpr = 1;
    let fw = 1, fh = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const k = lowPower || wrap.clientWidth < 700 ? 0.3 : 0.4;
      const cw = Math.max(1, Math.round(wrap.clientWidth * dpr));
      const ch = Math.max(1, Math.round(wrap.clientHeight * dpr));
      const key = `${cw}x${ch}@${k}`;
      if (key === seen) return;
      seen = key;
      canvas.width = cw;
      canvas.height = ch;
      fw = Math.max(1, Math.round(wrap.clientWidth * k));
      fh = Math.max(1, Math.round(wrap.clientHeight * k));
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(prog);
      gl.uniform2f(uRes, fw, fh);
      gl.useProgram(post);
      gl.uniform2f(uFull, cw, ch);
      gl.uniform1f(uDpr, dpr);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ptr = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4, amt: 0, tamt: 0 };
    let raf = 0;
    let visible = false;
    let last = performance.now();
    let time = seed * 10;

    const draw = () => {
      if (gl.isContextLost()) return;
      resize();
      ptr.x += (ptr.tx - ptr.x) * 0.06;
      ptr.y += (ptr.ty - ptr.y) * 0.06;
      ptr.amt += (ptr.tamt - ptr.amt) * 0.05;
      // pass 1: field → texture
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, fw, fh);
      gl.useProgram(prog);
      gl.uniform2f(uPointer, ptr.x, ptr.y);
      gl.uniform1f(uPointerAmt, ptr.amt);
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // pass 2: upscale + grain → canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(post);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTex);
      if (grainTex) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, grainTex);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = now - last;
      if (dt < 32) return;
      time += (Math.min(dt, 100) / 1000) * speed;
      last = now;
      draw();
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (reduce.matches) {
        draw();
        return;
      }
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => cancelAnimationFrame(raf);

    const onPointer = (e: PointerEvent) => {
      if (reduce.matches || pointer <= 0) return;
      const r = wrap.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      ptr.tamt = inside ? pointer : 0;
      if (inside) {
        ptr.tx = (e.clientX - r.left) / r.width;
        ptr.ty = (e.clientY - r.top) / r.height;
      }
    };
    if (pointer > 0) window.addEventListener("pointermove", onPointer, { passive: true });

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(wrap);
    const ro = new ResizeObserver(() => {
      if (!visible || reduce.matches) draw();
    });
    ro.observe(wrap);
    const onReduce = () => (visible ? start() : undefined);
    reduce.addEventListener("change", onReduce);

    // Context loss: stop drawing and show the CSS fallback; a restore re-runs this effect.
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
      delete canvas.dataset.ready;
      delete wrap.dataset.grain;
    };
    const onRestored = () => setGeneration((g) => g + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    draw();
    canvas.dataset.ready = "true";

    // No loseContext() on cleanup: a canvas keeps one context for life, and React may
    // re-run this effect on the same canvas (Strict Mode, HMR).
    return () => {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      reduce.removeEventListener("change", onReduce);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (!gl.isContextLost()) {
        gl.deleteProgram(prog);
        gl.deleteProgram(post);
        gl.deleteBuffer(buf);
        gl.deleteTexture(fieldTex);
        gl.deleteTexture(grainTex);
        gl.deleteFramebuffer(fbo);
      }
      delete canvas.dataset.ready;
      delete wrap.dataset.grain;
    };
  }, [paletteKey, calmKey, speed, distortion, deepAmount, accentAmount, pointer, scale, seed, grain, generation]);

  const positioned = /\b(absolute|fixed|sticky)\b/.test(className ?? "");
  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      // rounded-[inherit]: the blend group takes its parent's corners, so the blended grain
      // never composites outside a rounded container's clip
      className={`${positioned ? "" : "relative"} group isolate overflow-hidden rounded-[inherit] ${className ?? ""}`}
      style={{ background: fallbackGradient(palette), ...style }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full opacity-0 transition-opacity duration-1000 data-[ready=true]:opacity-100"
      />
      {grain > 0 && (
        <>
          {/* CSS grain: fallback until (or unless) the shader pass draws the same grain */}
          <span
            className="pointer-events-none absolute inset-0 mix-blend-soft-light group-data-[grain=gl]:hidden"
            style={{ backgroundImage: GRAIN_URL, backgroundSize: "150px 150px", opacity: Math.min(1, grain * 1.1) }}
          />
          <span
            className="pointer-events-none absolute inset-0 mix-blend-multiply group-data-[grain=gl]:hidden"
            style={{ backgroundImage: GRAIN_URL, backgroundSize: "110px 110px", backgroundPosition: "37px 53px", opacity: grain * 0.22 }}
          />
        </>
      )}
    </div>
  );
}
