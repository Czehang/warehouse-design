
/**
 * 货物列表
 */
window.cargos = [];

/**
 * 重力常量
 */
const GRAVITY = 9.8;
const GRAVITY_UPDATE_INTERVAL = 16;

/**
 * 放置模式状态
 */
let cargoPlacementMode = false;
let selectedSkuForPlacement = null;
let previewCargo = null;

/**
 * 创建货物6面材质
 * BoxGeometry面顺序: +X(右), -X(左), +Y(上), -Y(下), +Z(前), -Z(后)
 */
function createCargoMaterials(sku, width, height, depth) {
    const textureLoader = new THREE.TextureLoader();
    const defaultColor = 0xD4A574;

    const createDefaultMaterial = () => new THREE.MeshStandardMaterial({
        color: defaultColor,
        roughness: 0.8,
        metalness: 0.1
    });

    const createTextureMaterial = (textureFile) => {
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.6,
            metalness: 0.1
        });

        textureLoader.load(
            `/static/uploads/sku_images/${textureFile}`,
            (texture) => {
                material.map = texture;
                material.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.log('贴图加载失败:', textureFile);
                material.color.setHex(defaultColor);
            }
        );

        return material;
    };

    const materials = [
        sku.texture_right ? createTextureMaterial(sku.texture_right) : createDefaultMaterial(),
        sku.texture_left ? createTextureMaterial(sku.texture_left) : createDefaultMaterial(),
        sku.texture_top ? createTextureMaterial(sku.texture_top) : createDefaultMaterial(),
        sku.texture_bottom ? createTextureMaterial(sku.texture_bottom) : createDefaultMaterial(),
        sku.texture_front ? createTextureMaterial(sku.texture_front) : createDefaultMaterial(),
        sku.texture_back ? createTextureMaterial(sku.texture_back) : createDefaultMaterial()
    ];

    return materials;
}

/**
 * 创建货物3D模型
 * @param {Object} sku - SKU数据
 * @param {number} x - X坐标
 * @param {number} y - Y坐标（高度）
 * @param {number} z - Z坐标
 */
function createCargo(sku, x = 0, y = 0, z = 0) {
    const scene = window.CoreModule.getScene();
    const cargoGroup = new THREE.Group();

    const width = sku.width || 0.3;
    const height = sku.height || 0.2;
    const depth = sku.length || 0.5;

    const materials = createCargoMaterials(sku, width, height, depth);

    const boxGeometry = new THREE.BoxGeometry(width, height, depth);
    const box = new THREE.Mesh(boxGeometry, materials);
    box.castShadow = true;
    box.receiveShadow = true;
    cargoGroup.add(box);

    if (!sku.texture_top) {
        const tapeGeometry = new THREE.BoxGeometry(width * 0.15, 0.005, depth);
        const tapeMaterial = new THREE.MeshStandardMaterial({
            color: 0xC4A35A,
            roughness: 0.5
        });
        const tape = new THREE.Mesh(tapeGeometry, tapeMaterial);
        tape.position.y = height / 2 + 0.002;
        cargoGroup.add(tape);
    }

    cargoGroup.position.set(x, y + height / 2, z);

    cargoGroup.userData = {
        isCargo: true,
        dbId: null,
        sku: sku,
        skuId: sku.id,
        name: sku.name || '货物',
        width: width,
        height: height,
        depth: depth,
        weight: sku.weight || 1.0,
        velocity: { x: 0, y: 0, z: 0 },
        grounded: false,
        selected: false
    };

    scene.add(cargoGroup);
    window.cargos.push(cargoGroup);

    updateCargoGravity(cargoGroup);

    saveCargoToDb(cargoGroup, sku.id, x, y, z);

    return cargoGroup;
}

/**
 * 保存货物到数据库
 */
async function saveCargoToDb(cargo, skuId, x, y, z) {
    try {
        const response = await fetch('/api/cargos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sku_id: skuId,
                x: x,
                y: y,
                z: z,
                rotation: 0
            })
        });

        if (response.ok) {
            const result = await response.json();
            cargo.userData.dbId = result.id;
            console.log('货物已保存到数据库:', result.id);
        }
    } catch (error) {
        console.error('保存货物失败:', error);
    }
}

