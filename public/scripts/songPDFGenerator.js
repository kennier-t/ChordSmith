const SongPDFGenerator = (function() {
    'use strict';
    
    // Helper function to normalize text for PDF rendering
    function normalizeText(text) {
        if (!text) return '';
        // Ensure text is properly decoded and normalized
        return text.normalize('NFC');
    }
    
    async function generatePDF(song, chords) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            putOnlyUsedFonts: true,
            compress: true
        });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 5;
        let yPosition = margin;
        
        const tableWidth = pageWidth - (margin * 2);
        const tableX = margin;
        
        const col1Width = tableWidth * 0.45;
        const col2Width = tableWidth * 0.25;
        const col3Width = tableWidth * 0.30;
        const row1Height = 15;
        const row2Height = 15;
        
        doc.setLineWidth(0.2);
        
        doc.rect(tableX, yPosition, col1Width, row1Height);
        doc.rect(tableX + col1Width, yPosition, col2Width, row1Height);
        doc.rect(tableX + col1Width + col2Width, yPosition, col3Width, row1Height + row2Height);
        
        // Use Courier bold for metadata labels, size 10
        doc.setFont('courier', 'bold');
        doc.setFontSize(10);
        
        // Title field
        let currentY = yPosition + 5;
        doc.text('Title:', tableX + 2, currentY);
        doc.setFont('courier', 'normal');
        const titleValue = song.Title || '';
        const titleLines = doc.splitTextToSize(titleValue, col1Width - 4);
        doc.text(titleLines.slice(0, 2), tableX + 2 + doc.getTextWidth('Title: '), currentY);

        // Date field
        doc.setFont('courier', 'bold');
        doc.text('Date:', tableX + col1Width + 2, currentY);
        doc.setFont('courier', 'normal');
        const dateValue = song.SongDate || '';
        const dateLines = doc.splitTextToSize(dateValue, col2Width - 4 - doc.getTextWidth('Date: '));
        doc.text(dateLines.slice(0, 2), tableX + col1Width + 2 + doc.getTextWidth('Date: '), currentY);

        // Notes field
        doc.setFont('courier', 'bold');
        doc.text('Notes:', tableX + col1Width + col2Width + 2, currentY);
        doc.setFont('courier', 'normal');
        const notesValue = song.Notes || '';
        const notesLines = doc.splitTextToSize(notesValue, col3Width - 4 - doc.getTextWidth('Notes: '));
        doc.text(notesLines.slice(0, 4), tableX + col1Width + col2Width + 2 + doc.getTextWidth('Notes: '), currentY);
        
        yPosition += row1Height;
        
        const row2Width = tableWidth - col3Width;
        const col2_1Width = row2Width * 0.25;
        const col2_2Width = row2Width * 0.25;
        const col2_3Width = row2Width * 0.25;
        const col2_4Width = row2Width * 0.25;
        
        doc.rect(tableX, yPosition, col2_1Width, row2Height);
        doc.rect(tableX + col2_1Width, yPosition, col2_2Width, row2Height);
        doc.rect(tableX + col2_1Width + col2_2Width, yPosition, col2_3Width, row2Height);
        doc.rect(tableX + col2_1Width + col2_2Width + col2_3Width, yPosition, col2_4Width, row2Height);
        
        currentY = yPosition + 5;
        
        // Key field
        doc.setFont('courier', 'bold');
        doc.text('Key:', tableX + 2, currentY);
        doc.setFont('courier', 'normal');
        const keyValue = song.SongKey || '';
        const keyLines = doc.splitTextToSize(keyValue, col2_1Width - 4 - doc.getTextWidth('Key: '));
        doc.text(keyLines.slice(0, 2), tableX + 2 + doc.getTextWidth('Key: '), currentY);

        // Capo field
        doc.setFont('courier', 'bold');
        doc.text('Capo:', tableX + col2_1Width + 2, currentY);
        doc.setFont('courier', 'normal');
        const capoValue = song.Capo || '';
        const capoLines = doc.splitTextToSize(capoValue, col2_2Width - 4 - doc.getTextWidth('Capo: '));
        doc.text(capoLines.slice(0, 2), tableX + col2_1Width + 2 + doc.getTextWidth('Capo: '), currentY);

        // BPM field
        doc.setFont('courier', 'bold');
        doc.text('BPM:', tableX + col2_1Width + col2_2Width + 2, currentY);
        doc.setFont('courier', 'normal');
        const bpmValue = song.BPM || '';
        const bpmLines = doc.splitTextToSize(bpmValue, col2_3Width - 4 - doc.getTextWidth('BPM: '));
        doc.text(bpmLines.slice(0, 2), tableX + col2_1Width + col2_2Width + 2 + doc.getTextWidth('BPM: '), currentY);

        // Effects field
        doc.setFont('courier', 'bold');
        doc.text('Effects:', tableX + col2_1Width + col2_2Width + col2_3Width + 2, currentY);
        doc.setFont('courier', 'normal');
        const effectsValue = song.Effects || '';
        const effectsLines = doc.splitTextToSize(effectsValue, col2_4Width - 4 - doc.getTextWidth('Effects: '));
        doc.text(effectsLines.slice(0, 2), tableX + col2_1Width + col2_2Width + col2_3Width + 2 + doc.getTextWidth('Effects: '), currentY);
        
        yPosition += row2Height + 8;

        // Use Courier font for lyrics, with per-song font size or default
        doc.setFont('courier', 'normal');
        const contentFontSize = song.SongContentFontSizePt ? parseFloat(song.SongContentFontSizePt) : 11;
        doc.setFontSize(contentFontSize);

        const lyricsMargin = 12;
        const maxLineWidth = pageWidth - (lyricsMargin * 2);

        // Normalize text to ensure proper character encoding
        const normalizedContent = normalizeText(song.ContentText);
        const contentLines = normalizedContent.split('\n');
        contentLines.forEach(line => {
            if (yPosition > pageHeight - 40) {
                doc.addPage();
                yPosition = lyricsMargin;
            }
            
            // Wrap text to respect right margin
            const wrappedLines = doc.splitTextToSize(line || ' ', maxLineWidth);
            wrappedLines.forEach(wrappedLine => {
                if (yPosition > pageHeight - 40) {
                    doc.addPage();
                    yPosition = lyricsMargin;
                }
                // Use array format to ensure proper character encoding
                doc.text(wrappedLine, lyricsMargin, yPosition, { 
                    align: 'left',
                    maxWidth: maxLineWidth 
                });
                yPosition += 5;
            });
        });
        
        const numDiagrams = Math.min(8, Math.max(6, (chords || []).length));
        const chordDiagramsImage = await generateChordDiagramsImage(chords || [], numDiagrams);

        if (chordDiagramsImage) {
            const page_width_cm = pageWidth / 10;
            const initial_margin_cm = 0.5; // 5 mm
            let margin_cm = initial_margin_cm;
            let usable_width_cm = page_width_cm - 2 * margin_cm;
            const spacing_cm = 0.2;
            const diagram_width_cm = 3.0;
            const group_width_cm = numDiagrams * diagram_width_cm + (numDiagrams - 1) * spacing_cm;
            let scale = group_width_cm <= usable_width_cm ? 1 : usable_width_cm / group_width_cm;
            let warning = false;
            if (scale < 0.6) {
                const required_usable_cm = group_width_cm * 0.6;
                const required_margin_cm = (page_width_cm - required_usable_cm) / 2;
                if (required_margin_cm >= 0.5) {
                    margin_cm = required_margin_cm;
                    usable_width_cm = required_usable_cm;
                    scale = 0.6;
                } else {
                    scale = 0.6;
                    warning = true;
                }
            }
            const diagramWidthMm = 30 * scale;
            const diagramHeightMm = 35 * scale;
            const totalWidthMm = scale * group_width_cm * 10;
            const margin_mm = margin_cm * 10;
            const usable_width_mm = usable_width_cm * 10;
            const xPosition = margin_mm + (usable_width_mm - totalWidthMm) / 2;

            if (yPosition > pageHeight - 40) {
                doc.addPage();
                yPosition = 15;
            } else {
                yPosition += 3;
            }

            doc.addImage(chordDiagramsImage, 'PNG', xPosition, yPosition, totalWidthMm, diagramHeightMm);

            if (warning) {
                doc.setFont('courier', 'normal');
                doc.setFontSize(10);
                doc.text('Note: Chord diagrams scaled to minimum readable size due to page width constraints.', margin_mm, yPosition + diagramHeightMm + 5);
                yPosition += 10;
            }
        }
        
        return doc;
    }
    
    async function generateChordDiagramsImage(chords, numDiagrams) {
        const selectedChords = [];

        for (let i = 0; i < chords.length; i++) {
            const chord = chords[i];
            selectedChords.push(chord || null);
        }

        while (selectedChords.length < numDiagrams) {
            selectedChords.push(null);
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const chordWidth = 120;
        const chordHeight = 160;
        const spacing = 10;
        const totalWidth = (chordWidth + spacing) * selectedChords.length;
        
        canvas.width = totalWidth;
        canvas.height = chordHeight;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let xOffset = 0;
        
        for (const chord of selectedChords) {
            if (chord) {
                const renderer = new ChordRenderer(chord);
                const svgString = renderer.getSVGString(false);
                
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(svgBlob);
                
                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, xOffset, 0, chordWidth, chordHeight);
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    img.src = url;
                });
            } else {
                renderEmptyChordDiagram(ctx, xOffset, chordWidth, chordHeight);
            }
            
            xOffset += chordWidth + spacing;
        }
        
        return canvas.toDataURL('image/png');
    }
    
    function renderEmptyChordDiagram(ctx, xOffset, width, height) {
        const strings = 6;
        const frets = 4;
        const titleHeight = 20;
        const topMargin = 8;
        const bottomMargin = 5;
        const sideMargin = 15;
        
        const diagramTop = titleHeight + topMargin;
        const diagramHeight = height - diagramTop - bottomMargin;
        const diagramLeft = sideMargin + xOffset;
        const diagramWidth = width - (sideMargin * 2);
        
        const stringSpacing = diagramWidth / (strings - 1);
        const fretSpacing = diagramHeight / frets;
        
        const nutThickness = 3;
        const fretThickness = 1;
        const stringThickness = 1;
        
        ctx.strokeStyle = 'black';
        
        ctx.lineWidth = stringThickness;
        for (let i = 0; i < strings; i++) {
            const x = diagramLeft + i * stringSpacing;
            ctx.beginPath();
            ctx.moveTo(x, diagramTop);
            ctx.lineTo(x, diagramTop + diagramHeight);
            ctx.stroke();
        }
        
        for (let i = 0; i <= frets; i++) {
            const y = diagramTop + i * fretSpacing;
            const thickness = (i === 0) ? nutThickness : fretThickness;
            ctx.lineWidth = thickness;
            ctx.beginPath();
            ctx.moveTo(diagramLeft, y);
            ctx.lineTo(diagramLeft + diagramWidth, y);
            ctx.stroke();
        }
    }
    
    async function downloadPDF(song, chords, filename) {
        const doc = await generatePDF(song, chords);
        doc.save(filename || `${song.Title}.pdf`);
    }
    
    return {
        generatePDF,
        downloadPDF
    };
})();
