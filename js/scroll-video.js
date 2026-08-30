/**
 * THE ODYSSEY - FULL 100% BIDIRECTIONAL SCROLL VIDEO CONTROLLER
 * Controls video forward/reverse scrubbing with scroll up/down, title cards & sequential section reveal
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
    
    // Bidirectional scrubbing state
    this.targetProgress = 0;
    this.smoothProgress = 0;
    this.targetTime = 0;
    this.smoothTime = 0;
    this.isSeeking = false;
    this.lastSeekTime = 0;
    this.scrollVelocity = 0;
    this.lastScrollY = 0;
    this.lastScrollTimestamp = performance.now();
    this.scrollTimeout = null;
    
    this.init();
  }
  
  init() {
    if (!this.video || !this.cinemaTrack) return;
    
    // Video configuration for instant hardware frame seeking
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'auto';
    this.video.pause(); // keep paused so scroll dictates exact frames bidirectionally
    
    // Non-blocking seek event listeners
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
    
    // Progress through the cinema track (0.0 at top to 1.0 at video end)
    const trackScrolled = -rect.top;
    this.targetProgress = Math.max(0, Math.min(1, trackScrolled / maxTrackScroll));
    
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.scrollVelocity = 0;
    }, 150);
  }
  
  rafLoop() {
    // 1. Bidirectional Lerp
    const lerpFactor = 0.18;
    this.smoothProgress += (this.targetProgress - this.smoothProgress) * lerpFactor;
    
    // 2. Landing Image Layer fade out on first 12% of cinema track scroll
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
    
    // 3. Bidirectional video scrub — throttled to 120ms to prevent decoder lag
    if (this.video && this.video.duration && !isNaN(this.video.duration)) {
      // video plays from 0→100% across 8%→100% of cinema track scroll
      const videoProg = Math.max(0, Math.min(1, (this.smoothProgress - 0.08) / 0.92));
      this.targetTime = videoProg * this.video.duration;
      
      // Lerp smoothTime towards targetTime
      this.smoothTime += (this.targetTime - this.smoothTime) * 0.22;
      
      const now = performance.now();
      const timeDiff = Math.abs(this.video.currentTime - this.smoothTime);
      
      // Only seek if: not already seeking, meaningful time gap, and throttled to 120ms
      if (!this.isSeeking && timeDiff > 0.08 && (now - this.lastSeekTime > 120)) {
        try {
          if ('fastSeek' in this.video) {
            this.video.fastSeek(this.smoothTime);
          } else {
            this.video.currentTime = this.smoothTime;
          }
          this.lastSeekTime = now;
        } catch (e) { /* ignore */ }
      }
      
      if (this.scrollProgressText) {
        this.scrollProgressText.textContent = `REEL SYNC: ${Math.round(videoProg * 100)}%`;
      }
      
      // 4. Nolan title cards across video timeline
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