/**
 * 从数据库加载所有货物
 */
async function loadCargosFromDb() {
    try {
        const response = await fetch('/api/cargos');
        if (response.ok) {
            const cargos = await response.json();
            console.log('从数据库加载货物:', cargos.length);

            for (const cargoData of cargos) {
                const sku = {
                    id: cargoData.sku_id,
                    name: cargoData.sku.name,
                    sku_code: cargoData.sku.sku_code,
                    length: cargoData.sku.length,
                    width: cargoData.sku.width,
                    height: cargoData.sku.height,
                    weight: cargoData.sku.weight,
                    thumbnail: cargoData.sku.thumbnail,
                    texture_top: cargoData.sku.texture_top,
                    texture_bottom: cargoData.sku.texture_bottom,
                    texture_front: cargoData.sku.texture_front,
                    texture_back: cargoData.sku.texture_back,
                    texture_left: cargoData.sku.texture_left,
                    texture_right: cargoData.sku.texture_right
                };

                const cargo = createCargoFromDb(sku, cargoData.x, cargoData.y, cargoData.z, cargoData.id);
                if (cargoData.rotation !== undefined && cargoData.rotation !== null) {
                    cargo.rotation.y = cargoData.rotation;
                }
            }
        }
    } catch (error) {
        console.error('加载货物失败:', error);
    }
}

/**
 * 从数据库数据创建货物（不再保存到数据库）
 */
function createCargoFromDb(sku, x, y, z, dbId) {
    const scene = window.CoreModule.getScene();
    const cargoGroup = new THREE.Group();

    const width = sku.width || 0.3;
    const height = sku.height || 0.2;
    const depth = sku.length || 0.5;

    const materials = createCargoMaterials(sku, width, height, depth);

    const boxGeometry = new THREE.BoxGeometry(width, height, depth);
    const box = new THREE.Mesh(boxGeometry, materials);
    box.castShadow = true;
    box.receiveShadow = true;
    cargoGroup.add(box);

    if (!sku.texture_top) {
        const tapeGeometry = new THREE.BoxGeometry(width * 0.15, 0.005, depth);
        const tapeMaterial = new THREE.MeshStandardMaterial({ color: 0xC4A35A, roughness: 0.5 });
        const tape = new THREE.Mesh(tapeGeometry, tapeMaterial);
        tape.position.y = height / 2 + 0.002;
        cargoGroup.add(tape);
    }

    cargoGroup.position.set(x, y + height / 2, z);

    cargoGroup.userData = {
        isCargo: true,
        dbId: dbId,
        sku: sku,
        skuId: sku.id,
        name: sku.name || '货物',
        width: width,
        height: height,
        depth: depth,
        weight: sku.weight || 1.0,
        velocity: { x: 0, y: 0, z: 0 },
        grounded: true,
        selected: false
    };

    scene.add(cargoGroup);
    window.cargos.push(cargoGroup);

    return cargoGroup;
}

/**
 * 获取货物所在位置的支撑高度（地面或货架层板或其他货物）
 */
