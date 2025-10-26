// Teacher Admin Panel - JavaScript
// Data Management and UI Logic

// ===== DATA STRUCTURE =====
let CONFIG = {
    carts: [],
    drawers: [],
    items: [],
    scenarios: [],
    achievements: [],
    roomSettings: {
        backgroundColor: '#fafafa',
        width: 100,
        height: 100
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
        welcomeMessage: 'Welcome to Trauma Room Trainer!',
        enableTutorial: true,
        enableSound: true,
        enableHaptics: true
    }
};

// ===== INITIALIZATION =====
function init() {
    loadConfiguration();
    setupEventListeners();
    updateAllLists();
    updateStats();
    drawRoomPreview();
}

function setupEventListeners() {
    // Color picker sync
    document.getElementById('room-bg-color').addEventListener('input', (e) => {
        document.getElementById('room-bg-color-text').value = e.target.value;
        CONFIG.roomSettings.backgroundColor = e.target.value;
        drawRoomPreview();
    });

    document.getElementById('cart-color').addEventListener('input', (e) => {
        document.getElementById('cart-color-text').value = e.target.value;
    });

    // Room dimension changes
    document.getElementById('room-width').addEventListener('input', drawRoomPreview);
    document.getElementById('room-height').addEventListener('input', drawRoomPreview);
}

// ===== TAB NAVIGATION =====
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Refresh data when switching tabs
    updateAllLists();
}

// ===== ALERTS =====
function showAlert(type, message) {
    const alert = document.getElementById(`${type}-alert`);
    alert.textContent = message;
    alert.classList.add('show');
    setTimeout(() => {
        alert.classList.remove('show');
    }, 3000);
}

// ===== MODAL MANAGEMENT =====
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// ===== CART MANAGEMENT =====
function openAddCartModal() {
    document.getElementById('cart-modal-title').textContent = 'Add New Cart';
    document.getElementById('cart-edit-id').value = '';
    document.getElementById('cart-id').value = '';
    document.getElementById('cart-name').value = '';
    document.getElementById('cart-color').value = '#4CAF50';
    document.getElementById('cart-color-text').value = '#4CAF50';
    document.getElementById('cart-x').value = '0.5';
    document.getElementById('cart-y').value = '0.5';
    document.getElementById('cart-is-inventory').checked = false;
    openModal('cart-modal');
}

function editCart(cartId) {
    const cart = CONFIG.carts.find(c => c.id === cartId);
    if (!cart) return;

    document.getElementById('cart-modal-title').textContent = 'Edit Cart';
    document.getElementById('cart-edit-id').value = cart.id;
    document.getElementById('cart-id').value = cart.id;
    document.getElementById('cart-name').value = cart.name;
    document.getElementById('cart-color').value = cart.color;
    document.getElementById('cart-color-text').value = cart.color;
    document.getElementById('cart-x').value = cart.x;
    document.getElementById('cart-y').value = cart.y;
    document.getElementById('cart-is-inventory').checked = cart.isInventory || false;
    openModal('cart-modal');
}

function saveCart() {
    const editId = document.getElementById('cart-edit-id').value;
    const cartData = {
        id: document.getElementById('cart-id').value.trim(),
        name: document.getElementById('cart-name').value.trim(),
        color: document.getElementById('cart-color').value,
        x: parseFloat(document.getElementById('cart-x').value),
        y: parseFloat(document.getElementById('cart-y').value),
        isInventory: document.getElementById('cart-is-inventory').checked
    };

    // Validation
    if (!cartData.id || !cartData.name) {
        showAlert('error', 'Please fill in all required fields!');
        return;
    }

    // Check for duplicate ID (only if not editing)
    if (!editId && CONFIG.carts.find(c => c.id === cartData.id)) {
        showAlert('error', 'A cart with this ID already exists!');
        return;
    }

    if (editId) {
        // Edit existing
        const index = CONFIG.carts.findIndex(c => c.id === editId);
        if (index !== -1) {
            CONFIG.carts[index] = cartData;
            showAlert('success', 'Cart updated successfully!');
        }
    } else {
        // Add new
        CONFIG.carts.push(cartData);
        showAlert('success', 'Cart added successfully!');
    }

    saveConfiguration();
    updateAllLists();
    drawRoomPreview();
    closeModal('cart-modal');
}

