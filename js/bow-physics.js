/**
 * THE ODYSSEY - BOW STRING PHYSICS ENGINE
 * Real-time 2D Canvas harmonic oscillator, tension mechanics & continuous fluid sunlight-on-water reflection
 * (Unlimited repeatable stretching, instant audio re-trigger & 3.5s auto-release)
 */

class BowPhysicsEngine {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Normalized coordinates on odyssey 1.jpeg (1920x1080 standard)
    this.normTopTip = { x: 0.552, y: 0.128 };
    this.normBottomTip = { x: 0.487, y: 0.835 };
    this.normGrip = { x: 0.518, y: 0.485 };
    
    // World coordinates (computed on resize)
    this.topTip = { x: 0, y: 0 };
    this.bottomTip = { x: 0, y: 0 };
    this.restPoint = { x: 0, y: 0 };
    this.pullPoint = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    
    // Physics parameters
    this.isDragging = false;
    this.isVibrating = false;
    this.tension = 0; // 0.0 to 1.0
    this.maxDraw = 220; // max pixel stretch
    this.springK = 0.22;
    this.damping = 0.88;
    this.vibrationAmplitude = 0;
    this.vibrationTime = 0;
    this.holdStartTime = 0;
    
    // Particle system & Caustic ripples
    this.particles = [];
    this.shockwaves = [];
    
    // Auto-scroll tension state
    this.autoDrawActive = false;
    this.autoDrawProgress = 0;
    
    // Callbacks
    this.onTensionChange = options.onTensionChange || null;
    this.onRelease = options.onRelease || null;
    this.onHoldStart = options.onHoldStart || null;
    this.onHoldEnd = options.onHoldEnd || null;
    
