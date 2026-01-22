// Chord Diagram Renderer
// Physical size: 3.5cm high × 3.0cm wide
// Conversion: 1cm ≈ 37.8 pixels (96 DPI)
const DIAGRAM_WIDTH_CM = 3.0;
const DIAGRAM_HEIGHT_CM = 3.5;
const CM_TO_PX = 37.8;
const DIAGRAM_WIDTH = DIAGRAM_WIDTH_CM * CM_TO_PX; // 113.4px
const DIAGRAM_HEIGHT = DIAGRAM_HEIGHT_CM * CM_TO_PX; // 132.3px

class ChordRenderer {
    constructor(chord) {
        this.chord = chord;
        this.strings = 6;
        this.frets = 4;
        this.width = DIAGRAM_WIDTH;
        this.height = DIAGRAM_HEIGHT;
        
        // Spacing and margins
        this.titleHeight = 20;
        this.topMargin = 8;
        this.bottomMargin = 5;
        this.sideMargin = 15;
        
        // Diagram area - ALWAYS in same position and size
        this.diagramTop = this.titleHeight + this.topMargin;
        this.diagramHeight = this.height - this.diagramTop - this.bottomMargin;
        this.diagramLeft = this.sideMargin;
        this.diagramWidth = this.width - (this.sideMargin * 2);
        
        // Determine if fret number needs to be displayed
        this.showFretNumber = this.chord.baseFret > 1;
        
        // Spacing
        this.stringSpacing = this.diagramWidth / (this.strings - 1);
        this.fretSpacing = this.diagramHeight / this.frets;
        
        // Element sizes
        this.dotRadius = Math.min(this.stringSpacing, this.fretSpacing) * 0.3;
        this.nutThickness = 3;
        this.fretThickness = 1;
        this.stringThickness = 1;
    }
    
    // SVG for the variation icon
    getVariationIconSVG() {
        const iconSize = 18;
        const iconMargin = 2;
        const x = this.width - iconSize - iconMargin;
        const y = iconMargin;
        
        return `
            <g class="variation-icon" style="cursor: pointer;" onclick="SongEditor.openVariationModal('${this.chord.name}')">
                <rect x="${x}" y="${y}" width="${iconSize}" height="${iconSize}" rx="3" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>
                <path d="M ${x + 9} ${y + 5} L ${x + 9} ${y + 13}" stroke="#333" stroke-width="2" stroke-linecap="round"/>
                <path d="M ${x + 5} ${y + 9} L ${x + 13} ${y + 9}" stroke="#333" stroke-width="2" stroke-linecap="round"/>
            </g>
        `;
    }