function deleteCart(cartId) {
    if (!confirm('Are you sure you want to delete this cart? This will also delete all associated drawers and items.')) {
        return;
    }

    // Remove cart
    CONFIG.carts = CONFIG.carts.filter(c => c.id !== cartId);

    // Remove associated drawers
    const drawerIds = CONFIG.drawers.filter(d => d.cart === cartId).map(d => d.id);
    CONFIG.drawers = CONFIG.drawers.filter(d => d.cart !== cartId);

    // Remove associated items
    CONFIG.items = CONFIG.items.filter(i => i.cart !== cartId);

    showAlert('success', 'Cart and associated items deleted successfully!');
    saveConfiguration();
    updateAllLists();
    drawRoomPreview();
}

function renderCartsList() {
    const container = document.getElementById('carts-list');
    container.innerHTML = '';

    if (CONFIG.carts.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No carts yet. Add your first cart!</p>';
        return;
    }

    CONFIG.carts.forEach(cart => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <h4>${cart.name}</h4>
                <p>ID: ${cart.id} | Color: <span style="display: inline-block; width: 20px; height: 20px; background: ${cart.color}; border-radius: 4px; vertical-align: middle;"></span> ${cart.color}</p>
                <p>Position: X=${cart.x}, Y=${cart.y} ${cart.isInventory ? '| <span class="tag tag-info">Inventory</span>' : ''}</p>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary btn-small" onclick="editCart('${cart.id}')">✏️ Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteCart('${cart.id}')">🗑️ Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ===== SCENARIO MANAGEMENT =====
function openAddScenarioModal() {
    document.getElementById('scenario-modal-title').textContent = 'Add New Scenario';
    document.getElementById('scenario-edit-id').value = '';
    document.getElementById('scenario-id').value = '';
    document.getElementById('scenario-name').value = '';
    document.getElementById('scenario-description').value = '';
    document.getElementById('scenario-success-feedback').value = 'Perfect! You collected all required items correctly!';
    document.getElementById('scenario-partial-feedback').value = 'Good, but you missed some recommended items.';
    document.getElementById('scenario-failure-feedback').value = 'You are missing essential items for this procedure.';

    renderItemSelector('scenario-essential-items', []);
    renderItemSelector('scenario-optional-items', []);

    openModal('scenario-modal');
}

function editScenario(scenarioId) {
    const scenario = CONFIG.scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    document.getElementById('scenario-modal-title').textContent = 'Edit Scenario';
    document.getElementById('scenario-edit-id').value = scenario.id;
    document.getElementById('scenario-id').value = scenario.id;
    document.getElementById('scenario-name').value = scenario.name;
    document.getElementById('scenario-description').value = scenario.description;
    document.getElementById('scenario-success-feedback').value = scenario.successFeedback || 'Perfect!';
    document.getElementById('scenario-partial-feedback').value = scenario.partialFeedback || 'Good, but incomplete.';
    document.getElementById('scenario-failure-feedback').value = scenario.failureFeedback || 'Missing critical items.';

    renderItemSelector('scenario-essential-items', scenario.essential || []);
    renderItemSelector('scenario-optional-items', scenario.optional || []);

    openModal('scenario-modal');
}

function renderItemSelector(containerId, selectedItems) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (CONFIG.items.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No items available. Add items first!</p>';
        return;
    }

    CONFIG.items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-selector-item';
        if (selectedItems.includes(item.id)) {
            div.classList.add('selected');
        }
        div.textContent = item.name;
        div.onclick = () => {
            div.classList.toggle('selected');
        };
        container.appendChild(div);
    });
}

