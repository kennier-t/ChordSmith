# Chord Families - Guía de Implementación

## Estado Actual

### ✅ Completado:
1. **Backup**: Proyecto original copiado a `Chord-Families-NoDB`
2. **SQL Scripts**:
   - `ChordFamilies-Setup.sql`: Crea BD y tabla con acordes únicos
   - `ChordFamilies-Update-ManyToMany.sql`: Implementa relación muchos-a-muchos
3. **dbService.js**: Servicio de datos completo con localStorage

### 📋 Pendiente de Implementar:

## 1. Actualizar chordData.js

Reemplazar datos hardcoded por llamadas a dbService:

```javascript
// Al inicio del archivo, mantener CHORD_DATA para inicialización
// Luego reemplazar funciones:

function getChordsForFamily(family) {
    return DB_SERVICE.getChordsForFamily(family);
}

function getAllFamilies() {
    return DB_SERVICE.getAllFamilies().map(f => f.name);
}

function getAllChords() {
    return DB_SERVICE.getAllChords();
}
```

## 2. Vincular dbService.js en index.html

Agregar ANTES de chordData.js:
```html
<script src="dbService.js"></script>
```

## 3. Actualizar songChords.js

Modificar `getAllAvailableChords()` para incluir custom chords:

```javascript
function getAllAvailableChords() {
    const allChords = DB_SERVICE.getAllChords(); // Incluye originales + custom
    const chordMap = new Map();
    
    allChords.forEach(chord => {
        if (!chordMap.has(chord.name)) {
            chordMap.set(chord.name, {
                ...chord,
                displayName: chord.name
            });
        }
    });
    
    const uniqueChords = Array.from(chordMap.values());
    uniqueChords.sort((a, b) => a.name.localeCompare(b.name));
    
    return uniqueChords;
}
```

## 4. Crear Chord Editor Interactivo

### 4.1 Estructura del Modal (actualizar index.html)

Reemplazar el modal `create-chord-modal` actual por:

```html
<!-- Modal para Create Chord con CRUD -->
<div id="create-chord-modal" class="modal hidden">
    <div class="modal-overlay"></div>
    <div class="modal-content modal-large">
        <button id="close-create-chord-modal-x" class="close-btn">×</button>
        <h2>Custom Chords</h2>
        
        <!-- Vista de Lista -->
        <div id="chord-list-view">
            <button id="create-new-chord-btn" class="download-btn">Create New Chord</button>
            <div id="custom-chords-list" class="custom-chords-list">
                <!-- Se llena dinámicamente -->
            </div>
        </div>
        
        <!-- Vista de Editor -->
        <div id="chord-editor-view" class="hidden">
            <button id="back-to-list-btn" class="back-btn">← Back to List</button>
            
            <div class="editor-container">
                <div class="editor-controls">
                    <div class="form-group">
                        <label>Chord Name:</label>
                        <input type="text" id="chord-name-input" placeholder="e.g. Cmaj7" maxlength="10">
                        <span id="name-error" class="error-message"></span>
                    </div>
                    
                    <div class="form-group">
                        <label>Base Fret:</label>
                        <input type="number" id="base-fret-input" value="1" min="1" max="12">
                    </div>
                    
                    <div class="form-group">
                        <label>Instructions:</label>
                        <ul class="instructions-list">
                            <li>Click on fret to add finger (1-4)</li>
                            <li>Click above strings for X (not played)</li>
                            <li>Drag across strings for barre</li>
                            <li>Click finger to change number or remove</li>
                        </ul>
                    </div>
                </div>
                
                <div class="editor-canvas-container">
                    <canvas id="chord-editor-canvas" width="300" height="400"></canvas>
                </div>
            </div>
            
            <div class="editor-actions">
                <button id="save-chord-btn" class="download-btn">Save Chord</button>
                <button id="cancel-edit-btn" class="utility-btn">Cancel</button>
                <button id="delete-chord-btn" class="utility-btn delete-btn hidden">Delete</button>
            </div>
        </div>
    </div>
</div>
```

### 4.2 Estilos CSS (agregar a styles.css)

