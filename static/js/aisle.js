
/**
 * 全局库道数组
 */
window.aisles = [];

/**
 * 库道模式状态
 */
let aisleMode = false;
let allPaths = [];
let currentPathIndex = -1;
let drawingStart = null;
let pathPreviewGroup = null;
let enhancedGrid = null;
let selectedPointInfo = null;
let hoveredPointInfo = null;

let historyStack = [];
let redoStack = [];
const MAX_HISTORY = 50;

const AISLE_CONFIG = {
    pointRadius: 0.4,
    pointColor: 0x00FF00,
    pointHoverColor: 0xFFFF00,
    pointSelectedColor: 0xFF6600,
    lineColor: 0x00FF00,
    lineWidth: 2,
    gridSize: 100,
    gridDivisions: 100,
    subGridDivisions: 200,
    snapThreshold: 0.5,
    drawingLineColor: 0x00AAFF
};

/**
 * 进入铺设库道模式
 */
function enterAisleMode() {
    aisleMode = true;

    const camera = window.CoreModule.getCamera();
    const controls = window.CoreModule.getControls();
    controls.target.set(0, 0, 0);
    camera.position.set(0, 50, 0.01);
    camera.lookAt(0, 0, 0);
    controls.update();

    controls.enableRotate = false;

    createEnhancedGrid();

    allPaths = [];
    if (window.aisles.length > 0) {
        window.aisles.forEach(aisle => {
            if (aisle.userData && aisle.userData.path && aisle.userData.path.length >= 2) {
                allPaths.push(aisle.userData.path.map(p => ({ x: p.x, z: p.z })));
            }
        });

        window.aisles.forEach(aisle => {
            aisle.visible = false;
        });
    }

    createPathPreviewGroup();

    renderPathPreview();

    document.body.style.cursor = 'crosshair';
    const btn = document.getElementById('aisleLayingBtn');
    if (btn) {
        btn.textContent = '✅ 完成铺设';
        btn.classList.add('aisle-mode-active');
    }

    const hint = document.getElementById('placementHint');
    if (hint) {
        hint.innerHTML = '🛤️ <b>库道铺设模式</b>：点击设起点→再点击设终点形成库道，可连接已有点，右键删除点，Ctrl+Z撤销';
        hint.style.display = 'block';
    }

    const toolButtons = document.getElementById('aisleToolButtons');
    if (toolButtons) {
        toolButtons.style.display = 'flex';
    }

    historyStack = [];
    redoStack = [];
    drawingStart = null;
    selectedPointInfo = null;
    hoveredPointInfo = null;

    saveToHistory();

    console.log('进入库道铺设模式，已加载', allPaths.length, '条路径');
}

/**
 * 退出铺设库道模式
 */
function exitAisleMode() {
    if (!aisleMode) return;

    aisleMode = false;

    const controls = window.CoreModule.getControls();
    controls.enableRotate = true;

    if (allPaths.length > 0) {
        generateAllAisles();
    } else {
        window.aisles.forEach(aisle => {
            aisle.visible = true;
        });
    }

    clearPathPreview();
    removeEnhancedGrid();

    allPaths = [];
    drawingStart = null;
    selectedPointInfo = null;
    hoveredPointInfo = null;

    document.body.style.cursor = 'default';
    const btn = document.getElementById('aisleLayingBtn');
    if (btn) {
        btn.textContent = '🛤️ 铺设库道';
        btn.classList.remove('aisle-mode-active');
    }

    const hint = document.getElementById('placementHint');
    if (hint) {
        hint.style.display = 'none';
    }

    const toolButtons = document.getElementById('aisleToolButtons');
    if (toolButtons) {
        toolButtons.style.display = 'none';
    }

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }

    console.log('退出库道铺设模式');
}

/**
 * 获取库道模式状态
 */
function isAisleMode() {
    return aisleMode;
}

/**
 * 保存当前状态到历史栈
 */
function saveToHistory() {
    const pathsCopy = allPaths.map(path => path.map(p => ({ x: p.x, z: p.z })));
    historyStack.push({
        paths: pathsCopy,
        drawingStart: drawingStart ? { ...drawingStart } : null
    });

    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
    }

    redoStack = [];
}

/**
 * 撤销操作
 */
