// Trauma Room Trainer - Game Designer Tool
// Desktop-first professional game design interface

// ===== CONFIGURATION DATA =====
let CONFIG = {
    carts: [],
    drawers: [],
    items: [],
    scenarios: [],
    achievements: [],
    roomSettings: {
        backgroundColor: '#fafafa',
        width: 800,
        height: 600
    },
    scoringRules: {
        essentialPoints: 60,
        optionalPoints: 20,
        penaltyPoints: 5,
        perfectBonus: 500,
        speedThreshold: 60,
        speedBonus: 300
    },
    generalSettings: {
        appTitle: 'Trauma Room Trainer',
        enableTutorial: true,
        enableSound: true,
        enableHaptics: true
    }
};

// ===== STATE MANAGEMENT =====
let STATE = {
    selectedType: null, // 'cart', 'scenario', 'drawer', 'item', 'achievement'
    selectedId: null,
    canvasMode: 'room', // 'room' or 'overview'
    draggedCart: null,
    mousePos: {x: 0, y: 0},
    unsavedChanges: false,
    snapToGrid: false,
    gridSize: 50
};

// ===== CANVAS SETUP =====
const canvas = document.getElementById('room-canvas');
const ctx = canvas.getContext('2d');

// ===== INITIALIZATION =====
function init() {
    loadConfiguration();
    setupCanvas();
    buildHierarchy();
    updateStatusBar();

    // Sync UI controls with loaded config
    document.getElementById('room-bg-color').value = CONFIG.roomSettings.backgroundColor;
    document.getElementById('room-width').value = CONFIG.roomSettings.width;
    document.getElementById('room-height').value = CONFIG.roomSettings.height;
    document.getElementById('grid-size').value = STATE.gridSize;

    // Set canvas size from config
    canvas.width = CONFIG.roomSettings.width;
    canvas.height = CONFIG.roomSettings.height;

    drawCanvas();

    // Setup autosave
    setInterval(() => {
        if (STATE.unsavedChanges) {
            saveConfiguration();
            STATE.unsavedChanges = false;
        }
    }, 5000);

    // Setup grid size listener
    document.getElementById('grid-size').addEventListener('input', (e) => {
        STATE.gridSize = parseInt(e.target.value);
        drawCanvas();
    });
}

// ===== CANVAS MANAGEMENT =====
function setupCanvas() {
    // Mouse events for drag and drop
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('mouseleave', handleCanvasMouseUp);

    // Track mouse position
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        STATE.mousePos.x = ((e.clientX - rect.left) / canvas.width).toFixed(2);
        STATE.mousePos.y = ((e.clientY - rect.top) / canvas.height).toFixed(2);
        document.getElementById('canvas-info-mouse').textContent =
            `X: ${STATE.mousePos.x}, Y: ${STATE.mousePos.y}`;
    });
}

function drawCanvas() {
    if (STATE.canvasMode === 'room') {
        drawRoomCanvas();
    } else {
        drawOverviewCanvas();
    }
}

function drawRoomCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = CONFIG.roomSettings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    if (document.getElementById('show-grid').checked) {
        drawGrid();
    }

    // Draw all carts
    CONFIG.carts.forEach(cart => {
        drawCart(cart, STATE.selectedType === 'cart' && STATE.selectedId === cart.id);
    });
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;

    const gridSize = STATE.gridSize;
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawCart(cart, isSelected) {
    const x = cart.x * canvas.width;
    const y = cart.y * canvas.height;
    const width = (cart.width || 80);
    const height = (cart.height || 80);

    // Selection highlight
    if (isSelected) {
        ctx.fillStyle = 'rgba(14, 99, 156, 0.2)';
        ctx.fillRect(x - width/2 - 5, y - height/2 - 5, width + 10, height + 10);
        ctx.strokeStyle = '#0e639c';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - width/2 - 5, y - height/2 - 5, width + 10, height + 10);
    }

    // Cart body
    ctx.fillStyle = cart.color;
    ctx.fillRect(x - width/2, y - height/2, width, height);

    // Cart border
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - width/2, y - height/2, width, height);

    // Cart label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cart.name, x, y);

    // Cart ID (small text)
    ctx.font = '9px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(cart.id, x, y + 15);

    // Dimensions indicator
    if (isSelected) {
        ctx.font = '8px monospace';
        ctx.fillStyle = '#0e639c';
        ctx.fillText(`${width}×${height}px`, x, y - height/2 - 10);
        ctx.fillText(`(${cart.x.toFixed(2)}, ${cart.y.toFixed(2)})`, x, y + height/2 + 18);
    }
}

function drawOverviewCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw statistics overview
    const stats = [
        {label: 'Carts', value: CONFIG.carts.length, icon: '🛒', color: '#0e639c'},
        {label: 'Scenarios', value: CONFIG.scenarios.length, icon: '📋', color: '#0e7a0d'},
        {label: 'Drawers', value: CONFIG.drawers.length, icon: '🗄️', color: '#a1260d'},
        {label: 'Items', value: CONFIG.items.length, icon: '📦', color: '#b7950b'},
        {label: 'Achievements', value: CONFIG.achievements.length, icon: '🏆', color: '#7d3c98'}
    ];

    const startX = 50;
    const startY = 100;
    const boxWidth = 140;
    const boxHeight = 100;
    const gap = 20;

    stats.forEach((stat, index) => {
        const x = startX + (index % 3) * (boxWidth + gap);
        const y = startY + Math.floor(index / 3) * (boxHeight + gap);

        // Box background
        ctx.fillStyle = '#252526';
        ctx.fillRect(x, y, boxWidth, boxHeight);

        // Box border
        ctx.strokeStyle = stat.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, boxWidth, boxHeight);

        // Icon
        ctx.font = '32px Arial';
        ctx.fillStyle = stat.color;
        ctx.textAlign = 'center';
        ctx.fillText(stat.icon, x + boxWidth/2, y + 35);

        // Value
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(stat.value, x + boxWidth/2, y + 60);

        // Label
        ctx.font = '11px Arial';
        ctx.fillStyle = '#999';
        ctx.fillText(stat.label, x + boxWidth/2, y + 80);
    });

    // Title
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('Project Overview', 50, 50);
}

// ===== CANVAS INTERACTION =====
function handleCanvasMouseDown(e) {
    if (STATE.canvasMode !== 'room') return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / canvas.width;
    const clickY = (e.clientY - rect.top) / canvas.height;

    // Check if clicking on a cart
    for (let cart of CONFIG.carts) {
        const size = 80 / canvas.width;
        if (Math.abs(clickX - cart.x) < size/2 && Math.abs(clickY - cart.y) < size/2) {
            STATE.draggedCart = cart;
            selectEntity('cart', cart.id);
            return;
        }
    }

    // Clicking on empty space - deselect
    deselectEntity();
}

function handleCanvasMouseMove(e) {
    if (!STATE.draggedCart) return;

    const rect = canvas.getBoundingClientRect();
    let newX = (e.clientX - rect.left) / canvas.width;
    let newY = (e.clientY - rect.top) / canvas.height;

    // Snap to grid if enabled
    if (STATE.snapToGrid) {
        const gridSizeX = STATE.gridSize / canvas.width;
        const gridSizeY = STATE.gridSize / canvas.height;
        newX = Math.round(newX / gridSizeX) * gridSizeX;
        newY = Math.round(newY / gridSizeY) * gridSizeY;
    }

    // Clamp to canvas bounds
    STATE.draggedCart.x = Math.max(0.1, Math.min(0.9, newX));
    STATE.draggedCart.y = Math.max(0.1, Math.min(0.9, newY));

    STATE.unsavedChanges = true;
    drawCanvas();
    updateInspector();
}

function handleCanvasMouseUp() {
    STATE.draggedCart = null;
}

function setCanvasMode(mode) {
    STATE.canvasMode = mode;

    // Update button states
    document.getElementById('mode-room').classList.toggle('active', mode === 'room');
    document.getElementById('mode-overview').classList.toggle('active', mode === 'overview');

    // Update info
    document.getElementById('canvas-info-mode').textContent =
        `Mode: ${mode === 'room' ? 'Room Layout' : 'Overview'}`;

    drawCanvas();
}

function updateRoomBackground() {
    CONFIG.roomSettings.backgroundColor = document.getElementById('room-bg-color').value;
    STATE.unsavedChanges = true;
    drawCanvas();
}

function updateRoomSize() {
    const width = parseInt(document.getElementById('room-width').value);
    const height = parseInt(document.getElementById('room-height').value);

    CONFIG.roomSettings.width = width;
    CONFIG.roomSettings.height = height;

    canvas.width = width;
    canvas.height = height;

    STATE.unsavedChanges = true;
    drawCanvas();
    showAlert('Room size updated', 'success');
}

function updateSnapToGrid() {
    STATE.snapToGrid = document.getElementById('snap-to-grid').checked;
    showAlert(`Snap to grid ${STATE.snapToGrid ? 'enabled' : 'disabled'}`, 'success');
}

// ===== HIERARCHY TREE =====
function buildHierarchy() {
    const tree = document.getElementById('hierarchy-tree');
    tree.innerHTML = '';

    // Build categories
    const categories = [
        {
            id: 'carts',
            name: 'Carts',
            icon: '🛒',
            items: CONFIG.carts,
            createNew: createNewCart
        },
        {
            id: 'scenarios',
            name: 'Scenarios',
            icon: '📋',
            items: CONFIG.scenarios,
            createNew: createNewScenario
        },
        {
            id: 'drawers',
            name: 'Drawers',
            icon: '🗄️',
            items: CONFIG.drawers,
            createNew: createNewDrawer
        },
        {
            id: 'items',
            name: 'Items',
            icon: '📦',
            items: CONFIG.items,
            createNew: createNewItem
        },
        {
            id: 'achievements',
            name: 'Achievements',
            icon: '🏆',
            items: CONFIG.achievements,
            createNew: createNewAchievement
        }
    ];

    categories.forEach(category => {
        const categoryDiv = createCategoryNode(category);
        tree.appendChild(categoryDiv);
    });
}

