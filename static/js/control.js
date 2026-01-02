
/**
 * 加载配置文件
 */
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        window.config = await response.json();
        updateUIFromConfig();
        renderShelvesFromConfig();
        renderPartsFromConfig();
        loadAislesFromConfig();
        updateStatistics();
    } catch (error) {
        console.error('加载配置失败:', error);
        window.InfoModule.showError('加载配置失败: ' + error.message);
    }
}

/**
 * 保存配置到服务器
 */
async function saveConfig() {
    try {
        const shelves = window.ShelfModule.getShelves();
        const shelvesData = window.shelves.map(shelf => ({
            position: { x: shelf.position.x, y: shelf.position.y, z: shelf.position.z },
            dimensions: {
                length: shelf.userData.length,
                height: shelf.userData.height,
                depth: shelf.userData.depth
            }
        }));

        const spaceDimensions = window.EnvironmentModule?.getSpaceDimensions() || { length: 50, width: 50 };
        const environmentConfig = {
            visible: window.EnvironmentModule ? window.EnvironmentModule.isEnvironmentVisible() : true,
            spaceLength: spaceDimensions.length,
            spaceWidth: spaceDimensions.width,
            floorColor: document.getElementById('floorColorPicker')?.value || '#333333',
            gridColor1: document.getElementById('gridColor1Picker')?.value || '#444444',
            gridColor2: document.getElementById('gridColor2Picker')?.value || '#222222'
        };

        const partsData = window.parts.map(part => ({
            partType: part.userData.partType,
            position: { x: part.position.x, z: part.position.z },
            rotation: part.rotation.y,
            stairType: part.userData.stairType || undefined,
            length: part.userData.length || undefined,
            width: part.userData.width || undefined,
            depth: part.userData.depth || undefined,
            height: part.userData.height || undefined
        }));

        const aislesData = window.AisleModule ? window.AisleModule.getAisleData() : [];

        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...config, shelves: shelvesData, environment: environmentConfig, parts: partsData, aisles: aislesData })
        });

        if (response.ok) {
            console.log('配置保存成功');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        window.InfoModule.showError('保存配置失败: ' + error.message);
    }
}

/**
 * 应用全局配置
 */
async function applyGlobalConfig() {
    const globalConfig = {
        area_count: parseInt(document.getElementById('areaCount').value),
        channel_count: parseInt(document.getElementById('channelCount').value),
        layer_count: parseInt(document.getElementById('layerCount').value),
        cell_count: parseInt(document.getElementById('cellCount').value),
        unit: document.getElementById('unit').value
    };

    try {
        const response = await fetch('/api/config/global', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(globalConfig)
        });

        if (response.ok) {
            window.config.global_params = globalConfig;
            window.InfoModule.showSuccess('全局配置应用成功');
            initializeShelves();
        }
    } catch (error) {
        console.error('应用全局配置失败:', error);
        window.InfoModule.showError('应用全局配置失败: ' + error.message);
    }
}

/**
 * 更新统计信息
 */
async function updateStatistics() {
    try {
        const response = await fetch('/api/statistics');
        const stats = await response.json();

        window.InfoModule.updateStatisticsDisplay(stats);
    } catch (error) {
        console.error('获取统计信息失败:', error);
    }
}

/**
 * 初始化货架布局
 */
function initializeShelves() {
    window.ShelfModule.clearShelves();

    if (!window.config.global_params) {
        window.config.global_params = {
            area_count: 4,
            channel_count: 2,
            layer_count: 5,
            cell_count: 20,
            unit: '米'
        };
    }

    const globalParams = window.config.global_params;
    const areaCount = globalParams.area_count || 4;
    const channelCount = globalParams.channel_count || 2;

    for (let area = 0; area < areaCount; area++) {
        for (let side = 0; side < 2; side++) {
            const x = (area * 6) + (side * 3) - (areaCount * 3) + 1.5;
            const z = -channelCount * 2 + 2;

            const layerCount = globalParams.layer_count || 5;
            const shelfHeight = layerCount * 0.6 + 1.5;
            const shelf = window.ShelfModule.createShelf(2, shelfHeight, 1, x, z);
            shelf.userData.area = area;
            shelf.userData.side = side;
        }
    }

    saveConfig();
    updateStatistics();
}

