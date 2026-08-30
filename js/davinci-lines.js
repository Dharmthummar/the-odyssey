/**
 * THE ODYSSEY - DA VINCI SACRED GEOMETRY LINE NETWORK
 * Dynamic SVG line drawing, connecting tag nodes & golden energy pulses
 */

class DaVinciLineNetwork {
  constructor(svgContainerId, tagListSelector) {
    this.svg = document.getElementById(svgContainerId);
    this.tagList = document.querySelector(tagListSelector);
    this.connections = [];
    
    // Skill tags lore database
    this.loreData = {
      'chronos': {
        title: 'Non-Linear Chronology',
        category: 'Nolan Concept',
        quote: '"The voyage to Ithaca is not across physical miles, but across folding moments of memory and guilt."',
        specs: ['Temporal Inversion', '10-Year Dilation Curve', 'IMAX 70mm Chronograph']
      },
      'ithaca': {
        title: 'Coordinates of Nostos',
        category: 'Mythological Cartography',
        quote: '"Every coordinate calculated in the stars points back to an unyielding homeland under siege."',
        specs: ['38° 22′ 0″ N, 20° 43′ 0″ E', 'Celestial Navigation', 'The 12 Bronze Axes']
      },
      '70mm': {
        title: 'IMAX 70MM Directorial Vision',
        category: 'Cinematography',
        quote: '"Capturing the rage of Poseidon on massive 15-perf 70mm photochemical celluloid."',
        specs: ['1.43:1 Native Aspect Ratio', 'Custom Waterproof IMAX Rigs', '18K Scanned Resolution']
      },
      'penelope': {
        title: 'The Unwoven Shroud',
        category: 'Structural Motif',
        quote: '"What is woven by daylight is undone by night—the ultimate metaphor for entropy resisting collapse."',
        specs: ['Entropy Counter-Current', 'Laertes Shroud', 'The Loom of Time']
      },
      'sirens': {
        title: 'Acoustic Frequency of Madness',
        category: 'Sound Design',
        quote: '"Hans Zimmer / Ludwig Göransson sub-harmonic Shepard tones that mimic inescapable divine song."',
        specs: ['Shepard Scale Glissando', 'Binaural Ocean Waves', 'Lashings to the Mast']
      },
      'trojan': {
        title: 'The Wooden Construct',
        category: 'Tactical Deception',
        quote: '"A sacred gift that conceals humanity’s deadliest instinct inside sacred pine."',
        specs: ['Modular Trojan Armor', 'Philoctetes Arrows', 'Nocturnal Breach']
      }
    };
    
    this.init();
  }
  
  init() {
    if (!this.svg || !this.tagList) return;
    
    this.setupTags();
    this.updateLines();
    
    window.addEventListener('resize', () => this.updateLines());
  }
  
  setupTags() {
    const nodes = this.tagList.querySelectorAll('.skill-tag-node');
    nodes.forEach(node => {
      node.addEventListener('mouseenter', () => {
        const id = node.getAttribute('data-tag-id');
        this.highlightConnections(id, true);
      });
      
      node.addEventListener('mouseleave', () => {
        const id = node.getAttribute('data-tag-id');
        this.highlightConnections(id, false);
      });
      
      node.addEventListener('click', () => {
        const id = node.getAttribute('data-tag-id');
        this.openLoreModal(id);
      });
    });
  }
  
  updateLines() {
    const nodes = Array.from(this.tagList.querySelectorAll('.skill-tag-node'));
    if (nodes.length < 2) return;
    
    const svgRect = this.svg.getBoundingClientRect();
    this.svg.innerHTML = '';
    this.connections = [];
    
    // Calculate center coordinates of each node
    const centers = nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return {
        id: node.getAttribute('data-tag-id'),
        x: rect.left + rect.width / 2 - svgRect.left,
        y: rect.top + rect.height / 2 - svgRect.top
      };
    });
    
    // Connect nearest nodes in a sacred triangulation network
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const dist = Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y);
        if (dist < 400) { // connect if within threshold
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', centers[i].x);
          line.setAttribute('y1', centers[i].y);
          line.setAttribute('x2', centers[j].x);
          line.setAttribute('y2', centers[j].y);
          line.setAttribute('data-source', centers[i].id);
          line.setAttribute('data-target', centers[j].id);
          this.svg.appendChild(line);
          this.connections.push({ element: line, from: centers[i].id, to: centers[j].id });
        }
      }
    }
  }
  
  highlightConnections(tagId, active) {
    this.connections.forEach(conn => {
      if (conn.from === tagId || conn.to === tagId) {
        conn.element.classList.toggle('active-connection', active);
      }
    });
  }
  
  openLoreModal(tagId) {
    const data = this.loreData[tagId];
    if (!data) return;
    
    const modal = document.getElementById('infoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal) return;
    
    modalTitle.textContent = data.title;
    modalBody.innerHTML = `
      <div style="margin-bottom: 20px;">
        <span class="imax-badge" style="display:inline-flex;margin-bottom:12px;">${data.category}</span>
        <blockquote style="font-family: var(--font-editorial); font-size: 1.35rem; font-style: italic; color: #cbd5e1; line-height: 1.6; border-left: 2px solid var(--gold-primary); padding-left: 20px; margin: 16px 0;">
          ${data.quote}
        </blockquote>
      </div>
      <div style="margin-top: 24px;">
        <h4 style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--gold-primary); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px;">TECHNICAL & MYTHOLOGICAL SPECS:</h4>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px;">
          ${data.specs.map(s => `<li style="font-family: var(--font-mono); font-size: 0.85rem; color: #94a3b8; display: flex; align-items: center; gap: 8px;"><span style="color: #ffd700;">▸</span> ${s}</li>`).join('')}
        </ul>
      </div>
    `;
    
    modal.classList.add('active');
  }
}

window.DaVinciLineNetwork = DaVinciLineNetwork;