function createCategoryNode(category) {
    const div = document.createElement('div');
    div.className = 'tree-category';

    const header = document.createElement('div');
    header.className = 'tree-category-header';
    header.innerHTML = `
        <span class="tree-category-icon">▼</span>
        <span class="tree-item-icon">${category.icon}</span>
        <span class="tree-item-name">${category.name}</span>
        <span class="tree-item-count">${category.items.length}</span>
    `;
    header.onclick = () => {
        div.classList.toggle('collapsed');
    };

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'tree-category-items';

    // Add "Create New" button
    const createBtn = document.createElement('div');
    createBtn.className = 'tree-item';
    createBtn.style.fontStyle = 'italic';
    createBtn.style.color = '#0e639c';
    createBtn.innerHTML = `<span class="tree-item-icon">+</span><span class="tree-item-name">Create New</span>`;
    createBtn.onclick = category.createNew;
    itemsDiv.appendChild(createBtn);

    // Add items
    category.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        if (STATE.selectedType === category.id.slice(0, -1) && STATE.selectedId === item.id) {
            itemDiv.classList.add('selected');
        }
        itemDiv.innerHTML = `
            <span class="tree-item-icon">${category.icon}</span>
            <span class="tree-item-name">${item.name || item.id}</span>
        `;
        itemDiv.onclick = () => selectEntity(category.id.slice(0, -1), item.id);
        itemsDiv.appendChild(itemDiv);
    });

    div.appendChild(header);
    div.appendChild(itemsDiv);

    return div;
}

function refreshHierarchy() {
    buildHierarchy();
    showAlert('Hierarchy refreshed', 'success');
}