/**
 * 添加新货架
 */
function addShelf() {
    const globalParams = window.config.global_params || {
        layer_count: 5
    };
    const layerCount = globalParams.layer_count || 5;
    const shelfHeight = layerCount * 0.6 + 1.5;

    const shelf = window.ShelfModule.createShelf(2, shelfHeight, 1, 0, 0);
    window.EventsModule.clearSelection();
    shelf.userData.selected = true;
    window.ShelfModule.updateShelfAppearance(shelf);
    window.EventsModule.setSelectedShelf(shelf);
    window.InfoModule.showShelfInfo(shelf);
    updateControlPanel(shelf);
    saveConfig();
}

/**
 * 应用位置变更
 */
function applyPosition() {
    const selectedShelf = window.EventsModule.getSelectedShelf();
    if (selectedShelf) {
        const userX = parseFloat(document.getElementById('shelfX').value);
        const userY = parseFloat(document.getElementById('shelfZ').value);

        const depth = selectedShelf.userData.depth || 1;
        const width = selectedShelf.userData.width || selectedShelf.userData.length || 2;
        selectedShelf.position.x = userX - width / 2 + 0.5;
        selectedShelf.position.z = userY - depth / 2 - 0.5;

        window.InfoModule.showShelfInfo(selectedShelf);
        saveConfig();

        console.log('应用位置:', { userX, userY, depth, width, posX: selectedShelf.position.x, posZ: selectedShelf.position.z });
    }
}

/**
 * 应用尺寸变更
 */
function applyDimensions() {
    const selectedShelf = window.EventsModule.getSelectedShelf();
    if (selectedShelf) {
        const width = parseFloat(document.getElementById('shelfWidth').value);
        const height = parseFloat(document.getElementById('shelfHeight').value);
        const depth = parseFloat(document.getElementById('shelfDepth').value);

        selectedShelf.userData.width = width;
        selectedShelf.userData.length = width;
        selectedShelf.userData.height = height;
        selectedShelf.userData.depth = depth;

        const position = selectedShelf.position.clone();
        const scene = window.CoreModule.getScene();

        const shelves = window.ShelfModule.getShelves();
        window.ShelfModule.setShelves(shelves.filter(s => s !== selectedShelf));
        scene.remove(selectedShelf);

        const newShelf = window.ShelfModule.createShelf(width, height, depth, position.x, position.z);
        newShelf.userData.selected = true;
        window.ShelfModule.updateShelfAppearance(newShelf);
        window.EventsModule.setSelectedShelf(newShelf);

        window.InfoModule.showShelfInfo(newShelf);
        saveConfig();

        console.log('应用尺寸:', { width, height, depth });
    }
}

/**
 * 对齐货架（支持多选）
 */
function alignShelf(alignment) {
    const selectedShelves = window.EventsModule.getSelectedShelves();
    if (selectedShelves.length === 0) return;

    if (selectedShelves.length === 1) {
        const shelf = selectedShelves[0];
        window.InfoModule.showShelfInfo(shelf);
        saveConfig();
        return;
    }

    let targetValue;

    switch (alignment) {
        case 'front':
            targetValue = Math.min(...selectedShelves.map(s => s.position.z));
            selectedShelves.forEach(shelf => { shelf.position.z = targetValue; });
            break;
        case 'back':
            targetValue = Math.max(...selectedShelves.map(s => s.position.z));
            selectedShelves.forEach(shelf => { shelf.position.z = targetValue; });
            break;
        case 'left':
            targetValue = Math.min(...selectedShelves.map(s => s.position.x));
            selectedShelves.forEach(shelf => { shelf.position.x = targetValue; });
            break;
        case 'right':
            targetValue = Math.max(...selectedShelves.map(s => s.position.x));
            selectedShelves.forEach(shelf => { shelf.position.x = targetValue; });
            break;
    }

    saveConfig();
    window.InfoModule.showSuccess(`已完成${selectedShelves.length}个货架的${alignment === 'front' ? '前' : alignment === 'back' ? '后' : alignment === 'left' ? '左' : '右'}对齐`);
}