function undo() {
    if (!aisleMode || historyStack.length <= 1) {
        console.log('无法撤销：历史记录不足');
        return false;
    }

    const currentState = historyStack.pop();
    redoStack.push(currentState);

    const previousState = historyStack[historyStack.length - 1];
    allPaths = previousState.paths.map(path => path.map(p => ({ x: p.x, z: p.z })));
    drawingStart = previousState.drawingStart ? { ...previousState.drawingStart } : null;

    selectedPointInfo = null;
    hoveredPointInfo = null;

    renderPathPreview();
    console.log('撤销成功，剩余历史:', historyStack.length);
    return true;
}

/**
 * 重做操作
 */
function redo() {
    if (!aisleMode || redoStack.length === 0) {
        console.log('无法重做：没有可重做的操作');
        return false;
    }

    const nextState = redoStack.pop();

    historyStack.push(nextState);

    allPaths = nextState.paths.map(path => path.map(p => ({ x: p.x, z: p.z })));
    drawingStart = nextState.drawingStart ? { ...nextState.drawingStart } : null;

    selectedPointInfo = null;
    hoveredPointInfo = null;

    renderPathPreview();
    console.log('重做成功，剩余重做:', redoStack.length);
    return true;
}

/**
 * 创建增强网格
 */
function createEnhancedGrid() {
    const scene = window.CoreModule.getScene();

    removeEnhancedGrid();

    enhancedGrid = new THREE.Group();
    enhancedGrid.name = 'aisleEnhancedGrid';

    const mainGrid = new THREE.GridHelper(
        AISLE_CONFIG.gridSize,
        AISLE_CONFIG.gridDivisions,
        0x4488FF,
        0x336699
    );
    mainGrid.position.y = 0.02;
    enhancedGrid.add(mainGrid);

    const subGrid = new THREE.GridHelper(
        AISLE_CONFIG.gridSize,
        AISLE_CONFIG.subGridDivisions,
        0x224466,
        0x223344
    );
    subGrid.position.y = 0.01;
    enhancedGrid.add(subGrid);

    addGridLabels(enhancedGrid);

    scene.add(enhancedGrid);
}

/**
 * 添加网格坐标标记
 */
function addGridLabels(group) {
    const halfSize = AISLE_CONFIG.gridSize / 2;
    const interval = 10;

    for (let i = -halfSize; i <= halfSize; i += interval) {
        if (i === 0) continue;

        const xLabel = createTextSprite(i.toString(), 0x4488FF);
        xLabel.position.set(i, 0.5, -halfSize - 1);
        xLabel.scale.set(2, 1, 1);
        group.add(xLabel);

        const zLabel = createTextSprite(i.toString(), 0x44FF88);
        zLabel.position.set(-halfSize - 1, 0.5, i);
        zLabel.scale.set(2, 1, 1);
        group.add(zLabel);
    }
}

/**
 * 创建文字精灵
 */
function createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 16);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    return new THREE.Sprite(material);
}

/**
 * 移除增强网格
 */
function removeEnhancedGrid() {
    const scene = window.CoreModule.getScene();
    if (enhancedGrid) {
        scene.remove(enhancedGrid);
        enhancedGrid = null;
    }
}

/**
 * 创建路径预览组
 */
function createPathPreviewGroup() {
    const scene = window.CoreModule.getScene();

    clearPathPreview();

    pathPreviewGroup = new THREE.Group();
    pathPreviewGroup.name = 'aislePathPreview';
    scene.add(pathPreviewGroup);
}

/**
 * 清理路径预览
 */
function clearPathPreview() {
    const scene = window.CoreModule.getScene();
    if (pathPreviewGroup) {
        scene.remove(pathPreviewGroup);
        pathPreviewGroup = null;
    }
}

/**
 * 渲染路径预览
 */