function getSupportHeight(cargo) {
    const scene = window.CoreModule.getScene();
    const cargoPos = cargo.position.clone();
    const cargoData = cargo.userData;
    const halfWidth = cargoData.width / 2;
    const halfDepth = cargoData.depth / 2;

    let maxSupportY = 0;

    if (window.ShelfModule) {
        const shelves = window.ShelfModule.getShelves();
        for (const shelf of shelves) {
            const shelfPos = shelf.position;
            const shelfData = shelf.userData;
            const shelfWidth = shelfData.width || 2;
            const shelfDepth = shelfData.depth || 1;
            const shelfHeight = shelfData.height || 3;

            const shelfMinX = shelfPos.x - shelfDepth / 2;
            const shelfMaxX = shelfPos.x + shelfDepth / 2;
            const shelfMinZ = shelfPos.z - shelfWidth / 2;
            const shelfMaxZ = shelfPos.z + shelfWidth / 2;

            if (cargoPos.x >= shelfMinX && cargoPos.x <= shelfMaxX &&
                cargoPos.z >= shelfMinZ && cargoPos.z <= shelfMaxZ) {

                const config = window.ControlModule ? window.ControlModule.getConfig() : {};
                const globalParams = config.global_params || {};
                const layerCount = globalParams.layer_count || 5;
                const layerHeight = shelfHeight / layerCount;

                for (let i = 0; i < layerCount; i++) {
                    const layerY = (i + 1) * layerHeight - 0.06;
                    if (layerY < cargoPos.y - cargoData.height / 2 + 0.01) {
                        maxSupportY = Math.max(maxSupportY, layerY);
                    }
                }
            }
        }
    }

    for (const otherCargo of window.cargos) {
        if (otherCargo === cargo) continue;
        
        if (otherCargo.userData.isBeingDeleted) continue;

        const otherPos = otherCargo.position;
        const otherData = otherCargo.userData;
        const otherHalfWidth = otherData.width / 2;
        const otherHalfDepth = otherData.depth / 2;

        const overlapX = Math.abs(cargoPos.x - otherPos.x) < (halfWidth + otherHalfWidth) * 0.8;
        const overlapZ = Math.abs(cargoPos.z - otherPos.z) < (halfDepth + otherHalfDepth) * 0.8;

        if (overlapX && overlapZ) {
            const otherTopY = otherPos.y + otherData.height / 2;
            if (otherTopY < cargoPos.y - cargoData.height / 2 + 0.01) {
                maxSupportY = Math.max(maxSupportY, otherTopY);
            }
        }
    }

    return maxSupportY;
}

/**
 * 更新单个货物的重力
 */