/**
 * 旋转货架
 */
function rotateShelf() {
    const selectedShelf = window.EventsModule.getSelectedShelf();
    if (selectedShelf) {
        selectedShelf.rotation.y += Math.PI / 2;
        saveConfig();
    }
}

/**
 * 等距分布货架（支持多选）
 * @param {string} direction - 'horizontal' 水平分布 或 'vertical' 垂直分布
 */
function distributeShelves(direction) {
    const selectedShelves = window.EventsModule.getSelectedShelves();
    if (selectedShelves.length < 3) {
        window.InfoModule.showError('等距分布需要至少选择3个货架');
        return;
    }

    const shelvesWithPos = selectedShelves.map(shelf => ({
        shelf: shelf,
        x: shelf.position.x,
        z: shelf.position.z
    }));

    if (direction === 'horizontal') {
        shelvesWithPos.sort((a, b) => a.x - b.x);

        const minX = shelvesWithPos[0].x;
        const maxX = shelvesWithPos[shelvesWithPos.length - 1].x;

        const totalDistance = maxX - minX;
        const interval = totalDistance / (shelvesWithPos.length - 1);

        shelvesWithPos.forEach((item, index) => {
            item.shelf.position.x = minX + interval * index;
        });

        window.InfoModule.showSuccess(`已完成${selectedShelves.length}个货架的水平等距分布`);
    } else if (direction === 'vertical') {
        shelvesWithPos.sort((a, b) => a.z - b.z);

        const minZ = shelvesWithPos[0].z;
        const maxZ = shelvesWithPos[shelvesWithPos.length - 1].z;

        const totalDistance = maxZ - minZ;
        const interval = totalDistance / (shelvesWithPos.length - 1);

        shelvesWithPos.forEach((item, index) => {
            item.shelf.position.z = minZ + interval * index;
        });

        window.InfoModule.showSuccess(`已完成${selectedShelves.length}个货架的垂直等距分布`);
    }

    saveConfig();
}

/**
 * 删除货架
 */
function deleteShelf() {
    const selectedShelf = window.EventsModule.getSelectedShelf();
    if (selectedShelf) {
        const scene = window.CoreModule.getScene();
        scene.remove(selectedShelf);
        const shelves = window.ShelfModule.getShelves();
        window.ShelfModule.setShelves(shelves.filter(shelf => shelf !== selectedShelf));
        window.EventsModule.clearSelection();
        saveConfig();
        updateStatistics();
    }
}

/**
 * 视角控制
 */
function setView(viewType) {
    const camera = window.CoreModule.getCamera();
    const controls = window.CoreModule.getControls();

    controls.target.set(0, 0, 0);

    switch (viewType) {
        case 'front':
            camera.position.set(0, 5, 15);
            break;
        case 'top':
            camera.position.set(0, 20, 0.01);
            break;
        case 'side':
            camera.position.set(15, 5, 0);
            break;
        case 'isometric':
            camera.position.set(15, 15, 15);
            break;
    }

    camera.lookAt(controls.target);
    controls.update();
}

/**
 * 放大视图
 */
function zoomIn() {
    const camera = window.CoreModule.getCamera();
    const controls = window.CoreModule.getControls();
    camera.position.multiplyScalar(0.9);
    controls.update();
}

/**
 * 缩小视图
 */