function renderPathPreview() {
    if (!pathPreviewGroup) return;

    while (pathPreviewGroup.children.length > 0) {
        pathPreviewGroup.remove(pathPreviewGroup.children[0]);
    }

    const width = parseFloat(document.getElementById('aisleWidth')?.value) || 2;

    const allPoints = [];

    allPaths.forEach((path, pathIndex) => {
        if (path.length < 2) return;

        const linePoints = path.map(p => new THREE.Vector3(p.x, 0.1, p.z));
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: AISLE_CONFIG.lineColor,
            linewidth: AISLE_CONFIG.lineWidth
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        pathPreviewGroup.add(line);

        renderWidthPreviewForPath(path, width);

        path.forEach((point, pointIndex) => {
            allPoints.push({ pathIndex, pointIndex, x: point.x, z: point.z });
        });
    });

    const drawnPoints = new Set();
    allPoints.forEach(pointInfo => {
        const key = `${pointInfo.x.toFixed(2)},${pointInfo.z.toFixed(2)}`;
        if (drawnPoints.has(key)) return;
        drawnPoints.add(key);

        const isSelected = selectedPointInfo &&
            selectedPointInfo.pathIndex === pointInfo.pathIndex &&
            selectedPointInfo.pointIndex === pointInfo.pointIndex;
        const isHovered = hoveredPointInfo &&
            hoveredPointInfo.x === pointInfo.x &&
            hoveredPointInfo.z === pointInfo.z;

        let color = AISLE_CONFIG.pointColor;
        if (isSelected) color = AISLE_CONFIG.pointSelectedColor;
        else if (isHovered) color = AISLE_CONFIG.pointHoverColor;

        const geometry = new THREE.CircleGeometry(AISLE_CONFIG.pointRadius, 16);
        const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
        const circle = new THREE.Mesh(geometry, material);
        circle.rotation.x = -Math.PI / 2;
        circle.position.set(pointInfo.x, 0.15, pointInfo.z);
        pathPreviewGroup.add(circle);
    });

    if (drawingStart) {
        const geometry = new THREE.RingGeometry(AISLE_CONFIG.pointRadius, AISLE_CONFIG.pointRadius + 0.15, 16);
        const material = new THREE.MeshBasicMaterial({
            color: AISLE_CONFIG.drawingLineColor,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(geometry, material);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(drawingStart.x, 0.2, drawingStart.z);
        pathPreviewGroup.add(ring);
    }
}

/**
 * 渲染单条路径的宽度预览
 */
function renderWidthPreviewForPath(path, width) {
    if (path.length < 2) return;

    const halfWidth = width / 2;

    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];

        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.1) continue;

        const nx = -dz / length * halfWidth;
        const nz = dx / length * halfWidth;

        const leftPoints = [
            new THREE.Vector3(p1.x + nx, 0.05, p1.z + nz),
            new THREE.Vector3(p2.x + nx, 0.05, p2.z + nz)
        ];
        const rightPoints = [
            new THREE.Vector3(p1.x - nx, 0.05, p1.z - nz),
            new THREE.Vector3(p2.x - nx, 0.05, p2.z - nz)
        ];

        const dashMaterial = new THREE.LineDashedMaterial({
            color: 0x00FF00,
            dashSize: 0.3,
            gapSize: 0.2
        });

        const leftGeom = new THREE.BufferGeometry().setFromPoints(leftPoints);
        const leftLine = new THREE.Line(leftGeom, dashMaterial);
        leftLine.computeLineDistances();
        pathPreviewGroup.add(leftLine);

        const rightGeom = new THREE.BufferGeometry().setFromPoints(rightPoints);
        const rightLine = new THREE.Line(rightGeom, dashMaterial);
        rightLine.computeLineDistances();
        pathPreviewGroup.add(rightLine);
    }
}

/**
 * 更新绘制预览线
 */
