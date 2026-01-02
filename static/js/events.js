let selectedShelf = null;
let selectedPartForDrag = null;
let selectedCargoForDrag = null;
let selectedCargo = null;
let cargoRepositionMode = false;
let cargoToReposition = null;
let isDragging = false;
let hasMoved = false;
let dragOffset = new THREE.Vector3();
let justFinishedDragging = false;
let justClickedShelf = false;
let justClickedCargo = false;
let currentMode = 'move';
let selectedShelves = new Set();
let dragType = null;

/**
 * 初始化事件处理
 */
function initEventListeners() {
    const canvas = window.CoreModule.getRenderer().domElement;
    const controls = window.CoreModule.getControls();

    currentMode = 'move';
    const modeBtn = document.getElementById('modeToggleBtn');
    if (modeBtn) {
        modeBtn.textContent = '移动模式';
        modeBtn.classList.add('active');
    }

    controls.enabled = false;
    console.log('初始模式：移动模式 - OrbitControls已禁用');

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    console.log('事件监听器已初始化');
}

/**
 * 鼠标按下处理
 */
function handleMouseDown(event) {
    if (currentMode !== 'move') {
        return;
    }

    event.preventDefault();

    if (cargoRepositionMode) {
        return;
    }

    if (justFinishedDragging) {
        justFinishedDragging = false;
        return;
    }

    const rect = event.target.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = window.CoreModule.getRaycaster();
    const camera = window.CoreModule.getCamera();
    const scene = window.CoreModule.getScene();

    raycaster.setFromCamera(mouse, camera);

    const allIntersects = [];

    if (window.cargos && window.cargos.length > 0) {
        const cargoIntersects = raycaster.intersectObjects(window.cargos, true);
        cargoIntersects.forEach(intersect => {
            const cargo = window.CargoModule.findCargoFromObject(intersect.object);
            if (cargo) {
                allIntersects.push({
                    type: 'cargo',
                    object: cargo,
                    intersect: intersect,
                    distance: intersect.distance
                });
            }
        });
    }

    const shelves = window.ShelfModule.getShelves();
    const shelfIntersects = raycaster.intersectObjects(shelves, true);
    shelfIntersects.forEach(intersect => {
        const shelf = findShelfFromObject(intersect.object);
        if (shelf) {
            allIntersects.push({
                type: 'shelf',
                object: shelf,
                intersect: intersect,
                distance: intersect.distance
            });
        }
    });

    if (window.parts && window.parts.length > 0) {
        const partIntersects = raycaster.intersectObjects(window.parts, true);
        partIntersects.forEach(intersect => {
            const part = window.PartsModule.findPartFromObject(intersect.object);
            if (part) {
                allIntersects.push({
                    type: 'part',
                    object: part,
                    intersect: intersect,
                    distance: intersect.distance
                });
            }
        });
    }

    if (allIntersects.length > 0) {
        allIntersects.sort((a, b) => a.distance - b.distance);
        const closest = allIntersects[0];

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const planeIntersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, planeIntersect);

        if (closest.type === 'cargo') {
            const cargo = closest.object;
            selectedCargoForDrag = cargo;
            isDragging = true;
            hasMoved = false;
            dragType = 'cargo';

            dragOffset.copy(cargo.position).sub(planeIntersect);

            cargo.userData.initialDragX = cargo.position.x;
            cargo.userData.initialDragY = cargo.position.y;
            cargo.userData.initialDragZ = cargo.position.z;
            const rect = event.target.getBoundingClientRect();
            cargo.userData.initialMouseY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

            if (selectedCargo && selectedCargo !== cargo) {
                selectedCargo.userData.selected = false;
                if (window.CargoModule && window.CargoModule.updateCargoAppearance) {
                    window.CargoModule.updateCargoAppearance(selectedCargo);
                }
            }

            cargo.userData.selected = true;
            cargo.userData.isDragging = true;
            selectedCargo = cargo;
            if (window.CargoModule && window.CargoModule.updateCargoAppearance) {
                window.CargoModule.updateCargoAppearance(cargo);
            }

            console.log('开始拖动货物:', cargo.userData.name);
            event.target.style.cursor = 'move';
            return;
        } else if (closest.type === 'shelf') {
            const shelf = closest.object;

            if (window.ShelfModule) {
                const allShelves = window.ShelfModule.getShelves();
                allShelves.forEach(s => {
                    if (s !== shelf && s.userData.selected) {
                        s.userData.selected = false;
                        if (window.ShelfModule && window.ShelfModule.updateShelfAppearance) {
                            window.ShelfModule.updateShelfAppearance(s);
                        }
                    }
                });
            }

            selectedShelves.forEach(s => {
                if (s !== shelf) {
                    s.userData.selected = false;
                    if (window.ShelfModule && window.ShelfModule.updateShelfAppearance) {
                        window.ShelfModule.updateShelfAppearance(s);
                    }
                }
            });
            selectedShelves.clear();
            selectedShelves.add(shelf);

            selectedShelf = shelf;
            isDragging = true;
            hasMoved = false;
            dragType = 'shelf';

            dragOffset.copy(shelf.position).sub(planeIntersect);

            shelf.userData.initialShelfX = shelf.position.x;
            shelf.userData.initialShelfZ = shelf.position.z;

            if (window.CargoModule && window.CargoModule.getCargosOnShelf) {
                const cargosOnShelf = window.CargoModule.getCargosOnShelf(shelf);
                shelf.userData.cargosOnShelf = cargosOnShelf;
                cargosOnShelf.forEach(cargo => {
                    cargo.userData.initialCargoX = cargo.position.x;
                    cargo.userData.initialCargoZ = cargo.position.z;
                });
                console.log('货架上的货物数量:', cargosOnShelf.length);
            }

            shelf.userData.selected = true;
            if (window.ShelfModule && window.ShelfModule.updateShelfAppearance) {
                window.ShelfModule.updateShelfAppearance(shelf);
            }

            updateSelectionUI(shelf);

            console.log('开始拖动货架:', shelf.userData.name);
            event.target.style.cursor = 'move';
            return;
        } else if (closest.type === 'part') {
            const part = closest.object;
            selectedPartForDrag = part;
            isDragging = true;
            hasMoved = false;
            dragType = 'part';

            dragOffset.copy(part.position).sub(planeIntersect);

            console.log('开始拖动零件:', part.userData.name);
            event.target.style.cursor = 'move';
            return;
        }
    }

    if (window.parts && window.parts.length > 0) {
        const partIntersects = raycaster.intersectObjects(window.parts, true);
        if (partIntersects.length > 0) {
            const part = window.PartsModule.findPartFromObject(partIntersects[0].object);
            if (part) {
                selectedPartForDrag = part;
                isDragging = true;
                hasMoved = false;
                dragType = 'part';

                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
                const planeIntersect = new THREE.Vector3();
                raycaster.ray.intersectPlane(plane, planeIntersect);
                dragOffset.copy(part.position).sub(planeIntersect);

                console.log('开始拖动零件:', part.userData.name);
                event.target.style.cursor = 'move';
            }
        }
    }
}

