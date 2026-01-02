
let measureGroup = null;
let snapEnabled = true;

/**
 * 初始化测量模块
 */
function initMeasure() {
    const scene = window.CoreModule.getScene();
    measureGroup = new THREE.Group();
    measureGroup.name = 'measureGroup';
    scene.add(measureGroup);
}

/**
 * 显示两个货架之间的距离测量
 */
function showMeasurement(shelf1, shelf2) {
    hideMeasurement();

    if (!measureGroup) {
        initMeasure();
    }

    const bounds1 = getShelfBounds(shelf1);
    const bounds2 = getShelfBounds(shelf2);

    const xDistance = calculateEdgeDistance(bounds1, bounds2, 'x');
    const zDistance = calculateEdgeDistance(bounds1, bounds2, 'z');

    if (Math.abs(xDistance) > 0.01) {
        createMeasureLine(shelf1, shelf2, 'x', xDistance);
    }

    if (Math.abs(zDistance) > 0.01) {
        createMeasureLine(shelf1, shelf2, 'z', zDistance);
    }
}

/**
 * 隐藏测量标注
 */
function hideMeasurement() {
    if (measureGroup) {
        while (measureGroup.children.length > 0) {
            const child = measureGroup.children[0];
            measureGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
    }
}

/**
 * 获取货架边界
 */
function getShelfBounds(shelf) {
    const width = shelf.userData.width || shelf.userData.length || 2;
    const depth = shelf.userData.depth || 1;
    const pos = shelf.position;

    return {
        minX: pos.x - width / 2,
        maxX: pos.x + width / 2,
        minZ: pos.z - depth / 2,
        maxZ: pos.z + depth / 2,
        centerX: pos.x,
        centerZ: pos.z
    };
}

/**
 * 计算边缘到边缘的距离
 */
function calculateEdgeDistance(bounds1, bounds2, axis) {
    if (axis === 'x') {
        if (bounds1.maxX <= bounds2.minX) {
            return bounds2.minX - bounds1.maxX;
        } else if (bounds2.maxX <= bounds1.minX) {
            return bounds1.minX - bounds2.maxX;
        } else {
            return 0;
        }
    } else {
        if (bounds1.maxZ <= bounds2.minZ) {
            return bounds2.minZ - bounds1.maxZ;
        } else if (bounds2.maxZ <= bounds1.minZ) {
            return bounds1.minZ - bounds2.maxZ;
        } else {
            return 0;
        }
    }
}

/**
 * 创建测量标注线
 */
function createMeasureLine(shelf1, shelf2, axis, distance) {
    const bounds1 = getShelfBounds(shelf1);
    const bounds2 = getShelfBounds(shelf2);
    const height = Math.max(shelf1.userData.height, shelf2.userData.height) + 0.5;

    let startPoint, endPoint;

    if (axis === 'x') {
        const z = (bounds1.centerZ + bounds2.centerZ) / 2;
        if (bounds1.centerX < bounds2.centerX) {
            startPoint = new THREE.Vector3(bounds1.maxX, height, z);
            endPoint = new THREE.Vector3(bounds2.minX, height, z);
        } else {
            startPoint = new THREE.Vector3(bounds2.maxX, height, z);
            endPoint = new THREE.Vector3(bounds1.minX, height, z);
        }
    } else {
        const x = (bounds1.centerX + bounds2.centerX) / 2;
        if (bounds1.centerZ < bounds2.centerZ) {
            startPoint = new THREE.Vector3(x, height, bounds1.maxZ);
            endPoint = new THREE.Vector3(x, height, bounds2.minZ);
        } else {
            startPoint = new THREE.Vector3(x, height, bounds2.maxZ);
            endPoint = new THREE.Vector3(x, height, bounds1.minZ);
        }
    }

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: axis === 'x' ? 0xff0000 : 0x00ff00,
        linewidth: 2
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    measureGroup.add(line);

    const markerGeometry = new THREE.SphereGeometry(0.05);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: axis === 'x' ? 0xff0000 : 0x00ff00
    });

    const startMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    startMarker.position.copy(startPoint);
    measureGroup.add(startMarker);

    const endMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    endMarker.position.copy(endPoint);
    measureGroup.add(endMarker);

    createDistanceLabel(startPoint, endPoint, distance, axis);
}

/**
 * 创建距离文字标注
 */
function createDistanceLabel(startPoint, endPoint, distance, axis) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;

    context.fillStyle = axis === 'x' ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'white';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(distance.toFixed(2) + 'm', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);

    const midPoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
    midPoint.y += axis === 'x' ? 0.5 : 0.1;
    sprite.position.copy(midPoint);
    sprite.scale.set(1, 0.5, 1);

    measureGroup.add(sprite);
}

/**
 * 自动吸附功能 - 在拖动时调用
 */
function applySnap(draggingShelf, newPosition) {
    if (!snapEnabled) return newPosition;

    const shelves = window.ShelfModule.getShelves();
    const config = window.ControlModule.getConfig() || {};
    const unit = config.global_params?.unit === '米' ? 1 : 0.01;
    const snapThreshold = unit * 0.1;

    const dragBounds = getShelfBoundsAtPosition(draggingShelf, newPosition);

    let snappedX = newPosition.x;
    let snappedZ = newPosition.z;
    let snapped = false;

    for (const shelf of shelves) {
        if (shelf === draggingShelf) continue;

        const targetBounds = getShelfBounds(shelf);

        if (Math.abs(dragBounds.minX - targetBounds.maxX) < snapThreshold) {
            snappedX = targetBounds.maxX + (newPosition.x - dragBounds.minX);
            snapped = true;
        }
        else if (Math.abs(dragBounds.maxX - targetBounds.minX) < snapThreshold) {
            snappedX = targetBounds.minX - (dragBounds.maxX - newPosition.x);
            snapped = true;
        }

        if (Math.abs(dragBounds.minZ - targetBounds.maxZ) < snapThreshold) {
            snappedZ = targetBounds.maxZ + (newPosition.z - dragBounds.minZ);
            snapped = true;
        }
        else if (Math.abs(dragBounds.maxZ - targetBounds.minZ) < snapThreshold) {
            snappedZ = targetBounds.minZ - (dragBounds.maxZ - newPosition.z);
            snapped = true;
        }
    }

    if (snapped) {
        return new THREE.Vector3(snappedX, newPosition.y, snappedZ);
    }
    return newPosition;
}

/**
 * 获取货架在指定位置的边界
 */
function getShelfBoundsAtPosition(shelf, position) {
    const width = shelf.userData.width || shelf.userData.length || 2;
    const depth = shelf.userData.depth || 1;

    return {
        minX: position.x - width / 2,
        maxX: position.x + width / 2,
        minZ: position.z - depth / 2,
        maxZ: position.z + depth / 2,
        centerX: position.x,
        centerZ: position.z
    };
}

/**
 * 切换吸附开关
 */
function toggleSnap() {
    snapEnabled = !snapEnabled;
    const btn = document.getElementById('snapToggleBtn');
    if (btn) {
        btn.textContent = snapEnabled ? '吸附: 开' : '吸附: 关';
        btn.classList.toggle('active', snapEnabled);
    }
    window.InfoModule.showSuccess(snapEnabled ? '吸附已开启' : '吸附已关闭');
}

/**
 * 获取吸附状态
 */
function isSnapEnabled() {
    return snapEnabled;
}

window.MeasureModule = {
    initMeasure,
    showMeasurement,
    hideMeasurement,
    applySnap,
    toggleSnap,
    isSnapEnabled
};