    this.init();
  }
  
  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Bind interaction events
    this.bindEvents();
    
    // Start animation loop
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }
  
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    // Compute image cover bounds relative to viewport (16:9 aspect)
    const imgAspect = 1920 / 1080;
    const canvasAspect = this.width / this.height;
    let renderW, renderH, offsetX, offsetY;
    
    if (canvasAspect > imgAspect) {
      renderW = this.width;
      renderH = this.width / imgAspect;
      offsetX = 0;
      offsetY = (this.height - renderH) / 2;
    } else {
      renderH = this.height;
      renderW = this.height * imgAspect;
      offsetX = (this.width - renderW) / 2;
      offsetY = 0;
    }
    
    this.topTip = {
      x: offsetX + renderW * this.normTopTip.x,
      y: offsetY + renderH * this.normTopTip.y
    };
    
    this.bottomTip = {
      x: offsetX + renderW * this.normBottomTip.x,
      y: offsetY + renderH * this.normBottomTip.y
    };
    
    this.restPoint = {
      x: (this.topTip.x + this.bottomTip.x) / 2 + 10,
      y: (this.topTip.y + this.bottomTip.y) / 2
    };
    
    if (!this.isDragging && !this.autoDrawActive) {
      this.pullPoint = { ...this.restPoint };
    }
  }
  
  bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };
    
    const onStart = (e) => {
      const pos = getPos(e);
      // Distance from point to line segment
      const dist = this.distToSegment(pos, this.topTip, this.bottomTip);
      const distToPull = Math.hypot(pos.x - this.pullPoint.x, pos.y - this.pullPoint.y);
      
      // Allow grabbing the string at any time (unlimited repeatable stretches)
      if (dist < 60 || distToPull < 70) {
        this.isDragging = true;
        this.isVibrating = false;
        this.autoDrawActive = false;
        this.holdStartTime = performance.now();
        if (this.onHoldStart) {
          this.onHoldStart();
        }
        this.updatePull(pos);
      }
    };
    
    const onMove = (e) => {
      const pos = getPos(e);
      if (this.isDragging) {
        this.updatePull(pos);
      } else {
        const dist = this.distToSegment(pos, this.topTip, this.bottomTip);
        this.canvas.style.cursor = dist < 50 ? 'grab' : 'default';
      }
    };
    
    const onEnd = () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.onHoldEnd) {
          this.onHoldEnd();
        }
        this.releaseString(this.tension > 0.7);
      }
    };
    
    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    
    this.canvas.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  }
  
  distToSegment(p, v, w) {
    const l2 = Math.hypot(v.x - w.x, v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }
  
  updatePull(pos) {
    // Vector from rest point to mouse
    const dx = pos.x - this.restPoint.x;
    const dy = pos.y - this.restPoint.y;
    const dist = Math.hypot(dx, dy);
    
    // Clamp to max draw
    const clampedDist = Math.min(this.maxDraw, dist);
    const angle = Math.atan2(dy, dx);
    
    this.pullPoint = {
      x: this.restPoint.x + Math.cos(angle) * clampedDist,
      y: this.restPoint.y + Math.sin(angle) * clampedDist
    };
    
    this.tension = clampedDist / this.maxDraw;
    
    // Spawn cinematic streak motes while holding
    if (this.tension > 0.35 && Math.random() < 0.45) {
      this.spawnParticle(this.pullPoint.x, this.pullPoint.y);
    }
    
    if (this.onTensionChange) {
      this.onTensionChange(this.tension);
    }
  }
  
  forceRelease(isApex = true) {
    if (this.isDragging || this.tension > 0.05) {
      this.isDragging = false;
      this.releaseString(isApex);
    }
  }
  
  releaseString(isApexRelease = false) {
    const releasePower = Math.max(0.4, this.tension);
    this.isVibrating = true;
    this.vibrationAmplitude = releasePower * 48;
    this.vibrationTime = 0;
    
    // Spawn bursting crystalline water-light shockwave
    this.shockwaves.push({
      x: this.pullPoint.x,
      y: this.pullPoint.y,
      radius: 5,
      maxRadius: isApexRelease ? 580 : 280,
      opacity: 1,
      power: releasePower
    });
    
    // Spawn cloud of anamorphic light streaks
    const particleCount = isApexRelease ? 110 : Math.floor(releasePower * 45);
    for (let i = 0; i < particleCount; i++) {
      this.spawnParticle(this.pullPoint.x, this.pullPoint.y, true);
    }
    
    if (this.onRelease) {
      this.onRelease({
        power: releasePower,
        isApex: isApexRelease
      });
    }
  }
  
  spawnParticle(x, y, isBurst = false) {
    const speed = isBurst ? Math.random() * 9 + 3 : Math.random() * 3 + 1;
    const angle = isBurst ? Math.random() * Math.PI * 2 : (Math.random() - 0.5) * Math.PI + Math.PI;
    
    // Crystalline streak colors
    const colorPalette = ['#ffffff', '#ffffff', '#f0f9ff', '#e0f2fe', '#bae6fd'];
    const selectedColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    
    this.particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: Math.random() * 0.03 + 0.02,
      length: Math.random() * 12 + 6,
      color: selectedColor
    });
  }
  
  updatePhysics(dt) {
    // String vibration after release
    if (this.isVibrating) {
      this.vibrationTime += dt * 38;
      const decay = Math.exp(-this.vibrationTime * 0.08);
      const offset = Math.sin(this.vibrationTime) * this.vibrationAmplitude * decay;
      
      this.pullPoint.x = this.restPoint.x + offset;
      this.pullPoint.y = this.restPoint.y;
      
      this.tension = (this.vibrationAmplitude * decay) / this.maxDraw;
      if (this.onTensionChange) this.onTensionChange(Math.max(0, this.tension));
      
      if (decay < 0.01) {
        this.isVibrating = false;
        this.pullPoint = { ...this.restPoint };
        this.tension = 0;
        if (this.onTensionChange) this.onTensionChange(0);
      }
    }
    
    // Update streak particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    
    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 14;
      sw.opacity = Math.max(0, 1 - (sw.radius / sw.maxRadius));
      if (sw.opacity <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    const now = performance.now() * 0.0025;
    
    // 1. Draw Crystalline Shockwaves
    for (const sw of this.shockwaves) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${sw.opacity * 0.95})`;
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 24;
      this.ctx.stroke();
      
      // Secondary caustic shimmer ring
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, Math.max(1, sw.radius * 0.84), 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(224, 242, 254, ${sw.opacity * 0.6})`;
      this.ctx.lineWidth = 1.0;
      this.ctx.shadowColor = 'rgba(186, 230, 253, 0.6)';
      this.ctx.shadowBlur = 12;
      this.ctx.stroke();
      this.ctx.restore();
    }
    
    // 2. Draw Sleek Glass Bowstring with Continuous Fluid Sunlight Refraction (Zero Dots)
    this.ctx.save();
    
    // Generate seamless fluid caustic sunlight gradient
    const createFluidSunGradient = (p1, p2, phaseOffset) => {
      const grad = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      const wave = (Math.sin(now * 2.2 + phaseOffset) + 1) / 2;
      
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.45)');
      grad.addColorStop(Math.min(0.9, Math.max(0.1, 0.22 + wave * 0.1)), 'rgba(224, 242, 254, 0.9)');
      grad.addColorStop(Math.min(0.9, Math.max(0.1, 0.48 + wave * 0.14)), 'rgba(255, 255, 255, 1.0)'); // Liquid sun glare
      grad.addColorStop(Math.min(0.9, Math.max(0.1, 0.68 + wave * 0.08)), 'rgba(186, 230, 253, 0.7)');
      grad.addColorStop(Math.min(0.9, Math.max(0.1, 0.84 - wave * 0.06)), 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.45)');
      return grad;
    };
    
    // LAYER A: Outer Soft Ethereal Water-Caustic Glow
    this.ctx.beginPath();
    this.ctx.moveTo(this.topTip.x, this.topTip.y);
    this.ctx.lineTo(this.pullPoint.x, this.pullPoint.y);
    this.ctx.lineTo(this.bottomTip.x, this.bottomTip.y);
    this.ctx.strokeStyle = 'rgba(224, 242, 254, 0.3)';
    this.ctx.lineWidth = 2.2;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
    this.ctx.shadowBlur = 10 + this.tension * 8;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
    
    // LAYER B: Upper String Segment — Continuous Specular Ribbon
    const topGrad = createFluidSunGradient(this.topTip, this.pullPoint, 0);
    this.ctx.beginPath();
    this.ctx.moveTo(this.topTip.x, this.topTip.y);
    this.ctx.lineTo(this.pullPoint.x, this.pullPoint.y);
    this.ctx.strokeStyle = topGrad;
    this.ctx.lineWidth = 1.0;
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 5;
    this.ctx.stroke();
    
    // LAYER C: Lower String Segment — Continuous Specular Ribbon
    const botGrad = createFluidSunGradient(this.pullPoint, this.bottomTip, Math.PI);
    this.ctx.beginPath();
    this.ctx.moveTo(this.pullPoint.x, this.pullPoint.y);
    this.ctx.lineTo(this.bottomTip.x, this.bottomTip.y);
    this.ctx.strokeStyle = botGrad;
    this.ctx.lineWidth = 1.0;
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 5;
    this.ctx.stroke();
    
    // LAYER D: Sleek Crystalline Geometric Diamond Nock (No Clumsy Bulbous Dots)
    if (this.tension > 0.05) {
      const diamondSize = 3 + this.tension * 3;
      this.ctx.save();
      this.ctx.translate(this.pullPoint.x, this.pullPoint.y);
      this.ctx.rotate(Math.PI / 4);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 14 + this.tension * 10;
      this.ctx.fillRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
      this.ctx.restore();
      
      // Thin razor-sharp crosshair flare on tension
      if (this.tension > 0.25) {
        const flareSpan = 8 + this.tension * 16;
        this.ctx.beginPath();
        this.ctx.moveTo(this.pullPoint.x - flareSpan, this.pullPoint.y);
        this.ctx.lineTo(this.pullPoint.x + flareSpan, this.pullPoint.y);
        this.ctx.moveTo(this.pullPoint.x, this.pullPoint.y - flareSpan * 0.7);
        this.ctx.lineTo(this.pullPoint.x, this.pullPoint.y + flareSpan * 0.7);
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + this.tension * 0.55})`;
        this.ctx.lineWidth = 0.85;
        this.ctx.stroke();
      }
    }
    
    this.ctx.restore();
    
    // 3. Render Cinematic Light Streaks / Anamorphic Rays (Instead of Dots)
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.beginPath();
      // Draw as a tapered light streak along trajectory
      const tailX = p.x - p.vx * 2.2;
      const tailY = p.y - p.vy * 2.2;
      this.ctx.moveTo(tailX, tailY);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.strokeStyle = p.color;
      this.ctx.lineWidth = Math.max(0.7, p.length * 0.12);
      this.ctx.globalAlpha = p.life * 0.9;
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 6;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
      this.ctx.restore();
    }
  }
  
  animate(time) {
    const dt = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;
    
    this.updatePhysics(dt);
    this.render();
    
    requestAnimationFrame(this.animate);
  }
}

window.BowPhysicsEngine = BowPhysicsEngine;