function updateCargoGravity(cargo) {
    if (!cargo || !cargo.userData.isCargo) return;

    const cargoData = cargo.userData;
    
    if (cargoData.isDragging) {
        return;
    }

    const supportY = getSupportHeight(cargo);
    const targetY = supportY + cargoData.height / 2;

    if (Math.abs(cargo.position.y - targetY) < 0.01) {
        cargo.position.y = targetY;
        cargoData.grounded = true;
        cargoData.velocity.y = 0;
        return;
    }

    cargoData.grounded = false;

    const animate = () => {
        if (cargoData.grounded || cargoData.isDragging) return;

        const supportY = getSupportHeight(cargo);
        const targetY = supportY + cargoData.height / 2;

        const gravity = 0.02;
        cargo.position.y -= gravity;

        if (cargo.position.y <= targetY) {
            cargo.position.y = targetY;
            cargoData.grounded = true;
            cargoData.velocity.y = 0;
            
            if (cargoData.dbId) {
                const baseY = cargo.position.y - cargoData.height / 2;
                updateCargoPosition(cargoData.dbId, cargo.position.x, baseY, cargo.position.z);
            }
        } else {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
}

/**
 * 更新所有货物的重力
 */
function updateAllCargosGravity() {
    for (const cargo of window.cargos) {
        updateCargoGravity(cargo);
    }
}

/**
 * 检测指定货架上的所有货物
 * @param {THREE.Group} shelf - 货架
 * @returns {Array<THREE.Group>} - 在货架上的货物数组
 */
function getCargosOnShelf(shelf) {
    if (!shelf || !shelf.userData.isShelf) return [];
    
    const cargosOnShelf = [];
    const shelfPos = shelf.position;
    const shelfData = shelf.userData;
    const shelfWidth = shelfData.width || 2;
    const shelfDepth = shelfData.depth || 1;
    
    const shelfMinX = shelfPos.x - shelfDepth / 2;
    const shelfMaxX = shelfPos.x + shelfDepth / 2;
    const shelfMinZ = shelfPos.z - shelfWidth / 2;
    const shelfMaxZ = shelfPos.z + shelfWidth / 2;
    
    for (const cargo of window.cargos) {
        if (!cargo.userData.isCargo) continue;
        
        const cargoPos = cargo.position;
        
        if (cargoPos.x >= shelfMinX && cargoPos.x <= shelfMaxX &&
            cargoPos.z >= shelfMinZ && cargoPos.z <= shelfMaxZ) {
            cargosOnShelf.push(cargo);
        }
    }
    
    return cargosOnShelf;
}

/**
 * 检测堆叠在指定货物上方的所有货物
 * @param {THREE.Group} cargo - 下方的货物
 * @param {THREE.Vector3} overridePosition - 可选：覆盖货物的位置（用于检测原位置的堆叠货物）
 * @returns {Array<THREE.Group>} - 堆叠在上方的货物数组
 */
function getCargosStackedOnTop(cargo, overridePosition = null) {
    if (!cargo || !cargo.userData.isCargo) return [];
    
    const stackedCargos = [];
    const cargoPos = overridePosition || cargo.position;
    const cargoData = cargo.userData;
    const cargoTopY = cargoPos.y + cargoData.height / 2;
    const halfWidth = cargoData.width / 2;
    const halfDepth = cargoData.depth / 2;
    
    for (const otherCargo of window.cargos) {
        if (otherCargo === cargo) continue;
        if (!otherCargo.userData.isCargo) continue;
        
        const otherPos = otherCargo.position;
        const otherData = otherCargo.userData;
        const otherBottomY = otherPos.y - otherData.height / 2;
        const otherHalfWidth = otherData.width / 2;
        const otherHalfDepth = otherData.depth / 2;
        
        const overlapX = Math.abs(cargoPos.x - otherPos.x) < (halfWidth + otherHalfWidth) * 0.8;
        const overlapZ = Math.abs(cargoPos.z - otherPos.z) < (halfDepth + otherHalfDepth) * 0.8;
        
        if (overlapX && overlapZ) {
            const yDistance = Math.abs(otherBottomY - cargoTopY);
            if (yDistance < 0.1) {
                stackedCargos.push(otherCargo);
            }
        }
    }
    
    return stackedCargos;
}

/**
 * 触发堆叠在上方的货物重新计算重力并掉落
 * @param {THREE.Group} cargo - 被移除或移动的货物
 * @param {Set} processedCargos - 已处理的货物集合（用于避免重复处理）
 * @param {THREE.Vector3} overridePosition - 可选：覆盖货物的位置（用于检测原位置的堆叠货物）
 */
function triggerStackedCargosFall(cargo, processedCargos = null, overridePosition = null) {
    if (!cargo || !cargo.userData.isCargo) return;
    
    if (!processedCargos) {
        processedCargos = new Set();
    }
    
    if (processedCargos.has(cargo)) {
        return;
    }
    
    const stackedCargos = getCargosStackedOnTop(cargo, overridePosition);
    
    for (const stackedCargo of stackedCargos) {
        if (processedCargos.has(stackedCargo)) {
            continue;
        }
        
        processedCargos.add(stackedCargo);
        
        stackedCargo.userData.grounded = false;
        
        if (updateCargoGravity) {
            updateCargoGravity(stackedCargo);
        }
        
        console.log('触发货物掉落:', stackedCargo.userData.name, '因为下方货物被移除/移动');
        
        triggerStackedCargosFall(stackedCargo, processedCargos);
    }
}

/**
 * 打开添加货物模态框
 */
async function openAddCargoModal() {
    const modal = document.getElementById('addCargoModal');
    if (modal) {
        modal.classList.add('visible');
        await loadSkuListForCargo();
    }
}

/**
 * 关闭添加货物模态框（仅关闭UI，不清理状态）
 */
function closeAddCargoModal() {
    const modal = document.getElementById('addCargoModal');
    if (modal) {
        modal.classList.remove('visible');
    }
}

/**
 * 取消添加货物（关闭模态框并清理状态）
 */
function cancelCargoModal() {
    closeAddCargoModal();
    selectedSkuForPlacement = null;

    const hint = document.getElementById('cargoPlacementHint');
    if (hint) {
        hint.style.display = 'none';
    }
}

/**
 * 加载SKU列表用于货物添加
 */
async function loadSkuListForCargo() {
    try {
        const response = await fetch('/api/skus');
        if (response.ok) {
            const skuList = await response.json();
            renderSkuListForCargo(skuList);
        }
    } catch (error) {
        console.error('加载SKU列表失败:', error);
    }
}

/**
 * 渲染货物选择的SKU列表
 */
function renderSkuListForCargo(skuList) {
    const listContainer = document.getElementById('cargoSkuListContainer');
    if (!listContainer) return;

    if (skuList.length === 0) {
        listContainer.innerHTML = '<div class="cargo-sku-empty">暂无SKU，请先在SKU配置中添加货物种类</div>';
        return;
    }

    listContainer.innerHTML = skuList.map(sku => `
        <div class="cargo-sku-item" onclick="selectSkuForCargo('${sku.id}')" data-sku-id="${sku.id}">
            <div class="cargo-sku-thumbnail">
                ${sku.thumbnail
            ? `<img src="/static/uploads/sku_thumbnails/${sku.thumbnail}" alt="${sku.name}">`
            : '<div class="cargo-sku-no-image">📦</div>'
        }
            </div>
            <div class="cargo-sku-info">
                <div class="cargo-sku-name">${sku.name || '未命名'}</div>
                <div class="cargo-sku-code">${sku.sku_code}</div>
                <div class="cargo-sku-dimensions">
                    ${sku.length}m × ${sku.width}m × ${sku.height}m
                </div>
            </div>
        </div>
    `).join('');

    listContainer.skuData = skuList;
}

/**
 * 选择SKU用于放置货物
 */
function selectSkuForCargo(skuId) {
    const listContainer = document.getElementById('cargoSkuListContainer');
    const skuList = listContainer.skuData || [];
    const sku = skuList.find(s => s.id === skuId);

    if (!sku) return;

    document.querySelectorAll('.cargo-sku-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.skuId === skuId) {
            item.classList.add('selected');
        }
    });

    selectedSkuForPlacement = sku;

    const hint = document.getElementById('cargoPlacementHint');
    if (hint) {
        hint.textContent = `已选择：${sku.name}，点击"开始放置"按钮`;
        hint.style.display = 'block';
    }
}

