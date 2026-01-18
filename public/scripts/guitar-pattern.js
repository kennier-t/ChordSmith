// Guitar Pattern Generator - Apple-like Minimal Style
// Creates a seamless pattern of guitars with individual rotations

(function() {
    'use strict';
    
    // Pattern configuration
    const config = {
        guitarCount: 40, // Total number of guitars (increased)
        minSize: 120,
        maxSize: 260,
        minRotation: -45,
        maxRotation: 45,
        minOpacity: 0.18, // Aumentado significativamente
        maxOpacity: 0.35, // Aumentado significativamente
        animationDuration: 180 // segundos
    };
    
    // Function to generate random number in range
    function random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Function to generate organic distribution (avoids clusters)
    function generatePositions(count) {
        const positions = [];
        const minDistance = 15; // Minimum distance between guitars (%)
        let attempts = 0;
        const maxAttempts = count * 50;
        
        while (positions.length < count && attempts < maxAttempts) {
            attempts++;
            const x = random(0, 100);
            const y = random(0, 100);
            
            // Check minimum distance with other guitars
            let tooClose = false;
            for (const pos of positions) {
                const dx = x - pos.x;
                const dy = y - pos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                positions.push({ x, y });
            }
        }
        
        return positions;
    }
    
    // Create pattern container
    function createPatternContainer() {
        const container = document.createElement('div');
        container.id = 'guitar-pattern-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
            z-index: -1;
        `;
        return container;
    }
    
    // Create individual guitar element
    function createGuitar(position, index) {
        const size = random(config.minSize, config.maxSize);
        const rotation = random(config.minRotation, config.maxRotation);
        const opacity = random(config.minOpacity, config.maxOpacity);
        const animationDelay = random(0, config.animationDuration / 2);
        const animationDuration = random(config.animationDuration * 0.8, config.animationDuration * 1.2);
        
        const guitar = document.createElement('div');
        guitar.className = 'guitar-pattern-item';
        guitar.style.cssText = `
            position: absolute;
            left: ${position.x}%;
            top: ${position.y}%;
            width: ${size}px;
            height: ${size * 1.2}px;
            background-image: url('assets/guitar.webp');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: ${opacity};
            transform: translate(-50%, -50%) rotate(${rotation}deg);
            filter: grayscale(25%) contrast(0.95) brightness(1.05) sepia(8%);
            mix-blend-mode: normal;
            animation: subtleFloat${index % 3} ${animationDuration}s ease-in-out infinite;
            animation-delay: ${animationDelay}s;
            will-change: transform;
            backface-visibility: hidden;
        `;
        
        return guitar;
    }
    
    // Create CSS animations
    function createAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes subtleFloat0 {
                0%, 100% {
                    transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(0) scale(1);
                }
                50% {
                    transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(-8px) scale(1.02);
                }
            }
            
            @keyframes subtleFloat1 {
                0%, 100% {
                    transform: translate(-50%, -50%) rotate(var(--rotation)) translateX(0);
                }
                50% {
                    transform: translate(-50%, -50%) rotate(var(--rotation)) translateX(6px);
                }
            }
            
            @keyframes subtleFloat2 {
                0%, 100% {
                    transform: translate(-50%, -50%) rotate(var(--rotation)) scale(1);
                }
                50% {
                    transform: translate(-50%, -50%) rotate(var(--rotation)) scale(0.98);
                }
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .guitar-pattern-item {
                    transform: scale(0.6) !important;
                }
            }
            
            @media (min-width: 1920px) {
                .guitar-pattern-item {
                    transform: scale(1.2) !important;
                }
            }
        `;
        return style;
    }
    
    // Initialize pattern
    function initPattern() {
        // Add animation styles
        document.head.appendChild(createAnimationStyles());
        
        // Crear contenedor
        const container = createPatternContainer();
        
        // Generate organic positions
        const positions = generatePositions(config.guitarCount);
        
        // Crear guitarras
        positions.forEach((position, index) => {
            const guitar = createGuitar(position, index);
            // Store rotation as CSS variable
            const rotation = parseFloat(guitar.style.transform.match(/rotate\(([-\d.]+)deg\)/)[1]);
            guitar.style.setProperty('--rotation', `${rotation}deg`);
            container.appendChild(guitar);
        });
        
        // Add to document
        document.body.insertBefore(container, document.body.firstChild);
    }
    
    // Execute when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPattern);
    } else {
        initPattern();
    }
})();