function getSelectedItems(containerId) {
    const container = document.getElementById(containerId);
    const selectedDivs = container.querySelectorAll('.item-selector-item.selected');
    const selectedIds = [];

    selectedDivs.forEach(div => {
        const item = CONFIG.items.find(i => i.name === div.textContent);
        if (item) selectedIds.push(item.id);
    });

    return selectedIds;
}

function saveScenario() {
    const editId = document.getElementById('scenario-edit-id').value;
    const scenarioData = {
        id: document.getElementById('scenario-id').value.trim(),
        name: document.getElementById('scenario-name').value.trim(),
        description: document.getElementById('scenario-description').value.trim(),
        essential: getSelectedItems('scenario-essential-items'),
        optional: getSelectedItems('scenario-optional-items'),
        successFeedback: document.getElementById('scenario-success-feedback').value.trim(),
        partialFeedback: document.getElementById('scenario-partial-feedback').value.trim(),
        failureFeedback: document.getElementById('scenario-failure-feedback').value.trim()
    };

    // Validation
    if (!scenarioData.id || !scenarioData.name || !scenarioData.description) {
        showAlert('error', 'Please fill in all required fields!');
        return;
    }

    if (scenarioData.essential.length === 0) {
        showAlert('error', 'Please select at least one essential item!');
        return;
    }

    // Check for duplicate ID (only if not editing)
    if (!editId && CONFIG.scenarios.find(s => s.id === scenarioData.id)) {
        showAlert('error', 'A scenario with this ID already exists!');
        return;
    }

    if (editId) {
        const index = CONFIG.scenarios.findIndex(s => s.id === editId);
        if (index !== -1) {
            CONFIG.scenarios[index] = scenarioData;
            showAlert('success', 'Scenario updated successfully!');
        }
    } else {
        CONFIG.scenarios.push(scenarioData);
        showAlert('success', 'Scenario added successfully!');
    }

    saveConfiguration();
    updateAllLists();
    closeModal('scenario-modal');
}

function deleteScenario(scenarioId) {
    if (!confirm('Are you sure you want to delete this scenario?')) {
        return;
    }

    CONFIG.scenarios = CONFIG.scenarios.filter(s => s.id !== scenarioId);
    showAlert('success', 'Scenario deleted successfully!');
    saveConfiguration();
    updateAllLists();
}