/**
 * 进入货物放置模式
 */
function enterCargoPlacementMode() {
    if (!selectedSkuForPlacement) {
        alert('请先选择一个SKU');
        return;
    }

    cargoPlacementMode = true;
    closeAddCargoModal();
    document.body.style.cursor = 'crosshair';

    const hint = document.getElementById('placementHint');
    if (hint) {
        hint.innerHTML = `📦 <b>放置货物</b>：点击货架层板放置 "${selectedSkuForPlacement.name}"，按ESC取消`;
        hint.style.display = 'block';
    }

    createPreviewCargo();
}

/**
 * 创建预览货物
 */
function createPreviewCargo() {
    if (!selectedSkuForPlacement) return;

    if (previewCargo) {
        const scene = window.CoreModule.getScene();
        scene.remove(previewCargo);
        previewCargo = null;
    }

    const scene = window.CoreModule.getScene();
    const sku = selectedSkuForPlacement;

    const previewMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.6,
        emissive: 0x003300
    });

    const width = sku.width || 0.3;
    const height = sku.height || 0.2;
    const depth = sku.length || 0.5;

    const previewGeometry = new THREE.BoxGeometry(width, height, depth);
    previewCargo = new THREE.Mesh(previewGeometry, previewMaterial);

    previewCargo.position.set(0, height / 2 + 0.5, 0);
    previewCargo.visible = true;
    previewCargo.userData = { isPreview: true };
    previewCargo.renderOrder = 999;

    scene.add(previewCargo);
    console.log('预览货物已创建:', width, height, depth);
}