function updateDrawingPreview(endX, endZ) {
    if (!drawingStart || !pathPreviewGroup) return;

    const toRemove = [];
    pathPreviewGroup.children.forEach(child => {
        if (child.userData && child.userData.isDrawingPreview) {
            toRemove.push(child);
        }
    });
    toRemove.forEach(child => pathPreviewGroup.remove(child));

    const linePoints = [
        new THREE.Vector3(drawingStart.x, 0.1, drawingStart.z),
        new THREE.Vector3(endX, 0.1, endZ)
    ];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMaterial = new THREE.LineDashedMaterial({
        color: AISLE_CONFIG.drawingLineColor,
        dashSize: 0.5,
        gapSize: 0.3
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.computeLineDistances();
    line.userData = { isDrawingPreview: true };
    pathPreviewGroup.add(line);
}

/**
 * 处理库道模式点击
 */
function handleAisleClick(x, z, isRightClick = false) {
    if (!aisleMode) return false;

    const snappedX = Math.round(x * 2) / 2;
    const snappedZ = Math.round(z * 2) / 2;

    if (isRightClick) {
        if (drawingStart) {
            drawingStart = null;
            renderPathPreview();
            updateHint('已取消绘制');
        } else {
            const nearestInfo = findNearestPoint(snappedX, snappedZ);
            if (nearestInfo) {
                deletePoint(nearestInfo.pathIndex, nearestInfo.pointIndex);
                saveToHistory();
            }
        }
        return true;
    }

    const clickedPoint = findPointAtPosition(snappedX, snappedZ);

    if (!drawingStart) {
        if (clickedPoint) {
            drawingStart = { x: clickedPoint.x, z: clickedPoint.z, fromExisting: true };
            updateHint(`起点已设置 (${clickedPoint.x.toFixed(1)}, ${clickedPoint.z.toFixed(1)})，点击设置终点`);
        } else {
            drawingStart = { x: snappedX, z: snappedZ, fromExisting: false };
            updateHint(`起点已设置 (${snappedX.toFixed(1)}, ${snappedZ.toFixed(1)})，点击设置终点`);
        }
        renderPathPreview();
    } else {
        let endPoint;
        if (clickedPoint) {
            endPoint = { x: clickedPoint.x, z: clickedPoint.z };
        } else {
            endPoint = { x: snappedX, z: snappedZ };
        }

        if (Math.abs(endPoint.x - drawingStart.x) < 0.1 && Math.abs(endPoint.z - drawingStart.z) < 0.1) {
            updateHint('起点和终点不能相同');
            return true;
        }

        addPathSegment(drawingStart, endPoint);
        saveToHistory();

        drawingStart = { x: endPoint.x, z: endPoint.z, fromExisting: true };
        updateHint(`库道已添加！继续点击添加下一段，右键取消或按ESC退出`);
        renderPathPreview();
    }

    return true;
}

/**
 * 添加路径段
 */
function addPathSegment(start, end) {
    let connected = false;

    for (let i = 0; i < allPaths.length; i++) {
        const path = allPaths[i];
        const first = path[0];
        const last = path[path.length - 1];

        if (Math.abs(last.x - start.x) < 0.1 && Math.abs(last.z - start.z) < 0.1) {
            path.push({ x: end.x, z: end.z });
            connected = true;
            break;
        }
        if (Math.abs(first.x - start.x) < 0.1 && Math.abs(first.z - start.z) < 0.1) {
            path.unshift({ x: end.x, z: end.z });
            connected = true;
            break;
        }
        if (Math.abs(last.x - end.x) < 0.1 && Math.abs(last.z - end.z) < 0.1) {
            path.push({ x: start.x, z: start.z });
            connected = true;
            break;
        }
        if (Math.abs(first.x - end.x) < 0.1 && Math.abs(first.z - end.z) < 0.1) {
            path.unshift({ x: start.x, z: start.z });
            connected = true;
            break;
        }
    }

    if (!connected) {
        allPaths.push([
            { x: start.x, z: start.z },
            { x: end.x, z: end.z }
        ]);
    }

    mergePaths();
}

/**
 * 合并可以连接的路径
 */
function mergePaths() {
    let merged = true;
    while (merged) {
        merged = false;
        for (let i = 0; i < allPaths.length && !merged; i++) {
            for (let j = i + 1; j < allPaths.length && !merged; j++) {
                const pathA = allPaths[i];
                const pathB = allPaths[j];

                const aFirst = pathA[0];
                const aLast = pathA[pathA.length - 1];
                const bFirst = pathB[0];
                const bLast = pathB[pathB.length - 1];

                if (Math.abs(aLast.x - bFirst.x) < 0.1 && Math.abs(aLast.z - bFirst.z) < 0.1) {
                    allPaths[i] = pathA.concat(pathB.slice(1));
                    allPaths.splice(j, 1);
                    merged = true;
                }
                else if (Math.abs(aLast.x - bLast.x) < 0.1 && Math.abs(aLast.z - bLast.z) < 0.1) {
                    allPaths[i] = pathA.concat(pathB.slice(0, -1).reverse());
                    allPaths.splice(j, 1);
                    merged = true;
                }
                else if (Math.abs(aFirst.x - bFirst.x) < 0.1 && Math.abs(aFirst.z - bFirst.z) < 0.1) {
                    allPaths[i] = pathB.slice(1).reverse().concat(pathA);
                    allPaths.splice(j, 1);
                    merged = true;
                }
                else if (Math.abs(aFirst.x - bLast.x) < 0.1 && Math.abs(aFirst.z - bLast.z) < 0.1) {
                    allPaths[i] = pathB.concat(pathA.slice(1));
                    allPaths.splice(j, 1);
                    merged = true;
                }
            }
        }
    }
}

/**
 * 删除点
 */
function deletePoint(pathIndex, pointIndex) {
    if (pathIndex < 0 || pathIndex >= allPaths.length) return;
    const path = allPaths[pathIndex];
    if (pointIndex < 0 || pointIndex >= path.length) return;

    if (path.length <= 2) {
        allPaths.splice(pathIndex, 1);
    } else {
        if (pointIndex === 0 || pointIndex === path.length - 1) {
            path.splice(pointIndex, 1);
        } else {
            const beforePath = path.slice(0, pointIndex);
            const afterPath = path.slice(pointIndex + 1);
            allPaths.splice(pathIndex, 1);
            if (beforePath.length >= 2) allPaths.push(beforePath);
            if (afterPath.length >= 2) allPaths.push(afterPath);
        }
    }

    renderPathPreview();
}

/**
 * 更新提示信息
 */
function updateHint(message) {
    const hint = document.getElementById('placementHint');
    if (hint) {
        hint.innerHTML = `🛤️ ${message}`;
    }
}

/**
 * 处理库道模式鼠标移动
 */
function handleAisleMouseMove(x, z) {
    if (!aisleMode) return;

    const snappedX = Math.round(x * 2) / 2;
    const snappedZ = Math.round(z * 2) / 2;

    const newHovered = findPointAtPosition(snappedX, snappedZ);

    if (JSON.stringify(newHovered) !== JSON.stringify(hoveredPointInfo)) {
        hoveredPointInfo = newHovered;
        renderPathPreview();
    }

    if (drawingStart) {
        updateDrawingPreview(snappedX, snappedZ);
    }
}

/**
 * 查找指定位置的点
 */
function findPointAtPosition(x, z) {
    const threshold = AISLE_CONFIG.pointRadius * 2;

    for (let pathIndex = 0; pathIndex < allPaths.length; pathIndex++) {
        const path = allPaths[pathIndex];
        for (let pointIndex = 0; pointIndex < path.length; pointIndex++) {
            const p = path[pointIndex];
            const dist = Math.sqrt((p.x - x) ** 2 + (p.z - z) ** 2);
            if (dist < threshold) {
                return { pathIndex, pointIndex, x: p.x, z: p.z };
            }
        }
    }
    return null;
}

/**
 * 查找最近的点
 */
function findNearestPoint(x, z) {
    let minDist = Infinity;
    let nearest = null;

    for (let pathIndex = 0; pathIndex < allPaths.length; pathIndex++) {
        const path = allPaths[pathIndex];
        for (let pointIndex = 0; pointIndex < path.length; pointIndex++) {
            const p = path[pointIndex];
            const dist = Math.sqrt((p.x - x) ** 2 + (p.z - z) ** 2);
            if (dist < minDist && dist < 2) {
                minDist = dist;
                nearest = { pathIndex, pointIndex, x: p.x, z: p.z };
            }
        }
    }

    return nearest;
}

/**
 * 生成所有库道
 */
function generateAllAisles() {
    const scene = window.CoreModule.getScene();
    const width = parseFloat(document.getElementById('aisleWidth')?.value) || 2;

    clearAllAisles();

    allPaths.forEach((path, index) => {
        if (path.length >= 2) {
            generateAisle(path, width);
        }
    });

    console.log('已生成', window.aisles.length, '条库道');
}

/**
 * 生成单条库道
 */
function generateAisle(pathPoints, width) {
    if (pathPoints.length < 2) return null;

    const scene = window.CoreModule.getScene();

    const aisleGroup = new THREE.Group();
    aisleGroup.name = 'aisle';
    aisleGroup.userData = {
        isAisle: true,
        path: pathPoints.map(p => ({ x: p.x, z: p.z })),
        width: width
    };

    const height = 0.05;

    for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];

        const segment = createAisleSegment(p1, p2, width, height);
        if (segment) {
            aisleGroup.add(segment);
        }
    }

    for (let i = 1; i < pathPoints.length - 1; i++) {
        const corner = createCornerPiece(
            pathPoints[i - 1],
            pathPoints[i],
            pathPoints[i + 1],
            width,
            height
        );
        if (corner) {
            aisleGroup.add(corner);
        }
    }

    scene.add(aisleGroup);
    window.aisles.push(aisleGroup);

    return aisleGroup;
}