/**
 * 鼠标移动处理
 */
function handleMouseMove(event) {
    if (window.PartsModule && window.PartsModule.isLineDrawMode && window.PartsModule.isLineDrawMode()
        && window.PartsModule.getLineStartPoint && window.PartsModule.getLineStartPoint()) {
        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = window.CoreModule.getRaycaster();
        const camera = window.CoreModule.getCamera();
        raycaster.setFromCamera(mouse, camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const planeIntersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
            window.PartsModule.updatePreviewLine(planeIntersect.x, planeIntersect.z);
        }
        return;
    }

    if (window.AisleModule && window.AisleModule.isAisleMode && window.AisleModule.isAisleMode()) {
        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = window.CoreModule.getRaycaster();
        const camera = window.CoreModule.getCamera();
        raycaster.setFromCamera(mouse, camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const planeIntersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
            window.AisleModule.handleAisleMouseMove(planeIntersect.x, planeIntersect.z);
        }
        return;
    }


    if (cargoRepositionMode && cargoToReposition) {
        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const position = window.CargoModule.calculateCargoPlacementPosition(mouse, {
            excludeCargo: cargoToReposition
        });
        if (position) {
            const cargoData = cargoToReposition.userData;
            if (position.stackOn) {
                cargoToReposition.position.set(
                    position.x,
                    position.y + cargoData.height / 2,
                    position.z
                );
            } else {
                cargoToReposition.position.set(
                    position.x,
                    position.y + cargoData.height / 2,
                    position.z
                );
                const supportY = window.CargoModule.getSupportHeight(cargoToReposition);
                cargoToReposition.position.set(
                    position.x,
                    supportY + cargoData.height / 2,
                    position.z
                );
            }
        }
        return;
    }

    if (window.CargoModule && window.CargoModule.isCargoPlacementMode()) {
        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const position = window.CargoModule.calculateCargoPlacementPosition(mouse);
        if (position) {
            window.CargoModule.updatePreviewCargoPosition(position.x, position.y, position.z);
        }
        return;
    }

    if (currentMode !== 'move') {
        return;
    }

    event.preventDefault();

    if (!isDragging) return;

    const rect = event.target.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = window.CoreModule.getRaycaster();
    const camera = window.CoreModule.getCamera();

    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeIntersect = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
        let newPosition = planeIntersect.add(dragOffset);

        let halfLength = 25;
        let halfWidth = 25;
        if (window.EnvironmentModule && window.EnvironmentModule.getSpaceDimensions) {
            const dims = window.EnvironmentModule.getSpaceDimensions();
            halfLength = dims.length / 2;
            halfWidth = dims.width / 2;
        }
        newPosition.x = Math.max(-halfLength, Math.min(halfLength, newPosition.x));
        newPosition.z = Math.max(-halfWidth, Math.min(halfWidth, newPosition.z));

        if (dragType === 'shelf' && selectedShelf) {
            if (window.MeasureModule && window.MeasureModule.isSnapEnabled()) {
                newPosition = window.MeasureModule.applySnap(selectedShelf, newPosition);
            }

            const shelfOffsetX = newPosition.x - (selectedShelf.userData.initialShelfX || selectedShelf.position.x);
            const shelfOffsetZ = newPosition.z - (selectedShelf.userData.initialShelfZ || selectedShelf.position.z);

            selectedShelf.position.copy(newPosition);
            selectedShelf.position.y = selectedShelf.userData.height / 2;

            if (selectedShelf.userData.cargosOnShelf && window.CargoModule) {
                selectedShelf.userData.cargosOnShelf.forEach(cargo => {
                    if (cargo.userData.initialCargoX !== undefined && cargo.userData.initialCargoZ !== undefined) {
                        cargo.position.x = cargo.userData.initialCargoX + shelfOffsetX;
                        cargo.position.z = cargo.userData.initialCargoZ + shelfOffsetZ;
                    }
                });
            }

            hasMoved = true;

            if (document.getElementById('shelfX')) {
                const userX = newPosition.x + selectedShelf.userData.depth / 2;
                const userY = newPosition.z - selectedShelf.userData.width / 2;
                document.getElementById('shelfX').value = userX.toFixed(2);
                document.getElementById('shelfZ').value = userY.toFixed(2);
            }
        } else if (dragType === 'cargo' && selectedCargoForDrag) {
            const cargo = selectedCargoForDrag;
            const cargoData = cargo.userData;
            const isShiftPressed = event.shiftKey;

            if (isShiftPressed) {
                const mouseY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
                const camera = window.CoreModule.getCamera();

                const cameraPos = camera.position;
                const cargoPos = cargo.position;
                const distance = cameraPos.distanceTo(cargoPos);

                const initialMouseY = cargo.userData.initialMouseY || 0;
                const mouseYDelta = mouseY - initialMouseY;
                const heightAdjustment = -mouseYDelta * distance * 0.5;
                const newY = cargo.userData.initialDragY + heightAdjustment;

                const minY = cargoData.height / 2;
                const finalY = Math.max(minY, newY);

                cargo.position.set(
                    cargo.userData.initialDragX,
                    finalY,
                    cargo.userData.initialDragZ
                );
            } else {
                cargo.userData.initialMouseY = undefined;

                const currentY = cargo.position.y;

                if (window.MeasureModule && window.MeasureModule.isSnapEnabled()) {
                    newPosition = window.MeasureModule.applySnap(cargo, newPosition);
                }

                cargo.position.set(newPosition.x, currentY, newPosition.z);
            }

            hasMoved = true;
        } else if (dragType === 'part' && selectedPartForDrag) {
            if (window.PartsModule && window.PartsModule.applyPartSnap) {
                newPosition = window.PartsModule.applyPartSnap(selectedPartForDrag, newPosition);
            }
            selectedPartForDrag.position.x = newPosition.x;
            selectedPartForDrag.position.z = newPosition.z;
            hasMoved = true;

            if (document.getElementById('partX')) {
                document.getElementById('partX').value = newPosition.x.toFixed(2);
                document.getElementById('partZ').value = newPosition.z.toFixed(2);
            }
        }
    }
}

