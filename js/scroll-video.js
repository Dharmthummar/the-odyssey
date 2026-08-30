/**
 * THE ODYSSEY - HIGH-PERFORMANCE 60FPS DUAL-MODE SCROLL VIDEO CONTROLLER
 * Uses hardware-accelerated forward streaming & non-blocking reverse seek for butter-smooth scrubbing
 */

class ScrollVideoController {
  constructor() {
    this.cinemaTrack = document.getElementById('cinemaTrack');
    this.video = document.getElementById('mainVideo');
    this.imageLayer = document.getElementById('stageImageLayer');
    this.transitionVeil = document.getElementById('transitionVeil');
    this.scrollProgressText = document.getElementById('scrollProgressText');
    this.scrollIndicator = document.getElementById('scrollIndicator');
    this.soundBtn = document.getElementById('videoSoundBtn');
    this.reelButtons = document.querySelectorAll('.reel-pill-btn');
    
    this.titleCards = [
      document.getElementById('scrollTitle1'),
      document.getElementById('scrollTitle2'),
      document.getElementById('scrollTitle3')
    ];
    
    this.reels = [
      './odyssey 1.mp4',
      './odyssey 2.mp4',
      './odyssey 2a.mp4'
    ];
    
    this.currentReelIndex = 0;
    this.isAudioMuted = true;
    
    // Smoothing & Scrubbing Physics State
    this.targetProgress = 0;
    this.smoothProgress = 0;
    this.targetTime = 0;
    this.isSeeking = false;
    this.lastSeekTime = 0;
    this.lastScrollY = 0;
    this.lastScrollTimestamp = performance.now();
    this.scrollVelocity = 0;
    this.isPlayingForward = false;
    this.idleTimeout = null;
    
    this.init();
  }
  