/**
 * 计算鼠标位置对应的货物放置位置（通用函数）
 * @param {THREE.Vector2} mouse - 鼠标标准化坐标 (-1到1)
 * @param {Object} options - 选项
 * @param {number} options.cargoHeight - 货物高度（用于计算最终Y位置）
 * @returns {Object|null} 返回 {x, y, z} 位置对象，y是基础高度（需要加上货物高度的一半）
 */
function calculateCargoPlacementPosition(mouse, options = {}) {
    const raycaster = window.CoreModule.getRaycaster();
    const camera = window.CoreModule.getCamera();
    raycaster.setFromCamera(mouse, camera);

    const excludeCargo = options.excludeCargo || null;
    if (window.cargos && window.cargos.length > 0) {
        const cargoIntersects = raycaster.intersectObjects(window.cargos, true);
        if (cargoIntersects.length > 0) {
            const hit = cargoIntersects[0];
            const hitCargo = findCargoFromObject(hit.object);
            
            if (hitCargo && hitCargo !== excludeCargo) {
                const cargoData = hitCargo.userData;
                const cargoTopY = hitCargo.position.y + cargoData.height / 2;
                
                return {
                    x: hitCargo.position.x,
                    y: cargoTopY,
                    z: hitCargo.position.z,
                    stackOn: hitCargo
                };
            }
        }
    }

    const shelves = window.ShelfModule.getShelves();
    const shelfIntersects = raycaster.intersectObjects(shelves, true);

    if (shelfIntersects.length > 0) {
        const hit = shelfIntersects[0];
        const hitPoint = hit.point;
        const shelf = window.EventsModule.findShelfFromObject(hit.object);

        if (shelf) {
            const shelfData = shelf.userData;
            const config = window.ControlModule ? window.ControlModule.getConfig() : {};
            const globalParams = config.global_params || {};
            const layerCount = globalParams.layer_count || 5;
            const layerHeight = shelfData.height / layerCount;

            let targetLayerY = 0;
            for (let i = 0; i < layerCount; i++) {
                const layerY = (i + 1) * layerHeight - 0.06;
                if (hitPoint.y >= layerY - 0.1) {
                    targetLayerY = layerY;
                }
            }

            return {
                x: hitPoint.x,
                y: targetLayerY,
                z: hitPoint.z
            };
        }
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeIntersect = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
        return {
            x: planeIntersect.x,
            y: 0,
            z: planeIntersect.z
        };
    }

    return null;
}

/**
 * 更新预览货物位置
 */
function updatePreviewCargoPosition(x, y, z) {
    if (!previewCargo || !selectedSkuForPlacement) {
        console.log('无法更新预览位置 - previewCargo:', !!previewCargo, 'sku:', !!selectedSkuForPlacement);
        return;
    }

    const height = selectedSkuForPlacement.height || 0.2;
    previewCargo.position.set(x, y + height / 2, z);
    previewCargo.visible = true;
}

/**
 * 退出货物放置模式
 */
function exitCargoPlacementMode() {
    cargoPlacementMode = false;
    selectedSkuForPlacement = null;
    document.body.style.cursor = 'default';

    if (previewCargo) {
        const scene = window.CoreModule.getScene();
        scene.remove(previewCargo);
        previewCargo = null;
    }

    const hint = document.getElementById('placementHint');
    if (hint) {
        hint.style.display = 'none';
    }
}

/**
 * 在指定位置放置货物
 */
function placeCargoAt(x, y, z) {
    if (!cargoPlacementMode || !selectedSkuForPlacement) return;

    createCargo(selectedSkuForPlacement, x, y, z);

}

/**
 * 删除货物
 */
async function deleteCargo(cargo) {
    if (!cargo) return;

    cargo.userData.isBeingDeleted = true;
    
    const stackedCargos = getCargosStackedOnTop(cargo);
    console.log('删除货物:', cargo.userData.name, '检测到上方堆叠货物数量:', stackedCargos.length);
    
    triggerStackedCargosFall(cargo);

    const scene = window.CoreModule.getScene();
    scene.remove(cargo);

    const index = window.cargos.indexOf(cargo);
    if (index > -1) {
        window.cargos.splice(index, 1);
    }

    if (cargo.userData.dbId) {
        try {
            await fetch(`/api/cargos/${cargo.userData.dbId}`, {
                method: 'DELETE'
            });
            console.log('货物已从数据库删除:', cargo.userData.dbId);
        } catch (error) {
            console.error('删除货物失败:', error);
        }
    }
}