function zoomOut() {
    const camera = window.CoreModule.getCamera();
    const controls = window.CoreModule.getControls();
    camera.position.multiplyScalar(1.1);
    controls.update();
}

/**
 * 重置视图
 */
function resetView() {
    const camera = window.CoreModule.getCamera();
    const controls = window.CoreModule.getControls();
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);
    controls.reset();
}

/**
 * 导出配置
 */
async function exportConfig() {
    try {
        const response = await fetch('/api/export', { method: 'POST' });
        const configData = await response.json();

        const dataStr = JSON.stringify(configData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'warehouse_config.json';
        link.click();

        window.InfoModule.showSuccess('配置导出成功');
    } catch (error) {
        console.error('导出配置失败:', error);
        window.InfoModule.showError('导出配置失败: ' + error.message);
    }
}

/**
 * 导入配置
 */
async function importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                const fileContent = await file.text();
                const configData = JSON.parse(fileContent);

                const response = await fetch('/api/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: fileContent
                });

                if (response.ok) {
                    await loadConfig();
                    window.InfoModule.showSuccess('配置导入成功');
                }
            } catch (error) {
                console.error('导入配置失败:', error);
                window.InfoModule.showError('配置文件格式错误: ' + error.message);
            }
        }
    };

    input.click();
}

/**
 * 从配置渲染货架
 */
function renderShelvesFromConfig() {
    window.ShelfModule.clearShelves();

    if (window.config.shelves && Array.isArray(window.config.shelves)) {
        window.config.shelves.forEach(shelfData => {
            const { position, dimensions } = shelfData;
            const shelf = window.ShelfModule.createShelf(
                dimensions.length,
                dimensions.height,
                dimensions.depth,
                0,
                0
            );
            shelf.position.set(position.x, position.y, position.z);
        });
    }
}

/**
 * 从配置渲染环境零件（出库口、墙面、楼梯口、厕所）
 */
function renderPartsFromConfig() {
    const scene = window.CoreModule.getScene();
    window.parts.forEach(part => scene.remove(part));
    window.parts = [];

    if (window.config.parts && Array.isArray(window.config.parts)) {
        window.config.parts.forEach(partData => {
            const { partType, position, rotation } = partData;

            if (partType === 'dock') {
                if (window.createDock) {
                    window.createDock(position.x, position.z, rotation);
                }
            } else if (partType === 'wall') {
                if (window.createWall) {
                    const length = partData.length || 6;
                    const height = partData.height || 3;
                    window.createWall(position.x, position.z, length, height, rotation);
                }
            } else if (partType === 'staircase') {
                if (window.createStaircase) {
                    const stairType = partData.stairType || 'straight';
                    window.createStaircase(position.x, position.z, stairType, rotation);
                }
            } else if (partType === 'restroom') {
                if (window.createRestroom) {
                    const width = partData.width || 4;
                    const depth = partData.depth || 3;
                    const height = partData.height || 3;
                    window.createRestroom(position.x, position.z, width, depth, height, rotation);
                }
            } else if (partType === 'office') {
                if (window.createOffice) {
                    const width = partData.width || 6;
                    const depth = partData.depth || 4;
                    const height = partData.height || 3;
                    window.createOffice(position.x, position.z, width, depth, height, rotation);
                }
            }
        });
    }
}

/**
 * 从配置加载库道
 */
function loadAislesFromConfig() {
    if (window.config.aisles && Array.isArray(window.config.aisles) && window.AisleModule) {
        window.AisleModule.loadAisleData(window.config.aisles);
    }
}

/**
 * 更新UI从配置
 */