/**
 * 鼠标释放处理
 */
function handleMouseUp(event) {
    event.preventDefault();

    if (isDragging) {
        if (dragType === 'shelf' && selectedShelf) {
            isDragging = false;
            dragType = null;

            if (hasMoved) {
                console.log('货架拖动结束:', selectedShelf.position);

                if (selectedShelf.userData.cargosOnShelf && window.CargoModule) {
                    selectedShelf.userData.cargosOnShelf.forEach(cargo => {
                        if (cargo.userData.dbId && window.CargoModule.updateCargoPosition) {
                            const cargoData = cargo.userData;
                            const baseY = cargo.position.y - cargoData.height / 2;
                            window.CargoModule.updateCargoPosition(
                                cargo.userData.dbId,
                                cargo.position.x,
                                baseY,
                                cargo.position.z
                            );
                        }
                    });
                }

                if (selectedShelf.userData.cargosOnShelf) {
                    selectedShelf.userData.cargosOnShelf.forEach(cargo => {
                        delete cargo.userData.initialCargoX;
                        delete cargo.userData.initialCargoZ;
                    });
                    delete selectedShelf.userData.cargosOnShelf;
                }
                delete selectedShelf.userData.initialShelfX;
                delete selectedShelf.userData.initialShelfZ;

                if (window.ControlModule && window.ControlModule.saveConfig) {
                    window.ControlModule.saveConfig();
                }
                justFinishedDragging = true;
                setTimeout(() => { justFinishedDragging = false; }, 100);
            } else {
                if (window.ShelfModule) {
                    const allShelves = window.ShelfModule.getShelves();
                    allShelves.forEach(s => {
                        if (s !== selectedShelf && s.userData.selected) {
                            s.userData.selected = false;
                            if (window.ShelfModule && window.ShelfModule.updateShelfAppearance) {
                                window.ShelfModule.updateShelfAppearance(s);
                            }
                        }
                    });
                }

                selectedShelves.forEach(s => {
                    if (s !== selectedShelf) {
                        s.userData.selected = false;
                        if (window.ShelfModule && window.ShelfModule.updateShelfAppearance) {
                            window.ShelfModule.updateShelfAppearance(s);
                        }
                    }
                });
                selectedShelves.clear();
                selectedShelves.add(selectedShelf);
                selectedShelf.userData.selected = true;
                if (window.ShelfModule && window.ShelfModule.updateShelfAppearance) {
                    window.ShelfModule.updateShelfAppearance(selectedShelf);
                }
                updateSelectionUI(selectedShelf);

                justClickedShelf = true;
                setTimeout(() => { justClickedShelf = false; }, 100);
            }

            event.target.style.cursor = 'default';
            selectedShelf = null;
        } else if (dragType === 'cargo' && selectedCargoForDrag) {
            isDragging = false;
            dragType = null;

            const cargo = selectedCargoForDrag;
            cargo.userData.isDragging = false;

            if (hasMoved) {
                console.log('货物拖动结束:', cargo.position);

                if (window.CargoModule && window.CargoModule.triggerStackedCargosFall) {
                    const originalPosition = new THREE.Vector3(
                        cargo.userData.initialDragX || cargo.position.x,
                        cargo.userData.initialDragY || cargo.position.y,
                        cargo.userData.initialDragZ || cargo.position.z
                    );
                    window.CargoModule.triggerStackedCargosFall(cargo, null, originalPosition);
                }

                if (cargo.userData.dbId && window.CargoModule && window.CargoModule.updateCargoPosition) {
                    const cargoData = cargo.userData;
                    const baseY = cargo.position.y - cargoData.height / 2;
                    window.CargoModule.updateCargoPosition(
                        cargo.userData.dbId,
                        cargo.position.x,
                        baseY,
                        cargo.position.z
                    );
                }

                const supportY = window.CargoModule.getSupportHeight(cargo);
                const targetY = supportY + cargo.userData.height / 2;
                if (cargo.position.y > targetY + 0.01) {
                    console.log('货物在空中，应用重力');
                    cargo.userData.grounded = false;
                    if (window.CargoModule && window.CargoModule.updateCargoGravity) {
                        window.CargoModule.updateCargoGravity(cargo);
                    }
                } else {
                    cargo.position.y = targetY;
                    cargo.userData.grounded = true;
                }

                justFinishedDragging = true;
                setTimeout(() => { justFinishedDragging = false; }, 100);
            } else {
                if (selectedCargo && selectedCargo !== cargo) {
                    selectedCargo.userData.selected = false;
                    if (window.CargoModule && window.CargoModule.updateCargoAppearance) {
                        window.CargoModule.updateCargoAppearance(selectedCargo);
                    }
                }

                cargo.userData.selected = true;
                selectedCargo = cargo;
                if (window.CargoModule && window.CargoModule.updateCargoAppearance) {
                    window.CargoModule.updateCargoAppearance(cargo);
                }

                updateCargoSelectionUI(cargo);

                justClickedCargo = true;
                setTimeout(() => { justClickedCargo = false; }, 100);
            }

            event.target.style.cursor = 'default';

            if (selectedCargoForDrag) {
                selectedCargoForDrag.userData.initialMouseY = undefined;
                selectedCargoForDrag.userData.initialDragX = undefined;
                selectedCargoForDrag.userData.initialDragY = undefined;
                selectedCargoForDrag.userData.initialDragZ = undefined;
            }

            selectedCargoForDrag = null;
        } else if (dragType === 'part' && selectedPartForDrag) {
            isDragging = false;
            dragType = null;

            if (hasMoved) {
                console.log('零件拖动结束:', selectedPartForDrag.position);
                justFinishedDragging = true;
                setTimeout(() => { justFinishedDragging = false; }, 100);
            } else {
                window.PartsModule.selectPart(selectedPartForDrag);
            }

            event.target.style.cursor = 'default';
            selectedPartForDrag = null;
        }
    }
}