/**
 * 创建库道段
 */
function createAisleSegment(p1, p2, width, height) {
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length < 0.1) return null;

    const geometry = new THREE.BoxGeometry(length, height, width);
    const material = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.9,
        metalness: 0.1
    });

    const segment = new THREE.Mesh(geometry, material);

    segment.position.set(
        (p1.x + p2.x) / 2,
        height / 2,
        (p1.z + p2.z) / 2
    );

    const angle = Math.atan2(dz, dx);
    segment.rotation.y = -angle;

    segment.receiveShadow = true;

    return segment;
}

/**
 * 创建转角连接
 */
function createCornerPiece(p1, p2, p3, width, height) {
    const geometry = new THREE.CircleGeometry(width / 2, 16);
    const material = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.9,
        metalness: 0.1,
        side: THREE.DoubleSide
    });

    const corner = new THREE.Mesh(geometry, material);
    corner.rotation.x = -Math.PI / 2;
    corner.position.set(p2.x, height, p2.z);
    corner.receiveShadow = true;

    return corner;
}

/**
 * 清除所有库道
 */
function clearAllAisles() {
    const scene = window.CoreModule.getScene();

    window.aisles.forEach(aisle => {
        scene.remove(aisle);
    });
    window.aisles = [];
}

/**
 * 获取库道数据（用于保存）
 */
