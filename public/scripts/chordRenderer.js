// Renderizador de diagramas de acordes
// Tamaño físico: 3.5cm alto × 3.0cm ancho
// Conversión: 1cm ≈ 37.8 pixels (96 DPI)
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
        
        // Espacios y márgenes
        this.titleHeight = 20;
        this.topMargin = 8;
        this.bottomMargin = 5;
        this.sideMargin = 15;
        
        // Área del diagrama - SIEMPRE en la misma posición y tamaño
        this.diagramTop = this.titleHeight + this.topMargin;
        this.diagramHeight = this.height - this.diagramTop - this.bottomMargin;
        this.diagramLeft = this.sideMargin;
        this.diagramWidth = this.width - (this.sideMargin * 2);
        
        // Determinar si necesita mostrar número de traste
        this.showFretNumber = this.chord.baseFret > 1;
        
        // Espaciado
        this.stringSpacing = this.diagramWidth / (this.strings - 1);
        this.fretSpacing = this.diagramHeight / this.frets;
        
        // Tamaños de elementos
        this.dotRadius = Math.min(this.stringSpacing, this.fretSpacing) * 0.3;
        this.nutThickness = 3;
        this.fretThickness = 1;
        this.stringThickness = 1;
    }
    
    // Renderizar a SVG
    renderSVG(transparent = false) {
        const bgColor = transparent ? 'none' : 'white';
        
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">`;
        
        // Fondo
        svg += `<rect width="${this.width}" height="${this.height}" fill="${bgColor}"/>`;
        
        // Título del acorde
        svg += `<text x="${this.width / 2}" y="15" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="black">${this.chord.name}</text>`;
        
        // Dibujar cuerdas no tocadas (X)
        for (let i = 0; i < this.strings; i++) {
            if (this.chord.frets[i] === -1) {
                const x = this.diagramLeft + i * this.stringSpacing;
                const y = this.diagramTop - 5;
                svg += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="black">X</text>`;
            }
        }
        
        // Número de traste base (si es necesario)
        if (this.showFretNumber) {
            const x = this.diagramLeft - 8;
            const y = this.diagramTop + this.fretSpacing / 2 + 4;
            svg += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="black">${this.chord.baseFret}</text>`;
        }
        
        // Dibujar cuerdas (verticales)
        for (let i = 0; i < this.strings; i++) {
            const x = this.diagramLeft + i * this.stringSpacing;
            svg += `<line x1="${x}" y1="${this.diagramTop}" x2="${x}" y2="${this.diagramTop + this.diagramHeight}" stroke="black" stroke-width="${this.stringThickness}"/>`;
        }
        
        // Dibujar trastes (horizontales)
        for (let i = 0; i <= this.frets; i++) {
            const y = this.diagramTop + i * this.fretSpacing;
            const thickness = (i === 0 && this.chord.baseFret === 1) ? this.nutThickness : this.fretThickness;
            svg += `<line x1="${this.diagramLeft}" y1="${y}" x2="${this.diagramLeft + this.diagramWidth}" y2="${y}" stroke="black" stroke-width="${thickness}"/>`;
        }
        
        // Dibujar cejillas (barres) - dos círculos conectados por una línea delgada
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
                    
                    // Línea conectando los dos círculos
                    svg += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="black" stroke-width="3.5" stroke-linecap="round"/>`;
                    
                    // Círculo en el inicio
                    svg += `<circle cx="${x1}" cy="${y}" r="${this.dotRadius}" fill="black"/>`;
                    
                    // Círculo en el final
                    svg += `<circle cx="${x2}" cy="${y}" r="${this.dotRadius}" fill="black"/>`;
                    
                    // Número del dedo (1) en ambos círculos
                    const finger = this.chord.fingers[minString];
                    if (finger > 0) {
                        svg += `<text x="${x1}" y="${y + 4}" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="white">${finger}</text>`;
                        svg += `<text x="${x2}" y="${y + 4}" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="white">${finger}</text>`;
                    }
                }
            });
        }
        
        // Dibujar puntos (dedos)
        for (let i = 0; i < this.strings; i++) {
            const fret = this.chord.frets[i];
            const finger = this.chord.fingers[i];
            
            if (fret > 0 && finger > 0) {
                // No dibujar si es parte de una barra
                const isBarre = this.chord.barres && this.chord.barres.includes(fret) && 
                               this.chord.frets.filter(f => f === fret).length > 1;
                
                if (!isBarre) {
                    const x = this.diagramLeft + i * this.stringSpacing;
                    const fretPos = fret - this.chord.baseFret;
                    const y = this.diagramTop + (fretPos + 0.5) * this.fretSpacing;
                    
                    // Círculo
                    svg += `<circle cx="${x}" cy="${y}" r="${this.dotRadius}" fill="black"/>`;
                    
                    // Número del dedo
                    svg += `<text x="${x}" y="${y + 4}" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="white">${finger}</text>`;
                }
            }
        }
        
        svg += '</svg>';
        return svg;
    }
    
    // Renderizar a Canvas (para PNG)
    renderCanvas(transparent = false) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        // Fondo
        if (!transparent) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, this.width, this.height);
        }
        
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Título
        ctx.fillText(this.chord.name, this.width / 2, 15);
        
        // Cuerdas no tocadas (X)
        ctx.font = 'bold 12px Arial';
        for (let i = 0; i < this.strings; i++) {
            if (this.chord.frets[i] === -1) {
                const x = this.diagramLeft + i * this.stringSpacing;
                const y = this.diagramTop - 5;
                ctx.fillText('X', x, y);
            }
        }
        
        // Número de traste base
        if (this.showFretNumber) {
            ctx.font = '10px Arial';
            const x = this.diagramLeft - 8;
            const y = this.diagramTop + this.fretSpacing / 2;
            ctx.fillText(this.chord.baseFret.toString(), x, y);
        }
        
        // Cuerdas (verticales)
        ctx.lineWidth = this.stringThickness;
        for (let i = 0; i < this.strings; i++) {
            const x = this.diagramLeft + i * this.stringSpacing;
            ctx.beginPath();
            ctx.moveTo(x, this.diagramTop);
            ctx.lineTo(x, this.diagramTop + this.diagramHeight);
            ctx.stroke();
        }
        
        // Trastes (horizontales)
        for (let i = 0; i <= this.frets; i++) {
            const y = this.diagramTop + i * this.fretSpacing;
            const thickness = (i === 0 && this.chord.baseFret === 1) ? this.nutThickness : this.fretThickness;
            ctx.lineWidth = thickness;
            ctx.beginPath();
            ctx.moveTo(this.diagramLeft, y);
            ctx.lineTo(this.diagramLeft + this.diagramWidth, y);
            ctx.stroke();
        }
        
        // Cejillas (barres) - dos círculos conectados por una línea delgada
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
                    
                    // Línea conectando los dos círculos
                    ctx.lineWidth = 3.5;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x1, y);
                    ctx.lineTo(x2, y);
                    ctx.stroke();
                    
                    // Círculo en el inicio
                    ctx.beginPath();
                    ctx.arc(x1, y, this.dotRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Círculo en el final
                    ctx.beginPath();
                    ctx.arc(x2, y, this.dotRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Número del dedo (1) en ambos círculos
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
        
        // Puntos (dedos)
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
                    
                    // Círculo
                    ctx.beginPath();
                    ctx.arc(x, y, this.dotRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Número
                    ctx.fillStyle = 'white';
                    ctx.fillText(finger.toString(), x, y);
                    ctx.fillStyle = 'black';
                }
            }
        }
        
        return canvas;
    }
    
    // Obtener SVG como string
    getSVGString(transparent = false) {
        return this.renderSVG(transparent);
    }
    
    // Obtener PNG como blob
    getPNGBlob(transparent = false) {
        return new Promise((resolve) => {
            const canvas = this.renderCanvas(transparent);
            canvas.toBlob(resolve, 'image/png');
        });
    }
    
    // Obtener data URL para preview
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