/**
 * 双击处理（用于重新放置货物）
 */
function handleDoubleClick(event) {
    event.preventDefault();

    if (currentMode !== 'move') {
        return;
    }

    if (isDragging || cargoRepositionMode) {
        return;
    }

    const rect = event.target.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = window.CoreModule.getRaycaster();
    const camera = window.CoreModule.getCamera();
    raycaster.setFromCamera(mouse, camera);

    if (window.cargos && window.cargos.length > 0) {
        const cargoIntersects = raycaster.intersectObjects(window.cargos, true);
        if (cargoIntersects.length > 0) {
            const cargo = window.CargoModule.findCargoFromObject(cargoIntersects[0].object);
            if (cargo) {
                enterCargoRepositionMode(cargo);
                return;
            }
        }
    }
}

/**
 * 进入货物重新放置模式
 */
function enterCargoRepositionMode(cargo) {
    cargoRepositionMode = true;
    cargoToReposition = cargo;

    cargo.userData.originalPosition = cargo.position.clone();
    cargo.userData.originalRotation = cargo.rotation.y || 0;
    cargo.userData.isRepositioning = true;

    cargo.traverse(child => {
        if (child.type === 'Mesh' && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    if (mat) {
                        mat.transparent = true;
                        mat.opacity = 0.6;
                    }
                });
            } else {
                child.material.transparent = true;
                child.material.opacity = 0.6;
            }
        }
    });

    document.body.style.cursor = 'crosshair';

    const hint = document.getElementById('placementHint');
    if (hint) {
        hint.innerHTML = `📦 <b>重新放置货物</b>：移动鼠标到目标位置，点击放置 "${cargo.userData.name}"，按T旋转90°，按ESC取消`;
        hint.style.display = 'block';
    }

    console.log('进入货物重新放置模式:', cargo.userData.name);
}

/**
 * 退出货物重新放置模式
 */
function exitCargoRepositionMode() {
    if (!cargoRepositionMode || !cargoToReposition) {
        return;
    }

    const cargo = cargoToReposition;

    cargo.userData.isRepositioning = false;
    cargo.traverse(child => {
        if (child.type === 'Mesh' && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    if (mat) {
                        mat.opacity = 1.0;
                        mat.transparent = false;
                    }
                });
            } else {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        }
    });

    cargoRepositionMode = false;
    cargoToReposition = null;
    document.body.style.cursor = 'default';

    const hint = document.getElementById('placementHint');
    if (hint) {
        hint.style.display = 'none';
    }

    console.log('退出货物重新放置模式');
}

