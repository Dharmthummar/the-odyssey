/**
 * THE ODYSSEY - MASTER APP CONTROLLER
 * Integrates audio, bowstring physics, scroll transitions, 3D tilt, and modals
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Audio Engine & Sound FX
  const bowAudio = new Audio('./bow.mp3');
  bowAudio.preload = 'auto';
  
  let isAudioPlaying = false;
  let hasTriggeredScrollRelease = false;
  let userMuted = false;
  
  // 2. DOM Elements
  const heroSection = document.getElementById('hero');
  const heroContent = document.getElementById('heroContent');
  const tensionBar = document.getElementById('tensionBarFill');
  const tensionValueText = document.getElementById('tensionValue');
  const shockwaveFlash = document.getElementById('shockwaveFlash');
  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const engageBowBtn = document.getElementById('engageBowBtn');
  
  // 3. Initialize Bow Physics Engine
  const bowEngine = new BowPhysicsEngine('bowCanvas', {
    onHoldStart: () => {
      // Every time user holds the string, play music immediately from start
      if (!userMuted) {
        bowAudio.currentTime = 0;
        bowAudio.play().then(() => {
          isAudioPlaying = true;
          if (audioToggleBtn) audioToggleBtn.classList.add('active');
        }).catch(() => {});
      }
    },
    onHoldEnd: () => {
      // User manual release before 3.5s
    },
    onTensionChange: (tension) => {
      // Dynamic tension updates
    },
    onRelease: ({ power, isApex }) => {
      // Trigger flash & screen shake
      if (shockwaveFlash) {
        shockwaveFlash.classList.add('active');
        setTimeout(() => shockwaveFlash.classList.remove('active'), 350);
      }
      
      // Camera shake effect on main wrapper
      document.body.classList.add('camera-shake');
      setTimeout(() => document.body.classList.remove('camera-shake'), 500);
      
      if (isApex || power > 0.6) {
        // Dissolve hero text
        if (heroContent) {
          heroContent.classList.add('dissolved');
        }
        
        // Glide smoothly into the underlying fixed cinema reel
        setTimeout(() => {
          window.scrollTo({
            top: window.innerHeight * 0.95,
            behavior: 'smooth'
          });
        }, 400);
      }
    }
  });
  
  // 4. Auto-release bow at 3.5 seconds of audio IF currently held by user
  bowAudio.addEventListener('timeupdate', () => {
    const curTime = bowAudio.currentTime;
    
    // Auto-release at 3.5s only if user is holding the string
    if (curTime >= 3.5 && (bowEngine.isDragging || bowEngine.tension > 0.1)) {
      bowEngine.forceRelease(true);
    }
  });
  
  // Reset hero interaction state whenever user returns to top
  window.addEventListener('scroll', () => {
    if (window.scrollY < 80) {
      hasTriggeredScrollRelease = false;
      if (heroContent) {
        heroContent.classList.remove('dissolved');
      }
    }
  }, { passive: true });

  // Click Engage Button: Smooth scroll down into the cinema track
  if (engageBowBtn) {
    engageBowBtn.addEventListener('click', () => {
      window.scrollTo({
        top: window.innerHeight * 0.95,
        behavior: 'smooth'
      });
    });
  }
  
  // Audio Toggle Button
  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      userMuted = !userMuted;
      bowAudio.muted = userMuted;
      audioToggleBtn.innerHTML = userMuted ?
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>` :
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    });
  }
  
  // 5. Initialize Video Controller
  const videoController = new ScrollVideoController();
  
  // 6. Initialize Da Vinci Lines Network
  const daVinciLines = new DaVinciLineNetwork('skillsSvgOverlay', '#skillsTagList');
  
  // 7. 3D Card Tilt Physics & Modal Inspection for Artifact Cards
  const relicData = {
    'helmet': {
      title: 'The Spartan Helm // Defy The Gods',
      category: 'TACTICAL RELIC • ARES',
      quote: '"Washed upon the desolate beach of Troy. A crest forged of Corinthian bronze and red horsehair, bearing the weight of ten years of slaughter."',
      image: './helmet.jpg',
      specs: [
        'Material: Hand-hammered Archaic Bronze & Gold Filigree',
        'Provenance: Recovered from the Scamander Shoreline (39.957° N, 26.238° E)',
        'Director Note: Shot on 70mm Panavision System 65 with natural Aegean dawn lighting',
        'Thematic Role: The illusion of mortal armor against Olympian destiny'
      ]
    },
    'horse': {
      title: 'The Trojan Construct // The Promethean Deception',
      category: 'ENGINEERING MARVEL • TIMBER TITAN',
      quote: '"A hollow offering that converted Greek defeat into catastrophic siege victory. The archetype of strategic temporal Trojan delivery."',
      image: './horse.jpg',
      specs: [
        'Dimensions: 38 meters height, 100-warrior capacity hollow belly',
        'Construction: Reclaimed Phoenician pine and shipwreck keels',
        'Director Note: Built as a fully functional physical timber practical effect on Malta coast',
        'Thematic Role: The structural architecture of deception and hubris'
      ]
    },
    'warrior': {
      title: 'The Wandering Tactician // Odysseus of Ithaca',
      category: 'EPIC PROTAGONIST • POLYTROPOS',
      quote: '"He who has traversed the underworld, resisted the Sirens song, and stood against Poseidons tempest to claim his rightful hearth."',
      image: './warrior.jpg',
      specs: [
        'Identity: Odysseus, King of Ithaca, Son of Laertes',
        'Curse: 10 years at war, 10 years adrift in the chronos currents',
        'Director Note: Psychological study of survivor guilt and temporal displacement',
        'Thematic Role: The solitary mortal mind battling infinite chronological chaos'
      ]
    }
  };

  const cards = document.querySelectorAll('.artifact-card-3d');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });

    card.addEventListener('click', () => {
      const relicKey = card.getAttribute('data-relic');
      const data = relicData[relicKey];
      if (!data) return;

      const modal = document.getElementById('infoModal');
      const modalTitle = document.getElementById('modalTitle');
      const modalBody = document.getElementById('modalBody');

      if (modal && modalTitle && modalBody) {
        modalTitle.textContent = data.title;
        modalBody.innerHTML = `
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 24px; align-items: start; margin-bottom: 24px;">
            <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--border-gold);">
              <img src="${data.image}" alt="${data.title}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
            </div>
            <div>
              <span class="imax-badge" style="display:inline-flex;margin-bottom:12px;">${data.category}</span>
              <blockquote style="font-family: var(--font-editorial); font-size: 1.25rem; font-style: italic; color: #cbd5e1; line-height: 1.5; border-left: 2px solid var(--gold-primary); padding-left: 16px; margin: 12px 0;">
                ${data.quote}
              </blockquote>
            </div>
          </div>
          <div style="margin-top: 16px;">
            <h4 style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--gold-primary); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px;">ARTIFACT SPECIFICATIONS & NOLAN PRODUCTION NOTES:</h4>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px;">
              ${data.specs.map(s => `<li style="font-family: var(--font-mono); font-size: 0.85rem; color: #94a3b8; display: flex; align-items: center; gap: 8px;"><span style="color: #ffd700;">▸</span> ${s}</li>`).join('')}
            </ul>
          </div>
        `;
        modal.classList.add('active');
      }
    });
  });
  
  // 8. Modal Handlers
  const modal = document.getElementById('infoModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  
  if (modalCloseBtn && modal) {
    modalCloseBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
  
  // ESC key to close modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal) {
      modal.classList.remove('active');
    }
  });
  
  // 9. Smooth Scroll for Navigation Anchors
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