function filterHierarchy() {
    const searchTerm = document.getElementById('hierarchy-search').value.toLowerCase();
    const items = document.querySelectorAll('.tree-item');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// ===== ENTITY SELECTION =====
function selectEntity(type, id) {
    STATE.selectedType = type;
    STATE.selectedId = id;

    // Update hierarchy selection
    document.querySelectorAll('.tree-item').forEach(item => item.classList.remove('selected'));

    // Update canvas info
    const entity = getEntity(type, id);
    document.getElementById('canvas-info-selected').textContent =
        `Selected: ${type} - ${entity?.name || id}`;

    // Update inspector
    updateInspector();

    // Refresh hierarchy to show selection
    buildHierarchy();

    // Redraw canvas
    drawCanvas();
}

function deselectEntity() {
    STATE.selectedType = null;
    STATE.selectedId = null;
    document.getElementById('canvas-info-selected').textContent = 'Selected: None';
    updateInspector();
    buildHierarchy();
    drawCanvas();
}

function getEntity(type, id) {
    const collections = {
        'cart': CONFIG.carts,
        'scenario': CONFIG.scenarios,
        'drawer': CONFIG.drawers,
        'item': CONFIG.items,
        'achievement': CONFIG.achievements
    };

    return collections[type]?.find(e => e.id === id);
}

// ===== INSPECTOR PANEL =====
function updateInspector() {
    const container = document.getElementById('inspector-content');

    if (!STATE.selectedType || !STATE.selectedId) {
        container.innerHTML = '<div class="inspector-empty">Select an item from the hierarchy<br>to view its properties</div>';
        return;
    }

    const entity = getEntity(STATE.selectedType, STATE.selectedId);
    if (!entity) {
        container.innerHTML = '<div class="inspector-empty">Entity not found</div>';
        return;
    }

    // Build inspector based on entity type
    switch (STATE.selectedType) {
        case 'cart':
            buildCartInspector(entity, container);
            break;
        case 'scenario':
            buildScenarioInspector(entity, container);
            break;
        case 'drawer':
            buildDrawerInspector(entity, container);
            break;
        case 'item':
            buildItemInspector(entity, container);
            break;
        case 'achievement':
            buildAchievementInspector(entity, container);
            break;
    }
}

function buildCartInspector(cart, container) {
    container.innerHTML = `
        <div class="inspector-section">
            <div class="inspector-section-title">Cart Properties</div>

            <div class="form-field">
                <label>ID</label>
                <input type="text" value="${cart.id}" onchange="updateCartProperty('id', this.value)" ${cart.id === 'inventory' ? 'disabled' : ''}>
            </div>

            <div class="form-field">
                <label>Name</label>
                <input type="text" value="${cart.name}" onchange="updateCartProperty('name', this.value)">
            </div>

            <div class="form-field">
                <label>Color</label>
                <div class="color-picker-field">
                    <input type="color" value="${cart.color}" onchange="updateCartProperty('color', this.value)">
                    <input type="text" value="${cart.color}" readonly>
                </div>
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Position</div>

            <div class="form-field-row">
                <div class="form-field">
                    <label>X Position</label>
                    <input type="number" step="0.01" min="0" max="1" value="${cart.x}" onchange="updateCartProperty('x', parseFloat(this.value))">
                </div>
                <div class="form-field">
                    <label>Y Position</label>
                    <input type="number" step="0.01" min="0" max="1" value="${cart.y}" onchange="updateCartProperty('y', parseFloat(this.value))">
                </div>
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Dimensions</div>

            <div class="form-field-row">
                <div class="form-field">
                    <label>Width (px)</label>
                    <input type="number" min="40" max="200" value="${cart.width || 80}" onchange="updateCartProperty('width', parseInt(this.value))">
                </div>
                <div class="form-field">
                    <label>Height (px)</label>
                    <input type="number" min="40" max="200" value="${cart.height || 80}" onchange="updateCartProperty('height', parseInt(this.value))">
                </div>
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Options</div>

            <div class="checkbox-field">
                <input type="checkbox" id="cart-is-inventory" ${cart.isInventory ? 'checked' : ''} onchange="updateCartProperty('isInventory', this.checked)">
                <label for="cart-is-inventory">Is Inventory Cart</label>
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Actions</div>
            <button class="btn btn-danger btn-block" onclick="deleteCurrentEntity()">🗑️ Delete Cart</button>
        </div>
    `;
}

function buildScenarioInspector(scenario, container) {
    const essentialHTML = buildItemMultiselect(scenario.essential || [], 'essential');
    const optionalHTML = buildItemMultiselect(scenario.optional || [], 'optional');

    container.innerHTML = `
        <div class="inspector-section">
            <div class="inspector-section-title">Scenario Properties</div>

            <div class="form-field">
                <label>ID</label>
                <input type="text" value="${scenario.id}" onchange="updateScenarioProperty('id', this.value)">
            </div>

            <div class="form-field">
                <label>Name</label>
                <input type="text" value="${scenario.name}" onchange="updateScenarioProperty('name', this.value)">
            </div>

            <div class="form-field">
                <label>Description</label>
                <textarea onchange="updateScenarioProperty('description', this.value)">${scenario.description}</textarea>
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Essential Items</div>
            <div class="item-multiselect" id="essential-items">
                ${essentialHTML}
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Optional Items</div>
            <div class="item-multiselect" id="optional-items">
                ${optionalHTML}
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Feedback Messages</div>

            <div class="form-field">
                <label>Success Message</label>
                <textarea onchange="updateScenarioProperty('successFeedback', this.value)">${scenario.successFeedback || 'Perfect!'}</textarea>
            </div>

            <div class="form-field">
                <label>Partial Success Message</label>
                <textarea onchange="updateScenarioProperty('partialFeedback', this.value)">${scenario.partialFeedback || 'Good, but incomplete.'}</textarea>
            </div>

            <div class="form-field">
                <label>Failure Message</label>
                <textarea onchange="updateScenarioProperty('failureFeedback', this.value)">${scenario.failureFeedback || 'Missing critical items.'}</textarea>
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Actions</div>
            <button class="btn btn-danger btn-block" onclick="deleteCurrentEntity()">🗑️ Delete Scenario</button>
        </div>
    `;
}

function buildDrawerInspector(drawer, container) {
    const cartOptions = CONFIG.carts.filter(c => !c.isInventory).map(c =>
        `<option value="${c.id}" ${drawer.cart === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    container.innerHTML = `
        <div class="inspector-section">
            <div class="inspector-section-title">Drawer Properties</div>

            <div class="form-field">
                <label>ID</label>
                <input type="text" value="${drawer.id}" onchange="updateDrawerProperty('id', this.value)">
            </div>

            <div class="form-field">
                <label>Name</label>
                <input type="text" value="${drawer.name}" onchange="updateDrawerProperty('name', this.value)">
            </div>

            <div class="form-field">
                <label>Cart</label>
                <select onchange="updateDrawerProperty('cart', this.value)">
                    <option value="">Select cart...</option>
                    ${cartOptions}
                </select>
            </div>

            <div class="form-field">
                <label>Number</label>
                <input type="number" min="1" value="${drawer.number || 1}" onchange="updateDrawerProperty('number', parseInt(this.value))">
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Actions</div>
            <button class="btn btn-danger btn-block" onclick="deleteCurrentEntity()">🗑️ Delete Drawer</button>
        </div>
    `;
}

function buildItemInspector(item, container) {
    const cartOptions = CONFIG.carts.filter(c => !c.isInventory).map(c =>
        `<option value="${c.id}" ${item.cart === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    const drawerOptions = CONFIG.drawers.filter(d => d.cart === item.cart).map(d =>
        `<option value="${d.id}" ${item.drawer === d.id ? 'selected' : ''}>${d.name}</option>`
    ).join('');

    const imageHTML = item.image ? `<img src="${item.image}" alt="${item.name}">` :
        '<div class="image-upload-placeholder">Click to upload image<br>or drag & drop</div>';

    container.innerHTML = `
        <div class="inspector-section">
            <div class="inspector-section-title">Item Properties</div>

            <div class="form-field">
                <label>ID</label>
                <input type="text" value="${item.id}" onchange="updateItemProperty('id', this.value)">
            </div>

            <div class="form-field">
                <label>Name</label>
                <input type="text" value="${item.name}" onchange="updateItemProperty('name', this.value)">
            </div>

            <div class="form-field">
                <label>Cart</label>
                <select id="item-cart-select" onchange="updateItemCart(this.value)">
                    <option value="">Select cart...</option>
                    ${cartOptions}
                </select>
            </div>

            <div class="form-field">
                <label>Drawer</label>
                <select id="item-drawer-select" onchange="updateItemProperty('drawer', this.value)">
                    <option value="">Select drawer...</option>
                    ${drawerOptions}
                </select>
            </div>

            <div class="form-field">
                <label>Description</label>
                <textarea onchange="updateItemProperty('description', this.value)">${item.description || ''}</textarea>
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Item Image</div>
            <div class="image-upload-field">
                <input type="file" id="item-image-upload" accept="image/*" style="display:none" onchange="handleItemImageUpload(event)">
                <div class="image-upload-preview ${item.image ? 'has-image' : ''}" onclick="document.getElementById('item-image-upload').click()">
                    ${imageHTML}
                </div>
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Actions</div>
            <button class="btn btn-danger btn-block" onclick="deleteCurrentEntity()">🗑️ Delete Item</button>
        </div>
    `;
}

function buildAchievementInspector(achievement, container) {
    container.innerHTML = `
        <div class="inspector-section">
            <div class="inspector-section-title">Achievement Properties</div>

            <div class="form-field">
                <label>ID</label>
                <input type="text" value="${achievement.id}" onchange="updateAchievementProperty('id', this.value)">
            </div>

            <div class="form-field">
                <label>Title</label>
                <input type="text" value="${achievement.title}" onchange="updateAchievementProperty('title', this.value)">
            </div>

            <div class="form-field">
                <label>Description</label>
                <textarea onchange="updateAchievementProperty('description', this.value)">${achievement.description}</textarea>
            </div>

            <div class="form-field">
                <label>Icon</label>
                <input type="text" value="${achievement.icon || '🏆'}" maxlength="2" onchange="updateAchievementProperty('icon', this.value)">
            </div>

            <div class="form-field">
                <label>Trigger Type</label>
                <select onchange="updateAchievementProperty('trigger', this.value)">
                    <option value="first-scenario" ${achievement.trigger === 'first-scenario' ? 'selected' : ''}>First Scenario</option>
                    <option value="perfect-score" ${achievement.trigger === 'perfect-score' ? 'selected' : ''}>Perfect Score</option>
                    <option value="speed" ${achievement.trigger === 'speed' ? 'selected' : ''}>Speed Challenge</option>
                    <option value="efficient" ${achievement.trigger === 'efficient' ? 'selected' : ''}>Efficient (No Extras)</option>
                    <option value="count" ${achievement.trigger === 'count' ? 'selected' : ''}>Complete N Scenarios</option>
                    <option value="all" ${achievement.trigger === 'all' ? 'selected' : ''}>All Scenarios</option>
                </select>
            </div>

            <div class="form-field">
                <label>Trigger Value</label>
                <input type="number" min="0" value="${achievement.value || 0}" onchange="updateAchievementProperty('value', parseInt(this.value))">
            </div>
        </div>

        <div class="inspector-section">
            <div class="inspector-section-title">Actions</div>
            <button class="btn btn-danger btn-block" onclick="deleteCurrentEntity()">🗑️ Delete Achievement</button>
        </div>
    `;
}

function buildItemMultiselect(selectedIds, type) {
    if (CONFIG.items.length === 0) {
        return '<div class="item-multiselect-empty">No items available. Create items first!</div>';
    }

    return CONFIG.items.map(item => {
        const isSelected = selectedIds.includes(item.id);
        return `<div class="item-multiselect-item ${isSelected ? 'selected' : ''}"
                     onclick="toggleScenarioItem('${type}', '${item.id}')">
                    ${item.name}
                </div>`;
    }).join('');
}

// ===== UPDATE FUNCTIONS =====
function updateCartProperty(prop, value) {
    const cart = getEntity('cart', STATE.selectedId);
    if (cart) {
        cart[prop] = value;
        STATE.unsavedChanges = true;
        buildHierarchy();
        drawCanvas();
    }
}

function updateScenarioProperty(prop, value) {
    const scenario = getEntity('scenario', STATE.selectedId);
    if (scenario) {
        scenario[prop] = value;
        STATE.unsavedChanges = true;
        buildHierarchy();
    }
}

function updateDrawerProperty(prop, value) {
    const drawer = getEntity('drawer', STATE.selectedId);
    if (drawer) {
        drawer[prop] = value;
        STATE.unsavedChanges = true;
        buildHierarchy();
    }
}

function updateItemProperty(prop, value) {
    const item = getEntity('item', STATE.selectedId);
    if (item) {
        item[prop] = value;
        STATE.unsavedChanges = true;
        buildHierarchy();
    }
}

function updateAchievementProperty(prop, value) {
    const achievement = getEntity('achievement', STATE.selectedId);
    if (achievement) {
        achievement[prop] = value;
        STATE.unsavedChanges = true;
        buildHierarchy();
    }
}

function updateItemCart(cartId) {
    const item = getEntity('item', STATE.selectedId);
    if (item) {
        item.cart = cartId;
        item.drawer = ''; // Reset drawer when cart changes
        STATE.unsavedChanges = true;

        // Update drawer dropdown
        const drawerSelect = document.getElementById('item-drawer-select');
        const drawerOptions = CONFIG.drawers.filter(d => d.cart === cartId).map(d =>
            `<option value="${d.id}">${d.name}</option>`
        ).join('');
        drawerSelect.innerHTML = '<option value="">Select drawer...</option>' + drawerOptions;
    }
}

function toggleScenarioItem(type, itemId) {
    const scenario = getEntity('scenario', STATE.selectedId);
    if (!scenario) return;

    const listName = type === 'essential' ? 'essential' : 'optional';
    if (!scenario[listName]) scenario[listName] = [];

    const index = scenario[listName].indexOf(itemId);
    if (index > -1) {
        scenario[listName].splice(index, 1);
    } else {
        scenario[listName].push(itemId);
    }

    STATE.unsavedChanges = true;
    updateInspector();
}

function handleItemImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const item = getEntity('item', STATE.selectedId);
        if (item) {
            item.image = e.target.result;
            STATE.unsavedChanges = true;
            updateInspector();
        }
    };
    reader.readAsDataURL(file);
}

// ===== CREATE NEW ENTITIES =====
function createNewCart() {
    const id = `cart_${Date.now()}`;
    const newCart = {
        id: id,
        name: 'New Cart',
        color: '#4CAF50',
        x: 0.5,
        y: 0.5,
        width: 80,
        height: 80,
        isInventory: false
    };

    CONFIG.carts.push(newCart);
    STATE.unsavedChanges = true;
    buildHierarchy();
    updateStatusBar();
    selectEntity('cart', id);
    drawCanvas();
    showAlert('New cart created', 'success');
}

function createNewScenario() {
    const id = `scenario_${Date.now()}`;
    const newScenario = {
        id: id,
        name: 'New Scenario',
        description: 'Describe the medical emergency here...',
        essential: [],
        optional: [],
        successFeedback: 'Perfect!',
        partialFeedback: 'Good, but incomplete.',
        failureFeedback: 'Missing critical items.'
    };

    CONFIG.scenarios.push(newScenario);
    STATE.unsavedChanges = true;
    buildHierarchy();
    updateStatusBar();
    selectEntity('scenario', id);
    showAlert('New scenario created', 'success');
}

function createNewDrawer() {
    const id = `drawer_${Date.now()}`;
    const newDrawer = {
        id: id,
        name: 'New Drawer',
        cart: '',
        number: 1
    };

    CONFIG.drawers.push(newDrawer);
    STATE.unsavedChanges = true;
    buildHierarchy();
    updateStatusBar();
    selectEntity('drawer', id);
    showAlert('New drawer created', 'success');
}

function createNewItem() {
    const id = `item_${Date.now()}`;
    const newItem = {
        id: id,
        name: 'New Item',
        cart: '',
        drawer: '',
        description: ''
    };

    CONFIG.items.push(newItem);
    STATE.unsavedChanges = true;
    buildHierarchy();
    updateStatusBar();
    selectEntity('item', id);
    showAlert('New item created', 'success');
}

function createNewAchievement() {
    const id = `achievement_${Date.now()}`;
    const newAchievement = {
        id: id,
        title: 'New Achievement',
        description: 'Describe how to earn this achievement...',
        icon: '🏆',
        trigger: 'first-scenario',
        value: 0
    };

    CONFIG.achievements.push(newAchievement);
    STATE.unsavedChanges = true;
    buildHierarchy();
    updateStatusBar();
    selectEntity('achievement', id);
    showAlert('New achievement created', 'success');
}

// ===== DELETE ENTITY =====
function deleteCurrentEntity() {
    if (!STATE.selectedType || !STATE.selectedId) return;

    const entity = getEntity(STATE.selectedType, STATE.selectedId);
    if (!confirm(`Are you sure you want to delete ${entity?.name || STATE.selectedId}?`)) {
        return;
    }

    const collections = {
        'cart': CONFIG.carts,
        'scenario': CONFIG.scenarios,
        'drawer': CONFIG.drawers,
        'item': CONFIG.items,
        'achievement': CONFIG.achievements
    };

    const collection = collections[STATE.selectedType];
    const index = collection.findIndex(e => e.id === STATE.selectedId);
    if (index > -1) {
        collection.splice(index, 1);
        STATE.unsavedChanges = true;
        deselectEntity();
        buildHierarchy();
        updateStatusBar();
        drawCanvas();
        showAlert(`${STATE.selectedType} deleted`, 'success');
    }
}

// ===== STATUS BAR =====
function updateStatusBar() {
    document.getElementById('status-carts').textContent = CONFIG.carts.filter(c => !c.isInventory).length;
    document.getElementById('status-scenarios').textContent = CONFIG.scenarios.length;
    document.getElementById('status-drawers').textContent = CONFIG.drawers.length;
    document.getElementById('status-items').textContent = CONFIG.items.length;
    document.getElementById('status-achievements').textContent = CONFIG.achievements.length;
}

// ===== PERSISTENCE =====
function saveConfiguration() {
    localStorage.setItem('traumaRoomConfig', JSON.stringify(CONFIG));
}

function saveAll() {
    saveConfiguration();
    STATE.unsavedChanges = false;
    document.getElementById('status-message').textContent = 'Saved at ' + new Date().toLocaleTimeString();
    showAlert('All changes saved', 'success');
}

function loadConfiguration() {
    const saved = localStorage.getItem('traumaRoomConfig');
    if (saved) {
        CONFIG = JSON.parse(saved);
    } else {
        loadDefaultConfiguration();
    }

    document.getElementById('room-bg-color').value = CONFIG.roomSettings.backgroundColor;
}

function loadDefaultConfiguration() {
    CONFIG.carts = [
        { id: 'airway', name: 'Airway Cart', x: 0.2, y: 0.3, width: 80, height: 80, color: '#4CAF50' },
        { id: 'med', name: 'Medication Cart', x: 0.8, y: 0.3, width: 80, height: 80, color: '#2196F3' },
        { id: 'code', name: 'Code Cart', x: 0.2, y: 0.7, width: 80, height: 80, color: '#F44336' },
        { id: 'trauma', name: 'Trauma Cart', x: 0.8, y: 0.7, width: 80, height: 80, color: '#FF9800' },
        { id: 'inventory', name: 'Procedure Table', x: 0.5, y: 0.5, width: 80, height: 80, color: '#9C27B0', isInventory: true }
    ];

    CONFIG.drawers = [
        { id: 'd1', cart: 'airway', name: 'Top Drawer', number: 1 },
        { id: 'd2', cart: 'airway', name: 'Middle Drawer', number: 2 },
        { id: 'd3', cart: 'airway', name: 'Bottom Drawer', number: 3 },
        { id: 'd4', cart: 'med', name: 'Top Drawer', number: 1 },
        { id: 'd5', cart: 'med', name: 'Middle Drawer', number: 2 },
        { id: 'd6', cart: 'med', name: 'Bottom Drawer', number: 3 },
        { id: 'd7', cart: 'code', name: 'Top Drawer', number: 1 },
        { id: 'd8', cart: 'code', name: 'Middle Drawer', number: 2 },
        { id: 'd9', cart: 'code', name: 'Bottom Drawer', number: 3 },
        { id: 'd10', cart: 'trauma', name: 'Top Drawer', number: 1 },
        { id: 'd11', cart: 'trauma', name: 'Middle Drawer', number: 2 },
        { id: 'd12', cart: 'trauma', name: 'Bottom Drawer', number: 3 }
    ];

    CONFIG.items = [
        { id: 'ett', name: 'Endotracheal Tube', cart: 'airway', drawer: 'd1' },
        { id: 'laryngoscope', name: 'Laryngoscope', cart: 'airway', drawer: 'd1' },
        { id: 'bvm', name: 'Bag-Valve-Mask', cart: 'airway', drawer: 'd2' },
        { id: 'oropharyngeal', name: 'Oropharyngeal Airway', cart: 'airway', drawer: 'd2' },
        { id: 'suction', name: 'Suction Catheter', cart: 'airway', drawer: 'd3' },
        { id: 'oxygen', name: 'Oxygen Mask', cart: 'airway', drawer: 'd3' },
        { id: 'epinephrine', name: 'Epinephrine', cart: 'med', drawer: 'd4' },
        { id: 'atropine', name: 'Atropine', cart: 'med', drawer: 'd4' },
        { id: 'amiodarone', name: 'Amiodarone', cart: 'med', drawer: 'd5' },
        { id: 'lidocaine', name: 'Lidocaine', cart: 'med', drawer: 'd5' },
        { id: 'morphine', name: 'Morphine', cart: 'med', drawer: 'd6' },
        { id: 'naloxone', name: 'Naloxone', cart: 'med', drawer: 'd6' },
        { id: 'defibrillator', name: 'Defibrillator Pads', cart: 'code', drawer: 'd7' },
        { id: 'ecg', name: 'ECG Leads', cart: 'code', drawer: 'd7' },
        { id: 'iv-start', name: 'IV Start Kit', cart: 'code', drawer: 'd8' },
        { id: 'saline', name: 'Saline Flush', cart: 'code', drawer: 'd8' },
        { id: 'cpr-board', name: 'CPR Board', cart: 'code', drawer: 'd9' },
        { id: 'aed', name: 'AED', cart: 'code', drawer: 'd9' },
        { id: 'chest-tube', name: 'Chest Tube Kit', cart: 'trauma', drawer: 'd10' },
        { id: 'scalpel', name: 'Scalpel', cart: 'trauma', drawer: 'd10' },
        { id: 'gauze', name: 'Gauze Pads', cart: 'trauma', drawer: 'd11' },
        { id: 'tourniquet', name: 'Tourniquet', cart: 'trauma', drawer: 'd11' },
        { id: 'splint', name: 'Splint', cart: 'trauma', drawer: 'd12' },
        { id: 'cervical-collar', name: 'Cervical Collar', cart: 'trauma', drawer: 'd12' }
    ];

    CONFIG.scenarios = [
        {
            id: 's1',
            name: 'Cardiac Arrest',
            description: 'Patient in cardiac arrest. Prepare for immediate resuscitation.',
            essential: ['defibrillator', 'ecg', 'epinephrine', 'amiodarone'],
            optional: ['cpr-board', 'iv-start', 'saline']
        },
        {
            id: 's2',
            name: 'Airway Obstruction',
            description: 'Patient with complete airway obstruction requiring immediate intervention.',
            essential: ['laryngoscope', 'ett', 'bvm', 'suction'],
            optional: ['oropharyngeal', 'oxygen']
        },
        {
            id: 's3',
            name: 'Severe Trauma',
            description: 'Multiple trauma patient with suspected internal bleeding.',
            essential: ['gauze', 'tourniquet', 'chest-tube', 'iv-start'],
            optional: ['cervical-collar', 'splint', 'scalpel']
        }
    ];

    CONFIG.achievements = [
        { id: 'first-scenario', title: 'First Steps', description: 'Complete your first scenario', icon: '🎯', trigger: 'first-scenario' },
        { id: 'perfect-score', title: 'Perfectionist', description: 'Get a perfect score', icon: '💯', trigger: 'perfect-score' },
        { id: 'speed-demon', title: 'Speed Demon', description: 'Complete in under 30 seconds', icon: '⚡', trigger: 'speed', value: 30 }
    ];

    saveConfiguration();
}

// ===== EXPORT/IMPORT =====
function exportConfiguration() {
    const dataStr = JSON.stringify(CONFIG, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trauma-room-config-${Date.now()}.json`;
    link.click();
    showAlert('Configuration exported', 'success');
}

function importConfiguration() {
    document.getElementById('import-modal').classList.add('active');
}

function processImport() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];

    if (!file) {
        showAlert('Please select a file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            CONFIG = JSON.parse(e.target.result);
            saveConfiguration();
            buildHierarchy();
            updateStatusBar();
            drawCanvas();
            closeModal('import-modal');
            showAlert('Configuration imported successfully', 'success');
        } catch (error) {
            showAlert('Invalid configuration file', 'error');
        }
    };
    reader.readAsText(file);
}

function resetToDefaults() {
    if (!confirm('This will reset all configurations to defaults. Continue?')) {
        return;
    }

    localStorage.removeItem('traumaRoomConfig');
    loadDefaultConfiguration();
    deselectEntity();
    buildHierarchy();
    updateStatusBar();
    drawCanvas();
    showAlert('Reset to defaults complete', 'success');
}

function previewGame() {
    // Save current config to a preview-specific storage key
    localStorage.setItem('traumaRoomPreviewConfig', JSON.stringify(CONFIG));

    // Open the game with a query parameter to indicate preview mode
    const previewUrl = 'index.html?preview=true';
    const previewWindow = window.open(previewUrl, '_blank');

    if (previewWindow) {
        showAlert('Preview opened in new tab', 'success');
    } else {
        showAlert('Please allow popups to preview the game', 'error');
    }
}

// ===== UTILITIES =====
function showAlert(message, type = 'success') {
    const alert = document.getElementById('alert-toast');
    alert.textContent = message;
    alert.className = `alert-toast show ${type}`;

    setTimeout(() => {
        alert.classList.remove('show');
    }, 3000);
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ===== INITIALIZE =====
window.onload = init;