function getAisleData() {
    return window.aisles.map(aisle => {
        if (aisle.userData && aisle.userData.isAisle) {
            return {
                path: aisle.userData.path,
                width: aisle.userData.width
            };
        }
        return null;
    }).filter(a => a !== null);
}

/**
 * 加载库道数据
 */
function loadAisleData(data) {
    if (!Array.isArray(data)) return;

    clearAllAisles();

    data.forEach(aisleData => {
        if (aisleData.path && aisleData.path.length >= 2) {
            generateAisle(aisleData.path, aisleData.width || 2);
        }
    });

    console.log('已加载', data.length, '条库道');
}

/**
 * 删除指定库道
 */
function deleteAisle(index) {
    if (index < 0 || index >= window.aisles.length) return;

    const scene = window.CoreModule.getScene();
    const aisle = window.aisles[index];
    scene.remove(aisle);
    window.aisles.splice(index, 1);

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }
}

/**
 * 删除最近的点（供UI按钮调用）
 */
function deleteLastPoint() {
    if (!aisleMode) return;

    if (selectedPointInfo) {
        deletePoint(selectedPointInfo.pathIndex, selectedPointInfo.pointIndex);
        selectedPointInfo = null;
        saveToHistory();
        updateHint('已删除选中的点');
        return;
    }

    if (allPaths.length > 0) {
        const lastPath = allPaths[allPaths.length - 1];
        if (lastPath.length > 0) {
            deletePoint(allPaths.length - 1, lastPath.length - 1);
            saveToHistory();
            updateHint('已删除最后一个点');
        }
    }
}

/**
 * 清空当前所有路径（供UI按钮调用）
 */
function clearCurrentPaths() {
    if (!aisleMode) return;

    if (allPaths.length === 0) {
        updateHint('没有可清空的路径');
        return;
    }

    allPaths = [];
    drawingStart = null;
    selectedPointInfo = null;
    saveToHistory();
    renderPathPreview();
    updateHint('已清空所有路径');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aisleMode) {
        if (drawingStart) {
            drawingStart = null;
            renderPathPreview();
            updateHint('已取消绘制，再按ESC退出铺设模式');
        } else {
            exitAisleMode();
        }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && aisleMode) {
        e.preventDefault();
        undo();
    }
    if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y') && aisleMode) {
        e.preventDefault();
        redo();
    }
});

window.AisleModule = {
    enterAisleMode,
    exitAisleMode,
    isAisleMode,
    handleAisleClick,
    handleAisleMouseMove,
    getAisleData,
    loadAisleData,
    clearAllAisles,
    deleteAisle,
    generateAisle,
    undo,
    redo,
    deleteLastPoint,
    clearCurrentPaths
};