```css
/* Custom Chords List */
.custom-chords-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
    margin-top: 20px;
    max-height: 400px;
    overflow-y: auto;
}

.custom-chord-item {
    border: 1px solid var(--border);
    padding: 16px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: white;
    position: relative;
}

.custom-chord-item:hover {
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(139, 111, 71, 0.2);
}

.custom-chord-item .chord-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 0.7rem;
    padding: 2px 6px;
    background: var(--accent);
    color: white;
    border-radius: 2px;
}

.custom-chord-item h4 {
    margin-bottom: 8px;
    font-size: 0.9rem;
}

.custom-chord-item svg {
    width: 100%;
    height: auto;
}

/* Editor */
.editor-container {
    display: flex;
    gap: 32px;
    margin: 24px 0;
}

.editor-controls {
    flex: 1;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
}

.form-group input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border);
    font-size: 0.875rem;
    font-family: inherit;
    transition: all 0.3s ease;
}

.form-group input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(139, 111, 71, 0.1);
}

.instructions-list {
    list-style: disc;
    padding-left: 20px;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    line-height: 1.6;
}

.editor-canvas-container {
    flex: 0 0 300px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
}

#chord-editor-canvas {
    border: 1px solid var(--border);
    background: white;
    cursor: crosshair;
}

.editor-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
}

.delete-btn {
    background: #c0392b;
    border-color: #c0392b;
}

.delete-btn:hover {
    background: #a93226;
}

.error-message {
    color: #c0392b;
    font-size: 0.75rem;
    margin-top: 4px;
    display: block;
}

.empty-chords-message {
    text-align: center;
    color: var(--text-secondary);
    padding: 40px 20px;
    font-size: 0.9rem;
}
```

### 4.3 Lógica del Chord Editor (chordEditor.js)

Este archivo es extenso. Los puntos clave:

1. **Estado del editor**:
```javascript
let editorState = {
    chordId: null, // null para nuevo, ID para editar
    frets: [-1, -1, -1, -1, -1, -1], // 6 cuerdas
    fingers: [0, 0, 0, 0, 0, 0],
    barres: [],
    baseFret: 1,
    isDragging: false,
    dragStart: null
};
```

2. **Dibujar diagrama en canvas**:
- 6 cuerdas verticales
- 4 trastes horizontales
- Primera línea más gruesa
- Círculos para dedos con números
- Barras para cejillas
- X's arriba para cuerdas no tocadas

3. **Interacciones**:
- Click en traste → agregar/cambiar dedo
- Click arriba → marcar X
- Drag horizontal → crear cejilla
- Click en dedo existente → cambiar número (ciclo 1→2→3→4→remove)

4. **Validación**:
- Nombre único (usando `DB_SERVICE.isChordNameUnique`)
- Al menos un dedo colocado
- Cejilla válida (2+ cuerdas)

5. **Guardar**:
```javascript
function saveChord() {
    const chordData = {
        name: document.getElementById('chord-name-input').value,
        baseFret: parseInt(document.getElementById('base-fret-input').value),
        frets: editorState.frets,
        fingers: editorState.fingers,
        barres: editorState.barres
    };
    
    if (editorState.chordId) {
        DB_SERVICE.updateChord(editorState.chordId, chordData);
    } else {
        DB_SERVICE.createChord(chordData);
    }
    
    refreshCustomChordsList();
    showListView();
}
```

## 5. Integración Final

### 5.1 Actualizar modal de Create Chord

El botón debe abrir el CRUD completo, no solo mostrar mensaje.

### 5.2 Actualizar index.html

Vincular todos los nuevos archivos:
```html
<script src="dbService.js"></script>
<script src="chordData.js"></script>
<script src="chordRenderer.js"></script>
<script src="chordEditor.js"></script>
<script src="app.js"></script>
<script src="songChords.js"></script>
```

## Notas Importantes

1. **localStorage simula la BD**: En producción, reemplazar con llamadas reales a SQL Server vía API
2. **Acordes originales protegidos**: `isOriginal = true` no permite edit/delete
3. **Nombres únicos**: Validar en cliente Y en DB
4. **Orden de carga**: dbService → chordData → resto

## Testing

1. Abrir aplicación → debe inicializar localStorage con acordes originales
2. Familias originales deben funcionar igual
3. Create Chord → debe mostrar lista vacía + botón "Create New"
4. Crear acorde custom → debe aparecer en lista
5. Custom chords deben estar disponibles en Gen Song Chords
6. Editar/Eliminar solo debe funcionar con custom chords

## Próximos Pasos

Si quieres conectar a SQL Server real:
1. Crear API backend (Node.js/ASP.NET)
2. Endpoints REST que lean/escriban en SQL Server
3. Reemplazar dbService para llamar a API en lugar de localStorage