  init() {
    if (!this.video || !this.cinemaTrack) return;
    
    // Configure video for maximum hardware-accelerated playback
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'auto';
    this.video.pause();
    
    // Seek tracking locks
    this.video.addEventListener('seeked', () => {
      this.isSeeking = false;
    });
    
    this.video.addEventListener('seeking', () => {
      this.isSeeking = true;
    });
    
    // Bind reel switcher
    this.reelButtons.forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchReel(index);
      });
    });
    
    // Bind video audio toggle
    if (this.soundBtn) {
      this.soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isAudioMuted = !this.isAudioMuted;
        this.video.muted = this.isAudioMuted;
        this.soundBtn.innerHTML = this.isAudioMuted ?
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>` :
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
      });
    }
    
    // Bind window scroll listener
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    
    // Start 60fps RAF Render Loop
    this.rafLoop = this.rafLoop.bind(this);
    requestAnimationFrame(this.rafLoop);
    
    this.onScroll();
  }
  
  onScroll() {
    const scrollY = window.scrollY;
    const now = performance.now();
    const dt = Math.max(1, now - this.lastScrollTimestamp);
    
    this.scrollVelocity = Math.abs(scrollY - this.lastScrollY) / dt;
    this.lastScrollY = scrollY;
    this.lastScrollTimestamp = now;
    
    const rect = this.cinemaTrack.getBoundingClientRect();
    const trackH = this.cinemaTrack.offsetHeight;
    const windowH = window.innerHeight;
    const maxTrackScroll = Math.max(1, trackH - windowH);
    
    // Progress through the cinema track (0.0 to 1.0)
    const trackScrolled = -rect.top;
    this.targetProgress = Math.max(0, Math.min(1, trackScrolled / maxTrackScroll));
    
    clearTimeout(this.idleTimeout);
    this.idleTimeout = setTimeout(() => {
      this.scrollVelocity = 0;
      if (this.video && !this.video.paused) {
        this.video.pause();
        this.isPlayingForward = false;
      }
    }, 120);
  }
  
  rafLoop() {
    // 1. Silky Smooth Spring Interpolation
    const lerpFactor = this.scrollVelocity > 1.5 ? 0.22 : 0.15;
    this.smoothProgress += (this.targetProgress - this.smoothProgress) * lerpFactor;
    
    // 2. Landing Image Layer Fade
    if (this.imageLayer) {
      if (this.smoothProgress <= 0.02) {
        this.imageLayer.style.opacity = '1';
        this.imageLayer.style.transform = 'scale(1)';
        this.imageLayer.style.filter = 'blur(0px)';
        this.imageLayer.style.pointerEvents = 'auto';
        this.imageLayer.style.visibility = 'visible';
        if (this.transitionVeil) this.transitionVeil.style.opacity = '0';
        if (this.scrollIndicator) this.scrollIndicator.style.opacity = '0.8';
      } else if (this.smoothProgress < 0.12) {
        const transT = (this.smoothProgress - 0.02) / 0.10;
        this.imageLayer.style.opacity = `${Math.max(0, 1 - transT)}`;
        this.imageLayer.style.transform = `scale(${1 + transT * 0.08})`;
        this.imageLayer.style.filter = `blur(${transT * 6}px)`;
        this.imageLayer.style.pointerEvents = transT > 0.5 ? 'none' : 'auto';
        this.imageLayer.style.visibility = 'visible';
        if (this.transitionVeil) {
          this.transitionVeil.style.opacity = `${Math.sin(transT * Math.PI) * 0.6}`;
        }
        if (this.scrollIndicator) {
          this.scrollIndicator.style.opacity = `${Math.max(0, 1 - transT * 3)}`;
        }
      } else {
        this.imageLayer.style.opacity = '0';
        this.imageLayer.style.pointerEvents = 'none';
        this.imageLayer.style.visibility = 'hidden';
        if (this.transitionVeil) this.transitionVeil.style.opacity = '0';
        if (this.scrollIndicator) this.scrollIndicator.style.opacity = '0';
      }
    }
    
    // 3. High-Performance Dual-Mode 60FPS Video Scrubbing
    if (this.video && this.video.duration && !isNaN(this.video.duration)) {
      const videoProg = Math.max(0, Math.min(1, (this.smoothProgress - 0.08) / 0.92));
      this.targetTime = videoProg * this.video.duration;
      
      const timeDiff = this.targetTime - this.video.currentTime;
      const now = performance.now();
      
      // MODE A: FORWARD SCRUBBING (Hardware Accelerated Smooth Streaming)
      if (timeDiff > 0.04) {
        if (timeDiff > 1.2) {
          // Fast jump for large sudden scroll jumps
          if (!this.isSeeking && (now - this.lastSeekTime > 40)) {
            if ('fastSeek' in this.video) {
              this.video.fastSeek(this.targetTime);
            } else {
              this.video.currentTime = this.targetTime;
            }
            this.lastSeekTime = now;
          }
        } else {
          // Dynamic adaptive rate playback (Butter-smooth 60fps hardware decoding)
          const adaptiveRate = Math.max(0.5, Math.min(4.0, timeDiff * 4.5));
          this.video.playbackRate = adaptiveRate;
          
          if (this.video.paused) {
            this.video.play().catch(() => {});
            this.isPlayingForward = true;
          }
        }
      }
      // MODE B: REVERSE SCRUBBING (Smooth Non-Blocking Seeking)
      else if (timeDiff < -0.04) {
        if (!this.video.paused) {
          this.video.pause();
          this.isPlayingForward = false;
        }
        
        if (!this.isSeeking && (now - this.lastSeekTime > 35)) {
          if ('fastSeek' in this.video) {
            this.video.fastSeek(this.targetTime);
          } else {
            this.video.currentTime = this.targetTime;
          }
          this.lastSeekTime = now;
        }
      }
      // MODE C: IDLE / CONVERGED
      else {
        if (!this.video.paused && !this.isPlayingForward) {
          this.video.pause();
        }
      }
      
      if (this.scrollProgressText) {
        this.scrollProgressText.textContent = `REEL SYNC: ${Math.round(videoProg * 100)}%`;
      }
      
      // 4. Nolan Title Cards Active Milestones
      if (this.titleCards[0]) {
        this.titleCards[0].classList.toggle('active', videoProg >= 0.15 && videoProg < 0.42);
      }
      if (this.titleCards[1]) {
        this.titleCards[1].classList.toggle('active', videoProg >= 0.45 && videoProg < 0.72);
      }
      if (this.titleCards[2]) {
        this.titleCards[2].classList.toggle('active', videoProg >= 0.75 && videoProg <= 0.98);
      }
    }
    
    requestAnimationFrame(this.rafLoop);
  }
  
  switchReel(index) {
    if (index === this.currentReelIndex) return;
    this.currentReelIndex = index;
    
    this.reelButtons.forEach((btn, idx) => {
      btn.classList.toggle('active', idx === index);
    });
    
    const currTime = this.video.currentTime;
    this.video.style.opacity = '0.3';
    
    setTimeout(() => {
      this.video.src = this.reels[index];
      this.video.load();
      this.video.currentTime = currTime || 0;
      this.video.style.opacity = '1';
    }, 150);
  }
}

window.ScrollVideoController = ScrollVideoController;
