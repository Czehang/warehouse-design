
let environmentVisible = true;
let spaceLength = 50;
let spaceWidth = 50;

/**
 * 切换环境显示
 * 显示环境：显示地板，隐藏网格
 * 关闭环境：隐藏地板，显示网格
 */
function toggleEnvironment() {
    environmentVisible = !environmentVisible;

    const scene = window.CoreModule.getScene();
    const grid = scene.getObjectByName('environmentGrid');
    const ground = scene.getObjectByName('environmentGround');
    const axes = scene.getObjectByName('environmentAxes');

    if (grid) grid.visible = !environmentVisible;
    if (ground) ground.visible = environmentVisible;
    if (axes) axes.visible = true;

    const btn = document.getElementById('envToggleBtn');
    if (btn) {
        btn.classList.toggle('active', environmentVisible);
        btn.textContent = environmentVisible ? '显示环境' : '关闭环境';
    }

    window.InfoModule.showSuccess(environmentVisible ? '环境已显示（地板模式）' : '环境已关闭（网格模式）');
}

/**
 * 打开环境配置模态框
 */
function openEnvConfig() {
    const modal = document.getElementById('envConfigModal');
    if (modal) {
        modal.classList.add('visible');

        document.getElementById('spaceLength').value = spaceLength;
        document.getElementById('spaceWidth').value = spaceWidth;

        setupColorPairSync('floorColorPicker', 'floorColorHex');
        setupColorPairSync('gridColor1Picker', 'gridColor1Hex');
        setupColorPairSync('gridColor2Picker', 'gridColor2Hex');
    }
}

/**
 * 设置颜色选择器和Hex输入框同步
 */
function setupColorPairSync(pickerId, hexId) {
    const picker = document.getElementById(pickerId);
    const hex = document.getElementById(hexId);

    if (!picker || !hex) return;

    picker.onchange = () => {
        hex.value = picker.value;
    };

    hex.onchange = () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) {
            picker.value = hex.value;
        }
    };
}

/**
 * 关闭环境配置模态框
 */
function closeEnvConfig() {
    const modal = document.getElementById('envConfigModal');
    if (modal) {
        modal.classList.remove('visible');
    }
}

/**
 * 应用环境配置
 */
function applyEnvConfig() {
    const scene = window.CoreModule.getScene();

    const newLength = parseFloat(document.getElementById('spaceLength').value) || 50;
    const newWidth = parseFloat(document.getElementById('spaceWidth').value) || 50;
    const sizeChanged = (newLength !== spaceLength || newWidth !== spaceWidth);
    spaceLength = newLength;
    spaceWidth = newWidth;

    const floorColor = document.getElementById('floorColorPicker').value;
    const gridColor1 = document.getElementById('gridColor1Picker').value;
    const gridColor2 = document.getElementById('gridColor2Picker').value;

    const oldGround = scene.getObjectByName('environmentGround');
    if (oldGround) {
        if (sizeChanged) {
            scene.remove(oldGround);
            oldGround.geometry.dispose();
            oldGround.material.dispose();

            const groundGeometry = new THREE.PlaneGeometry(spaceLength, spaceWidth);
            const groundMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(floorColor),
                side: THREE.DoubleSide
            });
            const newGround = new THREE.Mesh(groundGeometry, groundMaterial);
            newGround.name = 'environmentGround';
            newGround.rotation.x = -Math.PI / 2;
            newGround.receiveShadow = true;
            newGround.visible = environmentVisible;
            scene.add(newGround);
        } else {
            oldGround.material.color.setStyle(floorColor);
        }
    }

    const oldGrid = scene.getObjectByName('environmentGrid');
    if (oldGrid) {
        scene.remove(oldGrid);
        oldGrid.geometry.dispose();
        oldGrid.material.dispose();
    }

    const maxSize = Math.max(spaceLength, spaceWidth);
    const gridDivisions = Math.ceil(maxSize / 1);
    const newGrid = new THREE.GridHelper(
        maxSize,
        gridDivisions,
        new THREE.Color(gridColor1),
        new THREE.Color(gridColor2)
    );
    newGrid.name = 'environmentGrid';
    newGrid.visible = !environmentVisible;
    scene.add(newGrid);

    closeEnvConfig();
    window.InfoModule.showSuccess(`空间尺寸已设置为 ${spaceLength}m × ${spaceWidth}m`);

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }
}

/**
 * 从配置恢复环境颜色和尺寸（用于加载配置时调用）
 */
function applyConfigColors(env) {
    const scene = window.CoreModule.getScene();

    if (env.spaceLength && env.spaceWidth) {
        spaceLength = env.spaceLength;
        spaceWidth = env.spaceWidth;

        const oldGround = scene.getObjectByName('environmentGround');
        if (oldGround) {
            const floorColor = env.floorColor || '#333333';
            scene.remove(oldGround);
            oldGround.geometry.dispose();
            oldGround.material.dispose();

            const groundGeometry = new THREE.PlaneGeometry(spaceLength, spaceWidth);
            const groundMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(floorColor),
                side: THREE.DoubleSide
            });
            const newGround = new THREE.Mesh(groundGeometry, groundMaterial);
            newGround.name = 'environmentGround';
            newGround.rotation.x = -Math.PI / 2;
            newGround.receiveShadow = true;
            newGround.visible = environmentVisible;
            scene.add(newGround);
        }
    } else if (env.floorColor) {
        const ground = scene.getObjectByName('environmentGround');
        if (ground && ground.material) {
            ground.material.color.setStyle(env.floorColor);
        }
    }

    if (env.gridColor1 && env.gridColor2) {
        const oldGrid = scene.getObjectByName('environmentGrid');
        if (oldGrid) {
            scene.remove(oldGrid);
            oldGrid.geometry.dispose();
            oldGrid.material.dispose();
        }

        const maxSize = Math.max(spaceLength, spaceWidth);
        const gridDivisions = Math.ceil(maxSize / 1);
        const newGrid = new THREE.GridHelper(
            maxSize,
            gridDivisions,
            new THREE.Color(env.gridColor1),
            new THREE.Color(env.gridColor2)
        );
        newGrid.name = 'environmentGrid';
        newGrid.visible = !environmentVisible;
        scene.add(newGrid);
    }

    if (typeof env.visible === 'boolean' && env.visible !== environmentVisible) {
        toggleEnvironment();
    }
}

/**
 * 获取当前空间尺寸
 */
function getSpaceDimensions() {
    return { length: spaceLength, width: spaceWidth };
}

window.EnvironmentModule = {
    toggleEnvironment,
    openEnvConfig,
    closeEnvConfig,
    applyEnvConfig,
    applyConfigColors,
    getSpaceDimensions,
    isEnvironmentVisible: () => environmentVisible
};

window.toggleEnvironment = toggleEnvironment;
window.openEnvConfig = openEnvConfig;
window.closeEnvConfig = closeEnvConfig;
window.applyEnvConfig = applyEnvConfig;