/**
 * 右键菜单处理（用于库道模式删除点）
 */
function handleContextMenu(event) {
    if (window.AisleModule && window.AisleModule.isAisleMode && window.AisleModule.isAisleMode()) {
        event.preventDefault();

        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = window.CoreModule.getRaycaster();
        const camera = window.CoreModule.getCamera();
        raycaster.setFromCamera(mouse, camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const planeIntersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
            window.AisleModule.handleAisleClick(planeIntersect.x, planeIntersect.z, true);
        }
        return;
    }
}

/**
 * 点击处理（用于选择）
 */
function handleClick(event) {
    event.preventDefault();

    if (justFinishedDragging || isDragging || justClickedShelf || justClickedCargo) return;

    if (cargoRepositionMode && cargoToReposition) {
        const cargo = cargoToReposition;
        const cargoData = cargo.userData;

        const originalPosition = cargo.userData.originalPosition;

        if (window.CargoModule && window.CargoModule.triggerStackedCargosFall && originalPosition) {
            window.CargoModule.triggerStackedCargosFall(cargo, null, originalPosition);
        }

        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const position = window.CargoModule.calculateCargoPlacementPosition(mouse, {
            excludeCargo: cargo
        });

        if (position) {
            if (position.stackOn) {
                cargo.position.set(
                    position.x,
                    position.y + cargoData.height / 2,
                    position.z
                );
                cargo.userData.grounded = true;
            } else {
                cargo.position.set(
                    position.x,
                    position.y + cargoData.height / 2,
                    position.z
                );

                const supportY = window.CargoModule.getSupportHeight(cargo);
                const targetY = supportY + cargoData.height / 2;
                if (cargo.position.y > targetY + 0.01) {
                    cargo.userData.grounded = false;
                    if (window.CargoModule && window.CargoModule.updateCargoGravity) {
                        window.CargoModule.updateCargoGravity(cargo);
                    }
                } else {
                    cargo.position.y = targetY;
                    cargo.userData.grounded = true;
                }
            }
        } else {
            const supportY = window.CargoModule.getSupportHeight(cargo);
            const targetY = supportY + cargoData.height / 2;
            if (cargo.position.y > targetY + 0.01) {
                cargo.userData.grounded = false;
                if (window.CargoModule && window.CargoModule.updateCargoGravity) {
                    window.CargoModule.updateCargoGravity(cargo);
                }
            } else {
                cargo.position.y = targetY;
                cargo.userData.grounded = true;
            }
        }

        if (cargo.userData.dbId && window.CargoModule && window.CargoModule.updateCargoPosition) {
            const baseY = cargo.position.y - cargoData.height / 2;
            const rotation = cargo.rotation.y || 0;
            window.CargoModule.updateCargoPosition(
                cargo.userData.dbId,
                cargo.position.x,
                baseY,
                cargo.position.z,
                rotation
            );
        }

        exitCargoRepositionMode();

        if (selectedCargo === cargo) {
            updateCargoSelectionUI(cargo);
        }

        return;
    }

    if (window.PartsModule && window.PartsModule.isLineDrawMode && window.PartsModule.isLineDrawMode()) {
        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = window.CoreModule.getRaycaster();
        const camera = window.CoreModule.getCamera();
        raycaster.setFromCamera(mouse, camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const planeIntersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
            window.PartsModule.handleLineDrawClick(planeIntersect.x, planeIntersect.z);
        }
        return;
    }

    if (window.AisleModule && window.AisleModule.isAisleMode && window.AisleModule.isAisleMode()) {
        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = window.CoreModule.getRaycaster();
        const camera = window.CoreModule.getCamera();
        raycaster.setFromCamera(mouse, camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const planeIntersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
            const isRightClick = event.button === 2;
            window.AisleModule.handleAisleClick(planeIntersect.x, planeIntersect.z, isRightClick);
        }
        return;
    }


    if (window.PartsModule && window.PartsModule.getPlacementMode()) {
        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = window.CoreModule.getRaycaster();
        const camera = window.CoreModule.getCamera();
        raycaster.setFromCamera(mouse, camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const planeIntersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
            window.PartsModule.placePartAt(planeIntersect.x, planeIntersect.z);
        }
        return;
    }

    if (window.CargoModule && window.CargoModule.isCargoPlacementMode()) {
        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = window.CoreModule.getRaycaster();
        const camera = window.CoreModule.getCamera();
        raycaster.setFromCamera(mouse, camera);

        const shelves = window.ShelfModule.getShelves();
        const shelfIntersects = raycaster.intersectObjects(shelves, true);

        if (shelfIntersects.length > 0) {
            const hit = shelfIntersects[0];
            const hitPoint = hit.point;

            const shelf = findShelfFromObject(hit.object);
            if (shelf) {
                const shelfData = shelf.userData;
                const shelfPos = shelf.position;
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

                window.CargoModule.placeCargoAt(hitPoint.x, targetLayerY, hitPoint.z);
                return;
            }
        }

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const planeIntersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
            window.CargoModule.placeCargoAt(planeIntersect.x, 0, planeIntersect.z);
        }
        return;
    }

    if (currentMode === 'move') {
        const rect = event.target.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = window.CoreModule.getRaycaster();
        const camera = window.CoreModule.getCamera();
        raycaster.setFromCamera(mouse, camera);

        const shelves = window.ShelfModule.getShelves();
        const shelfIntersects = raycaster.intersectObjects(shelves, true);
        if (shelfIntersects.length > 0) {
            return;
        }

        if (window.parts && window.parts.length > 0) {
            const partIntersects = raycaster.intersectObjects(window.parts, true);
            if (partIntersects.length > 0) {
                return;
            }
        }

        if (window.cargos && window.cargos.length > 0) {
            const cargoIntersects = raycaster.intersectObjects(window.cargos, true);
            if (cargoIntersects.length > 0) {
                return;
            }
        }

        clearAllSelections();
        if (window.PartsModule) {
            window.PartsModule.selectPart(null);
        }
        clearCargoSelection();
        return;
    }

    const rect = event.target.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = window.CoreModule.getRaycaster();
    const camera = window.CoreModule.getCamera();
    raycaster.setFromCamera(mouse, camera);

    const allIntersects = [];

    if (window.cargos && window.cargos.length > 0) {
        const cargoIntersects = raycaster.intersectObjects(window.cargos, true);
        cargoIntersects.forEach(intersect => {
            const cargo = window.CargoModule.findCargoFromObject(intersect.object);
            if (cargo) {
                allIntersects.push({
                    type: 'cargo',
                    object: cargo,
                    distance: intersect.distance
                });
            }
        });
    }

    const shelves = window.ShelfModule.getShelves();
    const shelfIntersects = raycaster.intersectObjects(shelves, true);
    shelfIntersects.forEach(intersect => {
        const shelf = findShelfFromObject(intersect.object);
        if (shelf) {
            allIntersects.push({
                type: 'shelf',
                object: shelf,
                distance: intersect.distance
            });
        }
    });

    if (window.parts && window.parts.length > 0) {
        const partIntersects = raycaster.intersectObjects(window.parts, true);
        partIntersects.forEach(intersect => {
            const part = window.PartsModule.findPartFromObject(intersect.object);
            if (part) {
                allIntersects.push({
                    type: 'part',
                    object: part,
                    distance: intersect.distance
                });
            }
        });
    }

    if (allIntersects.length > 0) {
        allIntersects.sort((a, b) => a.distance - b.distance);
        const closest = allIntersects[0];

        if (closest.type === 'cargo') {
            return;
        } else if (closest.type === 'shelf') {
            const shelf = closest.object;
            console.log('选择货架:', shelf.userData.name);
            if (window.PartsModule) {
                window.PartsModule.selectPart(null);
            }
            if (window.cargos) {
                window.cargos.forEach(cargo => {
                    cargo.userData.selected = false;
                    if (window.CargoModule && window.CargoModule.updateCargoAppearance) {
                        window.CargoModule.updateCargoAppearance(cargo);
                    }
                });
            }
            handleSelection(event, shelf);
            return;
        } else if (closest.type === 'part') {
            const part = closest.object;
            console.log('选择零件:', part.userData.name);
            clearAllSelections();
            if (window.cargos) {
                window.cargos.forEach(cargo => {
                    cargo.userData.selected = false;
                    if (window.CargoModule && window.CargoModule.updateCargoAppearance) {
                        window.CargoModule.updateCargoAppearance(cargo);
                    }
                });
            }
            window.PartsModule.selectPart(part);
            return;
        }
    }

    clearAllSelections();
    if (window.PartsModule) {
        window.PartsModule.selectPart(null);
    }
}