function updateUIFromConfig() {
    if (window.config.global_params) {
        document.getElementById('areaCount').value = window.config.global_params.area_count;
        document.getElementById('channelCount').value = window.config.global_params.channel_count;
        document.getElementById('layerCount').value = window.config.global_params.layer_count;
        document.getElementById('cellCount').value = window.config.global_params.cell_count;
        document.getElementById('unit').value = window.config.global_params.unit;
    }

    if (window.config.environment) {
        const env = window.config.environment;

        if (document.getElementById('floorColorPicker')) {
            document.getElementById('floorColorPicker').value = env.floorColor || '#333333';
            document.getElementById('floorColorHex').value = env.floorColor || '#333333';
        }
        if (document.getElementById('gridColor1Picker')) {
            document.getElementById('gridColor1Picker').value = env.gridColor1 || '#444444';
            document.getElementById('gridColor1Hex').value = env.gridColor1 || '#444444';
        }
        if (document.getElementById('gridColor2Picker')) {
            document.getElementById('gridColor2Picker').value = env.gridColor2 || '#222222';
            document.getElementById('gridColor2Hex').value = env.gridColor2 || '#222222';
        }

        if (window.EnvironmentModule && window.EnvironmentModule.applyConfigColors) {
            window.EnvironmentModule.applyConfigColors(env);
        }
    }
}

/**
 * 更新控制面板
 */
function updateControlPanel(shelf) {
    const panel = document.getElementById('selectedShelfPanel');
    panel.style.display = 'block';

    const depth = shelf.userData.depth || 1;
    const width = shelf.userData.width || shelf.userData.length || 2;
    const userX = shelf.position.x + width / 2 - 0.5;
    const userY = shelf.position.z + depth / 2 + 0.5;

    document.getElementById('shelfX').value = userX.toFixed(2);
    document.getElementById('shelfZ').value = userY.toFixed(2);
    document.getElementById('shelfWidth').value = shelf.userData.width || shelf.userData.length;
    document.getElementById('shelfHeight').value = shelf.userData.height;
    document.getElementById('shelfDepth').value = shelf.userData.depth;

    const config = window.ControlModule.getConfig() || {};
    const globalParams = config.global_params || {};
    document.getElementById('shelfCellCount').value = globalParams.cell_count || 20;
}

/**
 * 应用格口数量变更
 */
function applyCellCount() {
    const selectedShelf = window.EventsModule.getSelectedShelf();
    if (selectedShelf) {
        const cellCount = parseInt(document.getElementById('shelfCellCount').value);

        if (!window.config.global_params) {
            window.config.global_params = {};
        }
        window.config.global_params.cell_count = cellCount;

        saveConfig();

        const position = selectedShelf.position.clone();
        const dimensions = {
            length: selectedShelf.userData.length,
            height: selectedShelf.userData.height,
            depth: selectedShelf.userData.depth
        };

        const scene = window.CoreModule.getScene();
        scene.remove(selectedShelf);

        const newShelf = window.ShelfModule.createShelf(
            dimensions.length,
            dimensions.height,
            dimensions.depth,
            position.x,
            position.z
        );
        newShelf.userData.selected = true;
        window.EventsModule.setSelectedShelf(newShelf);

        window.InfoModule.showShelfInfo(newShelf);
        window.InfoModule.showSuccess('格口数量已更新');
    }
}

/**
 * 获取当前配置
 */
function getConfig() {
    return window.config;
}

/**
 * 设置当前配置
 */
function setConfig(newConfig) {
    config = newConfig;
}

window.toggleMode = () => window.EventsModule.toggleMode();

window.ControlModule = {
    loadConfig,
    saveConfig,
    applyGlobalConfig,
    updateStatistics,
    initializeShelves,
    addShelf,
    applyPosition,
    applyDimensions,
    alignShelf,
    rotateShelf,
    distributeShelves,
    deleteShelf,
    setView,
    zoomIn,
    zoomOut,
    resetView,
    exportConfig,
    importConfig,
    renderShelvesFromConfig,
    renderPartsFromConfig,
    updateUIFromConfig,
    updateControlPanel,
    applyCellCount,
    getConfig: () => window.config,
    setConfig: (newConfig) => { window.config = newConfig; }
};