function renderScenariosList() {
    const container = document.getElementById('scenarios-list');
    container.innerHTML = '';

    if (CONFIG.scenarios.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No scenarios yet. Add your first scenario!</p>';
        return;
    }

    CONFIG.scenarios.forEach(scenario => {
        const div = document.createElement('div');
        div.className = 'list-item';

        const essentialTags = scenario.essential.map(id => {
            const item = CONFIG.items.find(i => i.id === id);
            return item ? `<span class="tag tag-essential">${item.name}</span>` : '';
        }).join('');

        const optionalTags = scenario.optional.map(id => {
            const item = CONFIG.items.find(i => i.id === id);
            return item ? `<span class="tag tag-optional">${item.name}</span>` : '';
        }).join('');

        div.innerHTML = `
            <div class="list-item-content">
                <h4>${scenario.name}</h4>
                <p>${scenario.description}</p>
                <p style="margin-top: 8px;">
                    <strong>Essential:</strong> ${essentialTags || '<span style="color: #999;">None</span>'}
                </p>
                <p style="margin-top: 5px;">
                    <strong>Optional:</strong> ${optionalTags || '<span style="color: #999;">None</span>'}
                </p>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary btn-small" onclick="editScenario('${scenario.id}')">✏️ Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteScenario('${scenario.id}')">🗑️ Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ===== DRAWER MANAGEMENT =====
function openAddDrawerModal() {
    document.getElementById('drawer-modal-title').textContent = 'Add New Drawer';
    document.getElementById('drawer-edit-id').value = '';
    document.getElementById('drawer-id').value = '';
    document.getElementById('drawer-name').value = '';
    document.getElementById('drawer-number').value = '1';

    populateCartDropdown('drawer-cart');
    openModal('drawer-modal');
}

function editDrawer(drawerId) {
    const drawer = CONFIG.drawers.find(d => d.id === drawerId);
    if (!drawer) return;

    document.getElementById('drawer-modal-title').textContent = 'Edit Drawer';
    document.getElementById('drawer-edit-id').value = drawer.id;
    document.getElementById('drawer-id').value = drawer.id;
    document.getElementById('drawer-name').value = drawer.name;
    document.getElementById('drawer-number').value = drawer.number || 1;

    populateCartDropdown('drawer-cart');
    document.getElementById('drawer-cart').value = drawer.cart;

    openModal('drawer-modal');
}

function saveDrawer() {
    const editId = document.getElementById('drawer-edit-id').value;
    const drawerData = {
        id: document.getElementById('drawer-id').value.trim(),
        name: document.getElementById('drawer-name').value.trim(),
        cart: document.getElementById('drawer-cart').value,
        number: parseInt(document.getElementById('drawer-number').value)
    };

    // Validation
    if (!drawerData.id || !drawerData.name || !drawerData.cart) {
        showAlert('error', 'Please fill in all required fields!');
        return;
    }

    // Check for duplicate ID (only if not editing)
    if (!editId && CONFIG.drawers.find(d => d.id === drawerData.id)) {
        showAlert('error', 'A drawer with this ID already exists!');
        return;
    }

    if (editId) {
        const index = CONFIG.drawers.findIndex(d => d.id === editId);
        if (index !== -1) {
            CONFIG.drawers[index] = drawerData;
            showAlert('success', 'Drawer updated successfully!');
        }
    } else {
        CONFIG.drawers.push(drawerData);
        showAlert('success', 'Drawer added successfully!');
    }

    saveConfiguration();
    updateAllLists();
    closeModal('drawer-modal');
}

function deleteDrawer(drawerId) {
    if (!confirm('Are you sure you want to delete this drawer? This will also delete all items in it.')) {
        return;
    }

    CONFIG.drawers = CONFIG.drawers.filter(d => d.id !== drawerId);
    CONFIG.items = CONFIG.items.filter(i => i.drawer !== drawerId);

    showAlert('success', 'Drawer and associated items deleted successfully!');
    saveConfiguration();
    updateAllLists();
}

function renderDrawersList() {
    const container = document.getElementById('drawers-list');
    container.innerHTML = '';

    if (CONFIG.drawers.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No drawers yet. Add your first drawer!</p>';
        return;
    }

    CONFIG.drawers.forEach(drawer => {
        const cart = CONFIG.carts.find(c => c.id === drawer.cart);
        const cartName = cart ? cart.name : 'Unknown Cart';
        const itemCount = CONFIG.items.filter(i => i.drawer === drawer.id).length;

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <h4>${drawer.name}</h4>
                <p>Cart: ${cartName} | Number: ${drawer.number} | Items: ${itemCount}</p>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary btn-small" onclick="editDrawer('${drawer.id}')">✏️ Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteDrawer('${drawer.id}')">🗑️ Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ===== ITEM MANAGEMENT =====
function openAddItemModal() {
    document.getElementById('item-modal-title').textContent = 'Add New Item';
    document.getElementById('item-edit-id').value = '';
    document.getElementById('item-id').value = '';
    document.getElementById('item-name').value = '';
    document.getElementById('item-description').value = '';
    document.getElementById('item-image').value = '';
    document.getElementById('item-image-preview').innerHTML = 'No image selected';
    document.getElementById('item-image-preview').className = 'image-preview empty';

    populateCartDropdown('item-cart');
    updateDrawerOptions();

    openModal('item-modal');
}

function editItem(itemId) {
    const item = CONFIG.items.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('item-modal-title').textContent = 'Edit Item';
    document.getElementById('item-edit-id').value = item.id;
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-description').value = item.description || '';

    populateCartDropdown('item-cart');
    document.getElementById('item-cart').value = item.cart;
    updateDrawerOptions();
    document.getElementById('item-drawer').value = item.drawer;

    // Show existing image if any
    if (item.image) {
        const preview = document.getElementById('item-image-preview');
        preview.className = 'image-preview';
        preview.innerHTML = `<img src="${item.image}" alt="${item.name}">`;
    }

    openModal('item-modal');
}

function previewItemImage() {
    const file = document.getElementById('item-image').files[0];
    const preview = document.getElementById('item-image-preview');

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.className = 'image-preview';
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

function saveItem() {
    const editId = document.getElementById('item-edit-id').value;
    const itemData = {
        id: document.getElementById('item-id').value.trim(),
        name: document.getElementById('item-name').value.trim(),
        cart: document.getElementById('item-cart').value,
        drawer: document.getElementById('item-drawer').value,
        description: document.getElementById('item-description').value.trim()
    };

    // Get image if uploaded
    const imageFile = document.getElementById('item-image').files[0];
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            itemData.image = e.target.result;
            completeItemSave(editId, itemData);
        };
        reader.readAsDataURL(imageFile);
    } else {
        // Keep existing image if editing
        if (editId) {
            const existingItem = CONFIG.items.find(i => i.id === editId);
            if (existingItem && existingItem.image) {
                itemData.image = existingItem.image;
            }
        }
        completeItemSave(editId, itemData);
    }
}

function completeItemSave(editId, itemData) {
    // Validation
    if (!itemData.id || !itemData.name || !itemData.cart || !itemData.drawer) {
        showAlert('error', 'Please fill in all required fields!');
        return;
    }

    // Check for duplicate ID (only if not editing)
    if (!editId && CONFIG.items.find(i => i.id === itemData.id)) {
        showAlert('error', 'An item with this ID already exists!');
        return;
    }

    if (editId) {
        const index = CONFIG.items.findIndex(i => i.id === editId);
        if (index !== -1) {
            CONFIG.items[index] = itemData;
            showAlert('success', 'Item updated successfully!');
        }
    } else {
        CONFIG.items.push(itemData);
        showAlert('success', 'Item added successfully!');
    }

    saveConfiguration();
    updateAllLists();
    closeModal('item-modal');
}

function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    CONFIG.items = CONFIG.items.filter(i => i.id !== itemId);
    showAlert('success', 'Item deleted successfully!');
    saveConfiguration();
    updateAllLists();
}

function renderItemsList() {
    const container = document.getElementById('items-list');
    container.innerHTML = '';

    if (CONFIG.items.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No items yet. Add your first item!</p>';
        return;
    }

    CONFIG.items.forEach(item => {
        const cart = CONFIG.carts.find(c => c.id === item.cart);
        const drawer = CONFIG.drawers.find(d => d.id === item.drawer);
        const cartName = cart ? cart.name : 'Unknown';
        const drawerName = drawer ? drawer.name : 'Unknown';

        const div = document.createElement('div');
        div.className = 'list-item';

        const imageHTML = item.image
            ? `<img src="${item.image}" style="width: 50px; height: 50px; object-fit: contain; margin-right: 10px; border: 1px solid #ddd; border-radius: 4px;">`
            : '';

        div.innerHTML = `
            <div class="list-item-content" style="display: flex; align-items: center;">
                ${imageHTML}
                <div>
                    <h4>${item.name}</h4>
                    <p>Cart: ${cartName} | Drawer: ${drawerName}</p>
                    ${item.description ? `<p style="font-size: 12px; color: #888;">${item.description}</p>` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary btn-small" onclick="editItem('${item.id}')">✏️ Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteItem('${item.id}')">🗑️ Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ===== ACHIEVEMENT MANAGEMENT =====
function openAddAchievementModal() {
    document.getElementById('achievement-modal-title').textContent = 'Add New Achievement';
    document.getElementById('achievement-edit-id').value = '';
    document.getElementById('achievement-id').value = '';
    document.getElementById('achievement-title').value = '';
    document.getElementById('achievement-description').value = '';
    document.getElementById('achievement-icon').value = '🏆';
    document.getElementById('achievement-trigger').value = 'first-scenario';
    document.getElementById('achievement-value').value = '0';

    openModal('achievement-modal');
}

function editAchievement(achievementId) {
    const achievement = CONFIG.achievements.find(a => a.id === achievementId);
    if (!achievement) return;

    document.getElementById('achievement-modal-title').textContent = 'Edit Achievement';
    document.getElementById('achievement-edit-id').value = achievement.id;
    document.getElementById('achievement-id').value = achievement.id;
    document.getElementById('achievement-title').value = achievement.title;
    document.getElementById('achievement-description').value = achievement.description;
    document.getElementById('achievement-icon').value = achievement.icon || '🏆';
    document.getElementById('achievement-trigger').value = achievement.trigger || 'first-scenario';
    document.getElementById('achievement-value').value = achievement.value || 0;

    openModal('achievement-modal');
}

function saveAchievement() {
    const editId = document.getElementById('achievement-edit-id').value;
    const achievementData = {
        id: document.getElementById('achievement-id').value.trim(),
        title: document.getElementById('achievement-title').value.trim(),
        description: document.getElementById('achievement-description').value.trim(),
        icon: document.getElementById('achievement-icon').value.trim() || '🏆',
        trigger: document.getElementById('achievement-trigger').value,
        value: parseInt(document.getElementById('achievement-value').value) || 0
    };

    // Validation
    if (!achievementData.id || !achievementData.title || !achievementData.description) {
        showAlert('error', 'Please fill in all required fields!');
        return;
    }

    // Check for duplicate ID (only if not editing)
    if (!editId && CONFIG.achievements.find(a => a.id === achievementData.id)) {
        showAlert('error', 'An achievement with this ID already exists!');
        return;
    }

    if (editId) {
        const index = CONFIG.achievements.findIndex(a => a.id === editId);
        if (index !== -1) {
            CONFIG.achievements[index] = achievementData;
            showAlert('success', 'Achievement updated successfully!');
        }
    } else {
        CONFIG.achievements.push(achievementData);
        showAlert('success', 'Achievement added successfully!');
    }

    saveConfiguration();
    updateAllLists();
    closeModal('achievement-modal');
}

function deleteAchievement(achievementId) {
    if (!confirm('Are you sure you want to delete this achievement?')) {
        return;
    }

    CONFIG.achievements = CONFIG.achievements.filter(a => a.id !== achievementId);
    showAlert('success', 'Achievement deleted successfully!');
    saveConfiguration();
    updateAllLists();
}

function renderAchievementsList() {
    const container = document.getElementById('achievements-list');
    container.innerHTML = '';

    if (CONFIG.achievements.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No achievements yet. Add your first achievement!</p>';
        return;
    }

    CONFIG.achievements.forEach(achievement => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <h4>${achievement.icon} ${achievement.title}</h4>
                <p>${achievement.description}</p>
                <p><span class="tag tag-info">Trigger: ${achievement.trigger}${achievement.value ? ` (${achievement.value})` : ''}</span></p>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary btn-small" onclick="editAchievement('${achievement.id}')">✏️ Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteAchievement('${achievement.id}')">🗑️ Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ===== UTILITY FUNCTIONS =====
function populateCartDropdown(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select a cart...</option>';

    CONFIG.carts.filter(c => !c.isInventory).forEach(cart => {
        const option = document.createElement('option');
        option.value = cart.id;
        option.textContent = cart.name;
        select.appendChild(option);
    });
}

function updateDrawerOptions() {
    const cartId = document.getElementById('item-cart').value;
    const drawerSelect = document.getElementById('item-drawer');
    drawerSelect.innerHTML = '<option value="">Select a drawer...</option>';

    if (!cartId) return;

    const cartDrawers = CONFIG.drawers.filter(d => d.cart === cartId);
    cartDrawers.forEach(drawer => {
        const option = document.createElement('option');
        option.value = drawer.id;
        option.textContent = drawer.name;
        drawerSelect.appendChild(option);
    });
}

function updateAllLists() {
    renderCartsList();
    renderScenariosList();
    renderDrawersList();
    renderItemsList();
    renderAchievementsList();
    updateStats();
}

function updateStats() {
    document.getElementById('stat-carts').textContent = CONFIG.carts.filter(c => !c.isInventory).length;
    document.getElementById('stat-scenarios').textContent = CONFIG.scenarios.length;
    document.getElementById('stat-items').textContent = CONFIG.items.length;
    document.getElementById('stat-drawers').textContent = CONFIG.drawers.length;
}

// ===== ROOM PREVIEW =====
function drawRoomPreview() {
    const canvas = document.getElementById('room-preview');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Background
    ctx.fillStyle = CONFIG.roomSettings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw carts
    CONFIG.carts.forEach(cart => {
        const x = cart.x * canvas.width;
        const y = cart.y * canvas.height;
        const size = Math.min(canvas.width, canvas.height) * 0.15;

        // Cart body
        ctx.fillStyle = cart.color;
        ctx.fillRect(x - size/2, y - size/2, size, size);

        // Cart label
        ctx.fillStyle = 'white';
        ctx.font = `bold ${size * 0.15}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (cart.isInventory) {
            ctx.font = `bold ${size * 0.4}px Arial`;
            ctx.fillText('🎒', x, y);
        } else {
            ctx.fillText(cart.name.split(' ')[0], x, y);
        }
    });
}

// ===== ROOM SETTINGS =====
function saveRoomSettings() {
    CONFIG.roomSettings.backgroundColor = document.getElementById('room-bg-color').value;
    CONFIG.roomSettings.width = parseInt(document.getElementById('room-width').value);
    CONFIG.roomSettings.height = parseInt(document.getElementById('room-height').value);

    saveConfiguration();
    drawRoomPreview();
    showAlert('success', 'Room settings saved successfully!');
}

// ===== SCORING RULES =====
function saveScoringRules() {
    CONFIG.scoringRules = {
        essentialPoints: parseInt(document.getElementById('essential-points').value),
        optionalPoints: parseInt(document.getElementById('optional-points').value),
        penaltyPoints: parseInt(document.getElementById('penalty-points').value),
        perfectBonus: parseInt(document.getElementById('perfect-bonus').value),
        speedThreshold: parseInt(document.getElementById('speed-threshold').value),
        speedBonus: parseInt(document.getElementById('speed-bonus').value)
    };

    saveConfiguration();
    showAlert('success', 'Scoring rules saved successfully!');
}

// ===== GENERAL SETTINGS =====
function saveGeneralSettings() {
    CONFIG.generalSettings = {
        appTitle: document.getElementById('app-title').value,
        welcomeMessage: document.getElementById('welcome-message').value,
        enableTutorial: document.getElementById('enable-tutorial').checked,
        enableSound: document.getElementById('enable-sound').checked,
        enableHaptics: document.getElementById('enable-haptics').checked
    };

    saveConfiguration();
    showAlert('success', 'General settings saved successfully!');
}

// ===== PERSISTENCE =====
function saveConfiguration() {
    localStorage.setItem('teacherConfig', JSON.stringify(CONFIG));
}

function loadConfiguration() {
    const saved = localStorage.getItem('teacherConfig');
    if (saved) {
        CONFIG = JSON.parse(saved);
    } else {
        // Load defaults from student game if available
        loadDefaultConfiguration();
    }

    // Update UI elements
    if (CONFIG.roomSettings) {
        document.getElementById('room-bg-color').value = CONFIG.roomSettings.backgroundColor || '#fafafa';
        document.getElementById('room-bg-color-text').value = CONFIG.roomSettings.backgroundColor || '#fafafa';
        document.getElementById('room-width').value = CONFIG.roomSettings.width || 100;
        document.getElementById('room-height').value = CONFIG.roomSettings.height || 100;
    }

    if (CONFIG.scoringRules) {
        document.getElementById('essential-points').value = CONFIG.scoringRules.essentialPoints || 60;
        document.getElementById('optional-points').value = CONFIG.scoringRules.optionalPoints || 20;
        document.getElementById('penalty-points').value = CONFIG.scoringRules.penaltyPoints || 5;
        document.getElementById('perfect-bonus').value = CONFIG.scoringRules.perfectBonus || 500;
        document.getElementById('speed-threshold').value = CONFIG.scoringRules.speedThreshold || 60;
        document.getElementById('speed-bonus').value = CONFIG.scoringRules.speedBonus || 300;
    }

    if (CONFIG.generalSettings) {
        document.getElementById('app-title').value = CONFIG.generalSettings.appTitle || 'Trauma Room Trainer';
        document.getElementById('welcome-message').value = CONFIG.generalSettings.welcomeMessage || 'Welcome!';
        document.getElementById('enable-tutorial').checked = CONFIG.generalSettings.enableTutorial !== false;
        document.getElementById('enable-sound').checked = CONFIG.generalSettings.enableSound !== false;
        document.getElementById('enable-haptics').checked = CONFIG.generalSettings.enableHaptics !== false;
    }
}

function loadDefaultConfiguration() {
    // Default configuration matching the student game
    CONFIG.carts = [
        { id: 'airway', name: 'Airway Cart', x: 0.2, y: 0.3, color: '#4CAF50' },
        { id: 'med', name: 'Medication Cart', x: 0.8, y: 0.3, color: '#2196F3' },
        { id: 'code', name: 'Code Cart', x: 0.2, y: 0.7, color: '#F44336' },
        { id: 'trauma', name: 'Trauma Cart', x: 0.8, y: 0.7, color: '#FF9800' },
        { id: 'inventory', name: 'Procedure Table', x: 0.5, y: 0.5, color: '#9C27B0', isInventory: true }
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
        { id: 'perfect-score', title: 'Perfectionist', description: 'Get a perfect score on any scenario', icon: '💯', trigger: 'perfect-score' },
        { id: 'speed-demon', title: 'Speed Demon', description: 'Complete a scenario in under 30 seconds', icon: '⚡', trigger: 'speed', value: 30 }
    ];

    saveConfiguration();
}

// ===== EXPORT / IMPORT =====
function exportConfiguration() {
    const dataStr = JSON.stringify(CONFIG, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trauma-room-config-${Date.now()}.json`;
    link.click();
    showAlert('success', 'Configuration exported successfully!');
}

function importConfiguration() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];

    if (!file) {
        showAlert('error', 'Please select a file to import!');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            CONFIG = imported;
            saveConfiguration();
            loadConfiguration();
            updateAllLists();
            drawRoomPreview();
            showAlert('success', 'Configuration imported successfully!');
        } catch (error) {
            showAlert('error', 'Invalid configuration file!');
        }
    };
    reader.readAsText(file);
}

function resetToDefaults() {
    if (!confirm('This will reset ALL configurations to default values. Are you sure?')) {
        return;
    }

    localStorage.removeItem('teacherConfig');
    loadDefaultConfiguration();
    loadConfiguration();
    updateAllLists();
    drawRoomPreview();
    showAlert('success', 'Configuration reset to defaults!');
}

function previewStudentView() {
    window.open('index.html', '_blank');
}

function generateStudentGame() {
    showAlert('info', 'Generating student game file with current configuration...');

    // This would generate a new index.html with the custom configuration
    // For now, we'll just save the config and inform the teacher
    saveConfiguration();

    alert('Configuration saved! The student game (index.html) will automatically use your custom settings when you integrate the configuration. See documentation for integration instructions.');
}

// ===== INITIALIZE ON LOAD =====
window.onload = init;