/**
 * 选择处理（支持Shift多选，适用于两种模式）
 */
function handleSelection(event, shelf) {
    const isShiftPressed = event.shiftKey;

    if (isShiftPressed) {
        if (selectedShelves.has(shelf)) {
            selectedShelves.delete(shelf);
            shelf.userData.selected = false;
        } else {
            selectedShelves.add(shelf);
            shelf.userData.selected = true;
        }
    } else {
        if (selectedShelves.has(shelf) && selectedShelves.size === 1) {
            selectedShelves.clear();
            shelf.userData.selected = false;
            clearSelectionUI();
        } else {
            clearAllSelections();
            selectedShelves.add(shelf);
            shelf.userData.selected = true;
            updateSelectionUI(shelf);
        }
    }

    if (window.ShelfModule && window.ShelfModule.updateShelfAppearance) {
        window.ShelfModule.updateShelfAppearance(shelf);
    }

    updateMultiSelectionUI();
}

/**
 * 清除所有选择
 */
function clearAllSelections() {
    selectedShelves.forEach(shelf => {
        shelf.userData.selected = false;
        if (window.ShelfModule && window.ShelfModule.updateShelfAppearance) {
            window.ShelfModule.updateShelfAppearance(shelf);
        }
    });
    selectedShelves.clear();

    if (window.ShelfModule) {
        const allShelves = window.ShelfModule.getShelves();
        allShelves.forEach(shelf => {
            if (shelf.userData.selected) {
                shelf.userData.selected = false;
                if (window.ShelfModule && window.ShelfModule.updateShelfAppearance) {
                    window.ShelfModule.updateShelfAppearance(shelf);
                }
            }
        });
    }

    clearSelectionUI();
}

/**
 * 更新选择UI（单选择）
 */