/**
 * 清除所有货物
 */
async function clearAllCargos() {
    const scene = window.CoreModule.getScene();
    for (const cargo of window.cargos) {
        scene.remove(cargo);
    }
    window.cargos = [];

    try {
        await fetch('/api/cargos/clear', {
            method: 'POST'
        });
        console.log('所有货物已从数据库清除');
    } catch (error) {
        console.error('清除货物失败:', error);
    }
}

/**
 * 获取放置模式状态
 */
function isCargoPlacementMode() {
    return cargoPlacementMode;
}

/**
 * 获取预览货物
 */
function getPreviewCargo() {
    return previewCargo;
}

/**
 * 获取选中的SKU
 */
function getSelectedSkuForPlacement() {
    return selectedSkuForPlacement;
}

/**
 * 更新货物外观（选中/悬停效果）
 */
function updateCargoAppearance(cargo) {
    if (!cargo || !cargo.userData.isCargo) return;

    cargo.traverse(child => {
        if (child.type === 'Mesh' && child.material) {
            const material = child.material;
            if (Array.isArray(material)) {
                material.forEach(mat => {
                    if (cargo.userData.selected) {
                        mat.emissive = new THREE.Color(0x00ff00);
                        mat.emissiveIntensity = 0.3;
                    } else {
                        mat.emissive = new THREE.Color(0x000000);
                        mat.emissiveIntensity = 0;
                    }
                });
            } else {
                if (cargo.userData.selected) {
                    material.emissive = new THREE.Color(0x00ff00);
                    material.emissiveIntensity = 0.3;
                } else {
                    material.emissive = new THREE.Color(0x000000);
                    material.emissiveIntensity = 0;
                }
            }
        }
    });
}

/**
 * 更新货物位置到数据库
 */
async function updateCargoPosition(cargoId, x, y, z, rotation = 0) {
    try {
        const response = await fetch(`/api/cargos/${cargoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                x: x,
                y: y,
                z: z,
                rotation: rotation
            })
        });

        if (response.ok) {
            console.log('货物位置已更新到数据库:', cargoId);
        }
    } catch (error) {
        console.error('更新货物位置失败:', error);
    }
}

/**
 * 查找点击对象对应的货物
 */
function findCargoFromObject(object) {
    let current = object;
    while (current) {
        if (current.userData && current.userData.isCargo) {
            return current;
        }
        current = current.parent;
    }
    return null;
}

window.CargoModule = {
    createCargo,
    deleteCargo,
    clearAllCargos,
    loadCargosFromDb,
    updateCargoGravity,
    updateAllCargosGravity,
    updateCargoAppearance,
    updateCargoPosition,
    getSupportHeight,
    openAddCargoModal,
    closeAddCargoModal,
    cancelCargoModal,
    selectSkuForCargo,
    enterCargoPlacementMode,
    exitCargoPlacementMode,
    placeCargoAt,
    updatePreviewCargoPosition,
    calculateCargoPlacementPosition,
    isCargoPlacementMode,
    getPreviewCargo,
    getSelectedSkuForPlacement,
    findCargoFromObject,
    getCargosStackedOnTop,
    triggerStackedCargosFall,
    getCargosOnShelf
};

window.openAddCargoModal = openAddCargoModal;
window.closeAddCargoModal = closeAddCargoModal;
window.cancelCargoModal = cancelCargoModal;
window.selectSkuForCargo = selectSkuForCargo;
window.enterCargoPlacementMode = enterCargoPlacementMode;
window.exitCargoPlacementMode = exitCargoPlacementMode;

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && cargoPlacementMode) {
        exitCargoPlacementMode();
    }
});