    // Render to SVG
    renderSVG(transparent = false, showVariationIcon = false) {
        const bgColor = transparent ? 'none' : 'white';
        
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">`;
        
        // Background
        svg += `<rect width="${this.width}" height="${this.height}" fill="${bgColor}"/>`;
        
        // Chord title
        svg += `<text x="${this.width / 2}" y="15" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="black">${this.chord.name}</text>`;
        
        // Variation Icon
        if (showVariationIcon) {
            svg += this.getVariationIconSVG();
        }

        // Draw unplayed strings (X)
        for (let i = 0; i < this.strings; i++) {
            if (this.chord.frets[i] === -1) {
                const x = this.diagramLeft + i * this.stringSpacing;
                const y = this.diagramTop - 5;
                svg += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="black">X</text>`;
            }
        }
        
        // Base fret number (if needed)
        if (this.showFretNumber) {
            const x = this.diagramLeft - 8;
            const y = this.diagramTop + this.fretSpacing / 2 + 4;
            svg += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="black">${this.chord.baseFret}</text>`;
        }
        
        // Draw strings (vertical)
        for (let i = 0; i < this.strings; i++) {
            const x = this.diagramLeft + i * this.stringSpacing;
            svg += `<line x1="${x}" y1="${this.diagramTop}" x2="${x}" y2="${this.diagramTop + this.diagramHeight}" stroke="black" stroke-width="${this.stringThickness}"/>`;
        }
        
        // Draw frets (horizontal)
        for (let i = 0; i <= this.frets; i++) {
            const y = this.diagramTop + i * this.fretSpacing;
            const thickness = (i === 0 && this.chord.baseFret === 1) ? this.nutThickness : this.fretThickness;
            svg += `<line x1="${this.diagramLeft}" y1="${y}" x2="${this.diagramLeft + this.diagramWidth}" y2="${y}" stroke="black" stroke-width="${thickness}"/>`;
        }
        
        // Draw barres (bars) - two circles connected by thin line
        if (this.chord.barres && this.chord.barres.length > 0) {
            this.chord.barres.forEach(barreFret => {
                const stringPositions = [];
                for (let i = 0; i < this.strings; i++) {
                    if (this.chord.frets[i] === barreFret) {
                        stringPositions.push(i);
                    }
                }
                
                if (stringPositions.length > 1) {
                    const minString = Math.min(...stringPositions);
                    const maxString = Math.max(...stringPositions);
                    const x1 = this.diagramLeft + minString * this.stringSpacing;
                    const x2 = this.diagramLeft + maxString * this.stringSpacing;
                    const fretPos = barreFret - this.chord.baseFret;
                    const y = this.diagramTop + (fretPos + 0.5) * this.fretSpacing;
                    
                    // Line connecting two circles
                    svg += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="black" stroke-width="3.5" stroke-linecap="round"/>`;
                    
                    // Circle at start
                    svg += `<circle cx="${x1}" cy="${y}" r="${this.dotRadius}" fill="black"/>`;
                    
                    // Circle at end
                    svg += `<circle cx="${x2}" cy="${y}" r="${this.dotRadius}" fill="black"/>`;
                    
                    // Finger number (1) in both circles
                    const finger = this.chord.fingers[minString];
                    if (finger > 0) {
                        svg += `<text x="${x1}" y="${y + 4}" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="white">${finger}</text>`;
                        svg += `<text x="${x2}" y="${y + 4}" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="white">${finger}</text>`;
                    }
                }
            });
        }
        
        // Draw dots (fingers)
        for (let i = 0; i < this.strings; i++) {
            const fret = this.chord.frets[i];
            const finger = this.chord.fingers[i];
            
            if (fret > 0 && finger > 0) {
                // Don't draw if it's part of a barre
                const isBarre = this.chord.barres && this.chord.barres.includes(fret) && 
                               this.chord.frets.filter(f => f === fret).length > 1;
                
                if (!isBarre) {
                    const x = this.diagramLeft + i * this.stringSpacing;
                    const fretPos = fret - this.chord.baseFret;
                    const y = this.diagramTop + (fretPos + 0.5) * this.fretSpacing;
                    
                    // Circle
                    svg += `<circle cx="${x}" cy="${y}" r="${this.dotRadius}" fill="black"/>`;
                    
                    // Finger number
                    svg += `<text x="${x}" y="${y + 4}" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="white">${finger}</text>`;
                }
            }
        }
        
        svg += '</svg>';
        return svg;
    }
    
    // Render to Canvas (for PNG)
    renderCanvas(transparent = false) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        // Background
        if (!transparent) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, this.width, this.height);
        }
        
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Title
        ctx.fillText(this.chord.name, this.width / 2, 15);
        
        // Unplayed strings (X)
        ctx.font = 'bold 12px Arial';
        for (let i = 0; i < this.strings; i++) {
            if (this.chord.frets[i] === -1) {
                const x = this.diagramLeft + i * this.stringSpacing;
                const y = this.diagramTop - 5;
                ctx.fillText('x', x, y);
            }
        }
        
        // Base fret number
        if (this.showFretNumber) {
            ctx.font = '10px Arial';
            const x = this.diagramLeft - 8;
            const y = this.diagramTop + this.fretSpacing / 2;
            ctx.fillText(this.chord.baseFret.toString(), x, y);
        }
        
        // Strings (vertical)
        ctx.lineWidth = this.stringThickness;
        for (let i = 0; i < this.strings; i++) {
            const x = this.diagramLeft + i * this.stringSpacing;
            ctx.beginPath();
            ctx.moveTo(x, this.diagramTop);
            ctx.lineTo(x, this.diagramTop + this.diagramHeight);
            ctx.stroke();
        }
        
        // Frets (horizontal)
        for (let i = 0; i <= this.frets; i++) {
            const y = this.diagramTop + i * this.fretSpacing;
            const thickness = (i === 0 && this.chord.baseFret === 1) ? this.nutThickness : this.fretThickness;
            ctx.lineWidth = thickness;
            ctx.beginPath();
            ctx.moveTo(this.diagramLeft, y);
            ctx.lineTo(this.diagramLeft + this.diagramWidth, y);
            ctx.stroke();
        }
        
        // Barres (bars) - two circles connected by thin line
        if (this.chord.barres && this.chord.barres.length > 0) {
            this.chord.barres.forEach(barreFret => {
                const stringPositions = [];
                for (let i = 0; i < this.strings; i++) {
                    if (this.chord.frets[i] === barreFret) {
                        stringPositions.push(i);
                    }
                }
                
                if (stringPositions.length > 1) {
                    const minString = Math.min(...stringPositions);
                    const maxString = Math.max(...stringPositions);
                    const x1 = this.diagramLeft + minString * this.stringSpacing;
                    const x2 = this.diagramLeft + maxString * this.stringSpacing;
                    const fretPos = barreFret - this.chord.baseFret;
                    const y = this.diagramTop + (fretPos + 0.5) * this.fretSpacing;
                    
                    // Line connecting two circles
                    ctx.lineWidth = 3.5;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x1, y);
                    ctx.lineTo(x2, y);
                    ctx.stroke();
                    
                    // Circle at start
                    ctx.beginPath();
                    ctx.arc(x1, y, this.dotRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Circle at end
                    ctx.beginPath();
                    ctx.arc(x2, y, this.dotRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Finger number (1) in both circles
                    const finger = this.chord.fingers[minString];
                    if (finger > 0) {
                        ctx.font = 'bold 10px Arial';
                        ctx.fillStyle = 'white';
                        ctx.fillText(finger.toString(), x1, y);
                        ctx.fillText(finger.toString(), x2, y);
                        ctx.fillStyle = 'black';
                    }
                }
            });
        }
        
        // Dots (fingers)
        ctx.font = 'bold 10px Arial';
        for (let i = 0; i < this.strings; i++) {
            const fret = this.chord.frets[i];
            const finger = this.chord.fingers[i];
            
            if (fret > 0 && finger > 0) {
                const isBarre = this.chord.barres && this.chord.barres.includes(fret) && 
                               this.chord.frets.filter(f => f === fret).length > 1;
                
                if (!isBarre) {
                    const x = this.diagramLeft + i * this.stringSpacing;
                    const fretPos = fret - this.chord.baseFret;
                    const y = this.diagramTop + (fretPos + 0.5) * this.fretSpacing;
                    
                    // Circle
                    ctx.beginPath();
                    ctx.arc(x, y, this.dotRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Number
                    ctx.fillStyle = 'white';
                    ctx.fillText(finger.toString(), x, y);
                    ctx.fillStyle = 'black';
                }
            }
        }
        
        return canvas;
    }
    
    // Get SVG as string
    getSVGString(transparent = false, showVariationIcon = false) {
        return this.renderSVG(transparent, showVariationIcon);
    }
    
    // Get PNG as blob
    getPNGBlob(transparent = false) {
        return new Promise((resolve) => {
            const canvas = this.renderCanvas(transparent);
            canvas.toBlob(resolve, 'image/png');
        });
    }
    
    // Get data URL for preview
    getDataURL(format = 'svg', transparent = false) {
        if (format === 'svg') {
            const svgString = this.getSVGString(transparent);
            return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        } else {
            const canvas = this.renderCanvas(transparent);
            return canvas.toDataURL('image/png');
        }
    }
}