function updateSelectionUI(shelf) {
    document.getElementById('selectedShelf').textContent = shelf.userData.name;
    document.getElementById('selectedShelfPanel').style.display = 'block';

    clearCargoSelection();

    if (document.getElementById('shelfX')) {
        const userX = shelf.position.x + (shelf.userData.depth || 1) / 2;
        const userY = shelf.position.z - (shelf.userData.width || 2) / 2;
        document.getElementById('shelfX').value = userX.toFixed(2);
        document.getElementById('shelfZ').value = userY.toFixed(2);
    }

    if (window.ControlModule && window.ControlModule.updateControlPanel) {
        window.ControlModule.updateControlPanel(shelf);
    }
}

/**
 * 清除选择UI
 */
function clearSelectionUI() {
    document.getElementById('selectedShelf').textContent = '无';
    document.getElementById('selectedShelfPanel').style.display = 'none';
    clearCargoSelectionUI();
}

/**
 * 更新货物选择UI
 */
function updateCargoSelectionUI(cargo) {
    if (!cargo) return;

    const cargoData = cargo.userData;
    const sku = cargoData.sku || {};

    if (document.getElementById('cargoName')) {
        document.getElementById('cargoName').value = cargoData.name || sku.name || '未知货物';
    }
    if (document.getElementById('cargoSkuCode')) {
        document.getElementById('cargoSkuCode').value = sku.sku_code || '';
    }
    if (document.getElementById('cargoX')) {
        document.getElementById('cargoX').value = cargo.position.x.toFixed(2);
    }
    if (document.getElementById('cargoZ')) {
        document.getElementById('cargoZ').value = cargo.position.z.toFixed(2);
    }
    if (document.getElementById('cargoY')) {
        const baseY = cargo.position.y - cargoData.height / 2;
        document.getElementById('cargoY').value = baseY.toFixed(2);
    }
    if (document.getElementById('cargoLength')) {
        document.getElementById('cargoLength').value = cargoData.depth.toFixed(2);
    }
    if (document.getElementById('cargoWidth')) {
        document.getElementById('cargoWidth').value = cargoData.width.toFixed(2);
    }
    if (document.getElementById('cargoHeight')) {
        document.getElementById('cargoHeight').value = cargoData.height.toFixed(2);
    }
    if (document.getElementById('cargoWeight')) {
        document.getElementById('cargoWeight').value = cargoData.weight.toFixed(1);
    }

    const panel = document.getElementById('selectedCargoPanel');
    if (panel) {
        panel.style.display = 'block';
    }

    const shelfPanel = document.getElementById('selectedShelfPanel');
    if (shelfPanel) {
        shelfPanel.style.display = 'none';
    }
}

/**
 * 清除货物选择UI
 */
function clearCargoSelectionUI() {
    const panel = document.getElementById('selectedCargoPanel');
    if (panel) {
        panel.style.display = 'none';
    }
    selectedCargo = null;
}

/**
 * 清除所有货物选择
 */
function clearCargoSelection() {
    if (window.cargos) {
        window.cargos.forEach(cargo => {
            cargo.userData.selected = false;
            if (window.CargoModule && window.CargoModule.updateCargoAppearance) {
                window.CargoModule.updateCargoAppearance(cargo);
            }
        });
    }
    clearCargoSelectionUI();
}

/**
 * 更新多选UI显示
 */
function updateMultiSelectionUI() {
    if (selectedShelves.size === 0) {
        clearSelectionUI();
        if (window.MeasureModule) {
            window.MeasureModule.hideMeasurement();
        }
    } else if (selectedShelves.size === 1) {
        const shelf = Array.from(selectedShelves)[0];
        updateSelectionUI(shelf);
        if (window.MeasureModule) {
            window.MeasureModule.hideMeasurement();
        }
    } else if (selectedShelves.size === 2) {
        const shelvesArray = Array.from(selectedShelves);
        document.getElementById('selectedShelf').textContent = `已选择 2 个货架`;
        document.getElementById('selectedShelfPanel').style.display = 'block';
        if (window.MeasureModule) {
            window.MeasureModule.showMeasurement(shelvesArray[0], shelvesArray[1]);
        }
    } else {
        document.getElementById('selectedShelf').textContent = `已选择 ${selectedShelves.size} 个货架`;
        document.getElementById('selectedShelfPanel').style.display = 'block';
        if (window.MeasureModule) {
            window.MeasureModule.hideMeasurement();
        }
    }
}

/**
 * 辅助函数：从点击对象查找货架
 */
function findShelfFromObject(object) {
    let current = object;
    while (current) {
        if (current.userData && current.userData.isShelf) {
            return current;
        }
        current = current.parent;
    }
    return null;
}

function toggleMode() {
    const controls = window.CoreModule.getControls();
    const canvas = window.CoreModule.getRenderer().domElement;
    const modeBtn = document.getElementById('modeToggleBtn');

    if (currentMode === 'move') {
        currentMode = 'view';
        modeBtn.textContent = '视角模式';
        modeBtn.classList.remove('active');

        clearAllSelections();

        controls.enabled = true;

        canvas.style.cursor = 'default';

        console.log('切换到视角模式 - OrbitControls已启用');
    } else {
        currentMode = 'move';
        modeBtn.textContent = '移动模式';
        modeBtn.classList.add('active');

        clearAllSelections();

        controls.enabled = false;

        console.log('切换到移动模式 - OrbitControls已禁用');
    }
}

/**
 * 删除选中的货物
 */
