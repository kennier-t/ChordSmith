// Datos de acordes completos para todas las familias
const CHORD_DATA = {
    "C": [
        {
            name: "C",
            frets: [-1, 3, 2, 0, 1, 0],
            fingers: [0, 3, 2, 0, 1, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "G",
            frets: [3, 2, 0, 0, 0, 3],
            fingers: [2, 1, 0, 0, 0, 3],
            baseFret: 1,
            barres: []
        },
        {
            name: "Am",
            frets: [-1, 0, 2, 2, 1, 0],
            fingers: [0, 0, 2, 3, 1, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "F",
            frets: [1, 3, 3, 2, 1, 1],
            fingers: [1, 3, 4, 2, 1, 1],
            baseFret: 1,
            barres: [1]
        },
        {
            name: "Dm",
            frets: [-1, -1, 0, 2, 3, 1],
            fingers: [0, 0, 0, 2, 3, 1],
            baseFret: 1,
            barres: []
        },
        {
            name: "Em",
            frets: [0, 2, 2, 0, 0, 0],
            fingers: [0, 2, 3, 0, 0, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "Bdim",
            frets: [-1, 2, 3, 4, 3, -1],
            fingers: [0, 1, 2, 4, 3, 0],
            baseFret: 1,
            barres: []
        }
    ],
    "D": [
        {
            name: "D",
            frets: [-1, -1, 0, 2, 3, 2],
            fingers: [0, 0, 0, 1, 3, 2],
            baseFret: 1,
            barres: []
        },
        {
            name: "A",
            frets: [-1, 0, 2, 2, 2, 0],
            fingers: [0, 0, 2, 3, 4, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "Bm",
            frets: [-1, 2, 4, 4, 3, 2],
            fingers: [0, 1, 3, 4, 2, 1],
            baseFret: 1,
            barres: [2]
        },
        {
            name: "G",
            frets: [3, 2, 0, 0, 0, 3],
            fingers: [2, 1, 0, 0, 0, 3],
            baseFret: 1,
            barres: []
        },
        {
            name: "Em",
            frets: [0, 2, 2, 0, 0, 0],
            fingers: [0, 2, 3, 0, 0, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "F#m",
            frets: [2, 4, 4, 2, 2, 2],
            fingers: [1, 3, 4, 1, 1, 1],
            baseFret: 1,
            barres: [2]
        },
        {
            name: "C#dim",
            frets: [-1, 4, 5, 6, 5, -1],
            fingers: [0, 1, 2, 4, 3, 0],
            baseFret: 4,
            barres: []
        }
    ],
    "E": [
        {
            name: "E",
            frets: [0, 2, 2, 1, 0, 0],
            fingers: [0, 2, 3, 1, 0, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "B",
            frets: [-1, 2, 4, 4, 4, 2],
            fingers: [0, 1, 2, 3, 4, 1],
            baseFret: 1,
            barres: [2]
        },
        {
            name: "C#m",
            frets: [-1, 4, 6, 6, 5, 4],
            fingers: [0, 1, 3, 4, 2, 1],
            baseFret: 4,
            barres: [4]
        },
        {
            name: "A",
            frets: [-1, 0, 2, 2, 2, 0],
            fingers: [0, 0, 2, 3, 4, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "F#m",
            frets: [2, 4, 4, 2, 2, 2],
            fingers: [1, 3, 4, 1, 1, 1],
            baseFret: 1,
            barres: [2]
        },
        {
            name: "G#m",
            frets: [4, 6, 6, 4, 4, 4],
            fingers: [1, 3, 4, 1, 1, 1],
            baseFret: 4,
            barres: [4]
        },
        {
            name: "D#dim",
            frets: [-1, 6, 7, 8, 7, -1],
            fingers: [0, 1, 2, 4, 3, 0],
            baseFret: 6,
            barres: []
        }
    ],
    "F": [
        {
            name: "F",
            frets: [1, 3, 3, 2, 1, 1],
            fingers: [1, 3, 4, 2, 1, 1],
            baseFret: 1,
            barres: [1]
        },
        {
            name: "C",
            frets: [-1, 3, 2, 0, 1, 0],
            fingers: [0, 3, 2, 0, 1, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "Dm",
            frets: [-1, -1, 0, 2, 3, 1],
            fingers: [0, 0, 0, 2, 3, 1],
            baseFret: 1,
            barres: []
        },
        {
            name: "Bb",
            frets: [-1, 1, 3, 3, 3, 1],
            fingers: [0, 1, 2, 3, 4, 1],
            baseFret: 1,
            barres: [1]
        },
        {
            name: "Gm",
            frets: [3, 5, 5, 3, 3, 3],
            fingers: [1, 3, 4, 1, 1, 1],
            baseFret: 3,
            barres: [3]
        },
        {
            name: "Am",
            frets: [-1, 0, 2, 2, 1, 0],
            fingers: [0, 0, 2, 3, 1, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "Edim",
            frets: [0, 1, 2, 0, -1, -1],
            fingers: [0, 1, 2, 0, 0, 0],
            baseFret: 1,
            barres: []
        }
    ],
    "G": [
        {
            name: "G",
            frets: [3, 2, 0, 0, 0, 3],
            fingers: [2, 1, 0, 0, 0, 3],
            baseFret: 1,
            barres: []
        },
        {
            name: "D",
            frets: [-1, -1, 0, 2, 3, 2],
            fingers: [0, 0, 0, 1, 3, 2],
            baseFret: 1,
            barres: []
        },
        {
            name: "Em",
            frets: [0, 2, 2, 0, 0, 0],
            fingers: [0, 2, 3, 0, 0, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "C",
            frets: [-1, 3, 2, 0, 1, 0],
            fingers: [0, 3, 2, 0, 1, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "Am",
            frets: [-1, 0, 2, 2, 1, 0],
            fingers: [0, 0, 2, 3, 1, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "Bm",
            frets: [-1, 2, 4, 4, 3, 2],
            fingers: [0, 1, 3, 4, 2, 1],
            baseFret: 1,
            barres: [2]
        },
        {
            name: "F#dim",
            frets: [2, 3, 4, 2, -1, -1],
            fingers: [1, 2, 3, 1, 0, 0],
            baseFret: 1,
            barres: [2]
        }
    ],
    "A": [
        {
            name: "A",
            frets: [-1, 0, 2, 2, 2, 0],
            fingers: [0, 0, 2, 3, 4, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "E",
            frets: [0, 2, 2, 1, 0, 0],
            fingers: [0, 2, 3, 1, 0, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "F#m",
            frets: [2, 4, 4, 2, 2, 2],
            fingers: [1, 3, 4, 1, 1, 1],
            baseFret: 1,
            barres: [2]
        },
        {
            name: "D",
            frets: [-1, -1, 0, 2, 3, 2],
            fingers: [0, 0, 0, 1, 3, 2],
            baseFret: 1,
            barres: []
        },
        {
            name: "Bm",
            frets: [-1, 2, 4, 4, 3, 2],
            fingers: [0, 1, 3, 4, 2, 1],
            baseFret: 1,
            barres: [2]
        },
        {
            name: "C#m",
            frets: [-1, 4, 6, 6, 5, 4],
            fingers: [0, 1, 3, 4, 2, 1],
            baseFret: 4,
            barres: [4]
        },
        {
            name: "G#dim",
            frets: [4, 5, 6, 4, -1, -1],
            fingers: [1, 2, 3, 1, 0, 0],
            baseFret: 4,
            barres: [4]
        }
    ],
    "B": [
        {
            name: "B",
            frets: [-1, 2, 4, 4, 4, 2],
            fingers: [0, 1, 2, 3, 4, 1],
            baseFret: 1,
            barres: [2]
        },
        {
            name: "F#",
            frets: [2, 4, 4, 3, 2, 2],
            fingers: [1, 3, 4, 2, 1, 1],
            baseFret: 1,
            barres: [2]
        },
        {
            name: "G#m",
            frets: [4, 6, 6, 4, 4, 4],
            fingers: [1, 3, 4, 1, 1, 1],
            baseFret: 4,
            barres: [4]
        },
        {
            name: "E",
            frets: [0, 2, 2, 1, 0, 0],
            fingers: [0, 2, 3, 1, 0, 0],
            baseFret: 1,
            barres: []
        },
        {
            name: "C#m",
            frets: [-1, 4, 6, 6, 5, 4],
            fingers: [0, 1, 3, 4, 2, 1],
            baseFret: 4,
            barres: [4]
        },
        {
            name: "D#m",
            frets: [-1, -1, 1, 3, 4, 2],
            fingers: [0, 0, 1, 3, 4, 2],
            baseFret: 1,
            barres: []
        },
        {
            name: "A#dim",
            frets: [-1, 1, 2, 3, 2, -1],
            fingers: [0, 1, 2, 4, 3, 0],
            baseFret: 1,
            barres: []
        }
    ]
};

// Función para obtener todos los acordes de una familia
function getChordsForFamily(family) {
    return CHORD_DATA[family] || [];
}

// Función para obtener todas las familias disponibles
function getAllFamilies() {
    return Object.keys(CHORD_DATA);
}