async function deleteSelectedCargo() {
    if (!selectedCargo) {
        alert('请先选择一个货物');
        return;
    }

    if (!confirm(`确定要删除货物 "${selectedCargo.userData.name}" 吗？此操作无法撤销。`)) {
        return;
    }

    if (window.CargoModule && window.CargoModule.deleteCargo) {
        await window.CargoModule.deleteCargo(selectedCargo);
        clearCargoSelectionUI();
        selectedCargo = null;
    }
}

/**
 * 应用货物位置
 */
async function applyCargoPosition() {
    if (!selectedCargo) {
        alert('请先选择一个货物');
        return;
    }

    const cargo = selectedCargo;
    const cargoData = cargo.userData;

    const x = parseFloat(document.getElementById('cargoX').value) || cargo.position.x;
    const z = parseFloat(document.getElementById('cargoZ').value) || cargo.position.z;
    const y = parseFloat(document.getElementById('cargoY').value) || (cargo.position.y - cargoData.height / 2);

    cargo.position.set(x, y + cargoData.height / 2, z);

    const supportY = window.CargoModule.getSupportHeight(cargo);
    const targetY = supportY + cargoData.height / 2;
    if (cargo.position.y > targetY + 0.01) {
        cargo.userData.grounded = false;
        if (window.CargoModule && window.CargoModule.updateCargoGravity) {
            window.CargoModule.updateCargoGravity(cargo);
        }
    } else {
        cargo.position.y = targetY;
        cargo.userData.grounded = true;
    }

    if (cargo.userData.dbId && window.CargoModule && window.CargoModule.updateCargoPosition) {
        await window.CargoModule.updateCargoPosition(
            cargo.userData.dbId,
            x,
            y,
            z
        );
    }

    updateCargoSelectionUI(cargo);
}

window.EventsModule = {
    initEventListeners,
    findShelfFromObject,
    toggleMode,
    clearAllSelections,
    getSelectedShelves: () => Array.from(selectedShelves),
    getSelectedShelf: () => {
        const shelves = Array.from(selectedShelves);
        return shelves.length === 1 ? shelves[0] : null;
    },
    setSelectedShelf: (shelf) => {
        clearAllSelections();
        if (shelf) {
            selectedShelves.add(shelf);
            shelf.userData.selected = true;
            updateSelectionUI(shelf);
        }
    },
    getSelectedCargo: () => selectedCargo,
    clearCargoSelection,
    clearCargoSelectionUI,
    updateCameraMovement
};

window.deleteSelectedCargo = deleteSelectedCargo;
window.applyCargoPosition = applyCargoPosition;
window.exitCargoRepositionMode = exitCargoRepositionMode;

const keysPressed = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

const CAMERA_MOVE_SPEED = 0.1;

/**
 * 键盘按下处理
 */
function handleKeyDown(event) {
    if (event.key === 'Escape' && cargoRepositionMode) {
        if (cargoToReposition) {
            if (cargoToReposition.userData.originalPosition) {
                cargoToReposition.position.copy(cargoToReposition.userData.originalPosition);
            }
            if (cargoToReposition.userData.originalRotation !== undefined) {
                cargoToReposition.rotation.y = cargoToReposition.userData.originalRotation;
            }
        }
        exitCargoRepositionMode();
        return;
    }

    if ((event.key === 't' || event.key === 'T') && cargoRepositionMode && cargoToReposition) {
        event.preventDefault();
        cargoToReposition.rotation.y += Math.PI / 2;
        cargoToReposition.rotation.y = cargoToReposition.rotation.y % (Math.PI * 2);
        if (cargoToReposition.rotation.y < 0) {
            cargoToReposition.rotation.y += Math.PI * 2;
        }
        console.log('货物旋转:', (cargoToReposition.rotation.y * 180 / Math.PI).toFixed(0) + '°');
        return;
    }

    if (currentMode !== 'view') {
        return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        keysPressed[event.key] = true;
    }
}

/**
 * 键盘释放处理
 */
function handleKeyUp(event) {
    if (currentMode !== 'view') {
        return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        keysPressed[event.key] = false;
    }
}

/**
 * 更新视角移动（在动画循环中调用）
 */
function updateCameraMovement() {
    if (currentMode !== 'view') {
        return;
    }

    const camera = window.CoreModule.getCamera();
    const controls = window.CoreModule.getControls();

    if (!keysPressed.ArrowUp && !keysPressed.ArrowDown &&
        !keysPressed.ArrowLeft && !keysPressed.ArrowRight) {
        return;
    }

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const right = new THREE.Vector3();
    right.crossVectors(direction, camera.up).normalize();

    const forward = new THREE.Vector3();
    forward.set(direction.x, 0, direction.z);
    const forwardLength = forward.length();
    if (forwardLength > 0) {
        forward.normalize();
    } else {
        forward.set(0, 0, -1);
    }

    const moveVector = new THREE.Vector3(0, 0, 0);

    if (keysPressed.ArrowUp) {
        moveVector.add(forward.clone().multiplyScalar(CAMERA_MOVE_SPEED));
    }
    if (keysPressed.ArrowDown) {
        moveVector.add(forward.clone().multiplyScalar(-CAMERA_MOVE_SPEED));
    }
    if (keysPressed.ArrowLeft) {
        moveVector.add(right.multiplyScalar(-CAMERA_MOVE_SPEED));
    }
    if (keysPressed.ArrowRight) {
        moveVector.add(right.multiplyScalar(CAMERA_MOVE_SPEED));
    }

    if (moveVector.length() > 0) {
        camera.position.add(moveVector);
        controls.target.add(moveVector);
        controls.update();
    }
}