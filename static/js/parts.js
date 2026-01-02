
/**
 * 全局零件数组
 */
window.parts = [];

/**
 * 当前选中的零件
 */
let selectedPart = null;

/**
 * 放置模式标记
 */
let placementMode = null;

/**
 * 创建出库口3D模型
 * @param {number} x - X坐标
 * @param {number} z - Z坐标
 * @param {number} rotation - 旋转角度（弧度）
 */
function createDock(x = 0, z = 0, rotation = 0) {
    const scene = window.CoreModule.getScene();
    const dockGroup = new THREE.Group();

    const dockWidth = 4;
    const dockHeight = 3.5;
    const dockDepth = 0.3;
    const frameThickness = 0.15;

    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x505050,
        roughness: 0.4,
        metalness: 0.8
    });

    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x3399FF,
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
        opacity: 0.85
    });

    const leftFrame = new THREE.Mesh(
        new THREE.BoxGeometry(frameThickness, dockHeight, dockDepth),
        frameMaterial
    );
    leftFrame.position.set(-dockWidth / 2 + frameThickness / 2, dockHeight / 2, 0);
    leftFrame.castShadow = true;
    dockGroup.add(leftFrame);

    const rightFrame = new THREE.Mesh(
        new THREE.BoxGeometry(frameThickness, dockHeight, dockDepth),
        frameMaterial
    );
    rightFrame.position.set(dockWidth / 2 - frameThickness / 2, dockHeight / 2, 0);
    rightFrame.castShadow = true;
    dockGroup.add(rightFrame);

    const topFrame = new THREE.Mesh(
        new THREE.BoxGeometry(dockWidth, frameThickness, dockDepth),
        frameMaterial
    );
    topFrame.position.set(0, dockHeight - frameThickness / 2, 0);
    topFrame.castShadow = true;
    dockGroup.add(topFrame);

    const doorHeight = dockHeight * 0.4;
    const door = new THREE.Mesh(
        new THREE.BoxGeometry(dockWidth - frameThickness * 2, doorHeight, 0.05),
        doorMaterial
    );
    door.position.set(0, dockHeight - frameThickness - doorHeight / 2, 0);
    door.castShadow = true;
    dockGroup.add(door);

    const lineCount = 8;
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x2266CC });
    for (let i = 0; i < lineCount; i++) {
        const lineY = dockHeight - frameThickness - doorHeight + (doorHeight / lineCount) * (i + 0.5);
        const points = [
            new THREE.Vector3(-dockWidth / 2 + frameThickness, lineY, 0.03),
            new THREE.Vector3(dockWidth / 2 - frameThickness, lineY, 0.03)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, lineMaterial);
        dockGroup.add(line);
    }

    const warningMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFCC00,
        roughness: 0.6
    });
    const warning = new THREE.Mesh(
        new THREE.BoxGeometry(dockWidth + 0.5, 0.02, 1),
        warningMaterial
    );
    warning.position.set(0, 0.01, dockDepth / 2 + 0.5);
    dockGroup.add(warning);

    dockGroup.position.set(x, 0, z);
    dockGroup.rotation.y = rotation;
    dockGroup.userData = {
        isPart: true,
        partType: 'dock',
        name: `出库口-${window.parts.length + 1}`,
        selected: false,
        hovered: false,
        width: dockWidth,
        height: dockHeight,
        depth: dockDepth
    };

    scene.add(dockGroup);
    window.parts.push(dockGroup);
    updatePartsStatus();

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }

    return dockGroup;
}

/**
 * 创建墙面3D模型
 * @param {number} x - X坐标
 * @param {number} z - Z坐标
 * @param {number} length - 墙面长度
 * @param {number} height - 墙面高度
 * @param {number} rotation - 旋转角度（弧度）
 */
function createWall(x = 0, z = 0, length = 6, height = 3, rotation = 0) {
    const scene = window.CoreModule.getScene();
    const wallGroup = new THREE.Group();

    const wallThickness = 0.2;

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.9,
        metalness: 0.1
    });

    const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(length, height, wallThickness),
        wallMaterial
    );
    wallMesh.position.set(0, height / 2, 0);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wallGroup.add(wallMesh);

    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x606060,
        roughness: 0.8,
        metalness: 0.2
    });
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.15, wallThickness + 0.1),
        baseMaterial
    );
    base.position.set(0, 0.075, 0);
    wallGroup.add(base);

    wallGroup.position.set(x, 0, z);
    wallGroup.rotation.y = rotation;
    wallGroup.userData = {
        isPart: true,
        partType: 'wall',
        name: `墙面-${window.parts.length + 1}`,
        selected: false,
        hovered: false,
        length: length,
        height: height,
        thickness: wallThickness
    };

    scene.add(wallGroup);
    window.parts.push(wallGroup);
    updatePartsStatus();

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }

    return wallGroup;
}
/**
 * 创建楼梯口3D模型
 * @param {number} x - X坐标
 * @param {number} z - Z坐标
 * @param {string} stairType - 楼梯类型: 'straight'(直梯), 'double'(双跑), 'spiral'(旋转)
 * @param {number} rotation - 旋转角度（弧度）
 */
function createStaircase(x = 0, z = 0, stairType = 'straight', rotation = 0) {
    const scene = window.CoreModule.getScene();
    const staircaseGroup = new THREE.Group();

    const concreteMaterial = new THREE.MeshStandardMaterial({
        color: 0x707070,
        roughness: 0.9,
        metalness: 0.1
    });

    const railMaterial = new THREE.MeshStandardMaterial({
        color: 0xAAAAAA,
        roughness: 0.3,
        metalness: 0.9
    });

    const signMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });

    let stairWidth, stairDepth, stairHeight;
    const stairTypeNames = {
        'straight': '直梯',
        'double': '双跑楼梯',
        'spiral': '旋转楼梯'
    };

    if (stairType === 'straight') {
        stairWidth = 3;
        stairDepth = 4;
        stairHeight = 3;
        const stepCount = 8;
        const stepHeight = stairHeight / stepCount;
        const stepDepth = stairDepth / stepCount;

        for (let i = 0; i < stepCount; i++) {
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(stairWidth, stepHeight, stepDepth),
                concreteMaterial
            );
            step.position.set(0, stepHeight * (i + 0.5), -stepDepth * (i + 0.5));
            step.castShadow = true;
            step.receiveShadow = true;
            staircaseGroup.add(step);
        }

        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(stairWidth + 0.2, 0.15, 1.5),
            concreteMaterial
        );
        platform.position.set(0, stairHeight, -stairDepth - 0.75);
        platform.castShadow = true;
        staircaseGroup.add(platform);

        const railGeometry = new THREE.BoxGeometry(0.05, 1, stairDepth + 1.5);
        const leftRail = new THREE.Mesh(railGeometry, railMaterial);
        leftRail.position.set(-stairWidth / 2, stairHeight / 2 + 0.5, -stairDepth / 2);
        leftRail.rotation.x = Math.atan(stairHeight / stairDepth);
        staircaseGroup.add(leftRail);

        const rightRail = new THREE.Mesh(railGeometry, railMaterial);
        rightRail.position.set(stairWidth / 2, stairHeight / 2 + 0.5, -stairDepth / 2);
        rightRail.rotation.x = Math.atan(stairHeight / stairDepth);
        staircaseGroup.add(rightRail);

    } else if (stairType === 'double') {
        stairWidth = 3;
        stairDepth = 5;
        stairHeight = 3;
        const stepCount = 6;
        const stepHeight = (stairHeight / 2) / stepCount;
        const stepDepth = 2 / stepCount;

        for (let i = 0; i < stepCount; i++) {
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(stairWidth / 2 - 0.1, stepHeight, stepDepth),
                concreteMaterial
            );
            step.position.set(-stairWidth / 4, stepHeight * (i + 0.5), -stepDepth * (i + 0.5));
            step.castShadow = true;
            staircaseGroup.add(step);
        }

        const midPlatform = new THREE.Mesh(
            new THREE.BoxGeometry(stairWidth, 0.15, 1.5),
            concreteMaterial
        );
        midPlatform.position.set(0, stairHeight / 2, -2.75);
        staircaseGroup.add(midPlatform);

        for (let i = 0; i < stepCount; i++) {
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(stairWidth / 2 - 0.1, stepHeight, stepDepth),
                concreteMaterial
            );
            step.position.set(stairWidth / 4, stairHeight / 2 + stepHeight * (i + 0.5), -2 + stepDepth * (i + 0.5));
            step.castShadow = true;
            staircaseGroup.add(step);
        }

        const topPlatform = new THREE.Mesh(
            new THREE.BoxGeometry(stairWidth / 2, 0.15, 1),
            concreteMaterial
        );
        topPlatform.position.set(stairWidth / 4, stairHeight, -0.5);
        staircaseGroup.add(topPlatform);

        const divider = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, stairHeight, 3),
            concreteMaterial
        );
        divider.position.set(0, stairHeight / 2, -1.5);
        staircaseGroup.add(divider);

    } else if (stairType === 'spiral') {
        stairWidth = 3;
        stairDepth = 3;
        stairHeight = 3.5;
        const stepCount = 12;
        const stepHeight = stairHeight / stepCount;
        const radius = 1.2;
        const anglePerStep = (Math.PI * 1.5) / stepCount;

        const centerPillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, stairHeight + 0.5, 16),
            railMaterial
        );
        centerPillar.position.set(0, stairHeight / 2, 0);
        staircaseGroup.add(centerPillar);

        for (let i = 0; i < stepCount; i++) {
            const angle = anglePerStep * i;
            const stepGeometry = new THREE.BoxGeometry(radius, stepHeight * 0.9, 0.5);
            const step = new THREE.Mesh(stepGeometry, concreteMaterial);

            const stepX = Math.sin(angle) * (radius / 2 + 0.15);
            const stepZ = -Math.cos(angle) * (radius / 2 + 0.15);
            step.position.set(stepX, stepHeight * (i + 0.5), stepZ);
            step.rotation.y = angle;
            step.castShadow = true;
            staircaseGroup.add(step);
        }

        const topPlatform = new THREE.Mesh(
            new THREE.CylinderGeometry(radius + 0.3, radius + 0.3, 0.15, 16, 1, false, 0, Math.PI),
            concreteMaterial
        );
        topPlatform.position.set(0, stairHeight, -radius / 2);
        topPlatform.rotation.y = -Math.PI / 2;
        staircaseGroup.add(topPlatform);

        for (let i = 0; i < stepCount - 1; i++) {
            const angle1 = anglePerStep * i;
            const angle2 = anglePerStep * (i + 1);
            const railHeight = 1;

            const x1 = Math.sin(angle1) * (radius + 0.2);
            const z1 = -Math.cos(angle1) * (radius + 0.2);
            const y1 = stepHeight * (i + 1) + railHeight;

            const x2 = Math.sin(angle2) * (radius + 0.2);
            const z2 = -Math.cos(angle2) * (radius + 0.2);
            const y2 = stepHeight * (i + 2) + railHeight;

            const railLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
            const railSegment = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.025, railLength, 8),
                railMaterial
            );
            railSegment.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
            railSegment.lookAt(x2, y2, z2);
            railSegment.rotation.x += Math.PI / 2;
            staircaseGroup.add(railSegment);
        }
    }

    const signGeometry = new THREE.BoxGeometry(0.8, 0.5, 0.02);
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, stairHeight + 0.8, stairType === 'spiral' ? 0 : -stairDepth - 1);
    staircaseGroup.add(sign);

    staircaseGroup.position.set(x, 0, z);
    staircaseGroup.rotation.y = rotation;
    staircaseGroup.userData = {
        isPart: true,
        partType: 'staircase',
        stairType: stairType,
        name: `${stairTypeNames[stairType] || '楼梯'}-${window.parts.length + 1}`,
        selected: false,
        hovered: false,
        width: stairWidth,
        height: stairHeight,
        depth: stairDepth
    };

    scene.add(staircaseGroup);
    window.parts.push(staircaseGroup);
    updatePartsStatus();

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }

    return staircaseGroup;
}

/**
 * 创建电梯3D模型
 * @param {number} x - X坐标
 * @param {number} z - Z坐标
 * @param {number} width - 电梯宽度
 * @param {number} depth - 电梯深度
 * @param {number} height - 电梯高度
 * @param {number} rotation - 旋转角度（弧度）
 */
function createElevator(x = 0, z = 0, width = 3, depth = 3, height = 4, rotation = 0) {
    const scene = window.CoreModule.getScene();
    const elevatorGroup = new THREE.Group();

    const wallThickness = 0.1;

    const shaftMaterial = new THREE.MeshStandardMaterial({
        color: 0x404040,
        roughness: 0.6,
        metalness: 0.4
    });

    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0C0,
        roughness: 0.2,
        metalness: 0.9
    });

    const cabinMaterial = new THREE.MeshStandardMaterial({
        color: 0xE8E8E8,
        roughness: 0.5,
        metalness: 0.2
    });

    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.7,
        metalness: 0.3
    });

    const panelMaterial = new THREE.MeshStandardMaterial({
        color: 0x2196F3,
        roughness: 0.3,
        metalness: 0.5
    });

    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, height, depth),
        shaftMaterial
    );
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.castShadow = true;
    elevatorGroup.add(leftWall);

    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, height, depth),
        shaftMaterial
    );
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.castShadow = true;
    elevatorGroup.add(rightWall);

    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, wallThickness),
        shaftMaterial
    );
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.castShadow = true;
    elevatorGroup.add(backWall);

    const top = new THREE.Mesh(
        new THREE.BoxGeometry(width, wallThickness, depth),
        shaftMaterial
    );
    top.position.set(0, height, 0);
    top.castShadow = true;
    elevatorGroup.add(top);

    const doorWidth = width * 0.8;
    const doorHeight = height * 0.75;
    const doorFrameThickness = 0.08;

    const doorFrameLeft = new THREE.Mesh(
        new THREE.BoxGeometry(doorFrameThickness, doorHeight + 0.1, 0.15),
        shaftMaterial
    );
    doorFrameLeft.position.set(-doorWidth / 2 - doorFrameThickness / 2, doorHeight / 2, depth / 2);
    elevatorGroup.add(doorFrameLeft);

    const doorFrameRight = new THREE.Mesh(
        new THREE.BoxGeometry(doorFrameThickness, doorHeight + 0.1, 0.15),
        shaftMaterial
    );
    doorFrameRight.position.set(doorWidth / 2 + doorFrameThickness / 2, doorHeight / 2, depth / 2);
    elevatorGroup.add(doorFrameRight);

    const doorFrameTop = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth + doorFrameThickness * 2, doorFrameThickness, 0.15),
        shaftMaterial
    );
    doorFrameTop.position.set(0, doorHeight + doorFrameThickness / 2, depth / 2);
    elevatorGroup.add(doorFrameTop);

    const aboveDoor = new THREE.Mesh(
        new THREE.BoxGeometry(width - wallThickness * 2, height - doorHeight - doorFrameThickness, wallThickness),
        shaftMaterial
    );
    aboveDoor.position.set(0, doorHeight + doorFrameThickness + (height - doorHeight - doorFrameThickness) / 2, depth / 2 - wallThickness / 2);
    elevatorGroup.add(aboveDoor);

    const singleDoorWidth = doorWidth / 2 - 0.02;
    const leftDoor = new THREE.Mesh(
        new THREE.BoxGeometry(singleDoorWidth, doorHeight - 0.1, 0.04),
        doorMaterial
    );
    leftDoor.position.set(-singleDoorWidth / 2 - 0.01, doorHeight / 2, depth / 2 + 0.02);
    elevatorGroup.add(leftDoor);

    const rightDoor = new THREE.Mesh(
        new THREE.BoxGeometry(singleDoorWidth, doorHeight - 0.1, 0.04),
        doorMaterial
    );
    rightDoor.position.set(singleDoorWidth / 2 + 0.01, doorHeight / 2, depth / 2 + 0.02);
    elevatorGroup.add(rightDoor);

    const doorGapMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const doorGap = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, doorHeight - 0.1, 0.05),
        doorGapMaterial
    );
    doorGap.position.set(0, doorHeight / 2, depth / 2 + 0.025);
    elevatorGroup.add(doorGap);

    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(width - wallThickness * 2, 0.05, depth - wallThickness),
        cabinMaterial
    );
    floor.position.set(0, 0.025, -wallThickness / 2);
    floor.receiveShadow = true;
    elevatorGroup.add(floor);

    const railMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.2,
        metalness: 0.8
    });
    const railHeight = height * 0.25;

    const backRail = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.7, 0.04, 0.04),
        railMaterial
    );
    backRail.position.set(0, railHeight, -depth / 2 + 0.15);
    elevatorGroup.add(backRail);

    const railBrackets = [-width * 0.3, 0, width * 0.3];
    for (const bx of railBrackets) {
        const bracket = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.1, 0.03),
            railMaterial
        );
        bracket.position.set(bx, railHeight - 0.05, -depth / 2 + 0.15);
        elevatorGroup.add(bracket);
    }

    const buttonPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.4, 0.05),
        shaftMaterial
    );
    buttonPanel.position.set(width / 2 + 0.15, height * 0.35, depth / 2);
    elevatorGroup.add(buttonPanel);

    const upButton = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16),
        panelMaterial
    );
    upButton.rotation.x = Math.PI / 2;
    upButton.position.set(width / 2 + 0.15, height * 0.38, depth / 2 + 0.03);
    elevatorGroup.add(upButton);

    const downButton = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0xFF5722, roughness: 0.3, metalness: 0.5 })
    );
    downButton.rotation.x = Math.PI / 2;
    downButton.position.set(width / 2 + 0.15, height * 0.32, depth / 2 + 0.03);
    elevatorGroup.add(downButton);

    const indicatorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.15, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.5 })
    );
    indicatorPanel.position.set(0, doorHeight + 0.15, depth / 2 + 0.05);
    elevatorGroup.add(indicatorPanel);

    const floorDisplay = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.1, 0.01),
        new THREE.MeshBasicMaterial({ color: 0x00FF00 })
    );
    floorDisplay.position.set(0, doorHeight + 0.15, depth / 2 + 0.07);
    elevatorGroup.add(floorDisplay);

    const signMaterial = new THREE.MeshLambertMaterial({ color: 0x1565C0 });
    const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.3, 0.02),
        signMaterial
    );
    sign.position.set(0, height - 0.2, depth / 2 + 0.12);
    elevatorGroup.add(sign);

    const base = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.2, 0.05, depth + 0.2),
        baseMaterial
    );
    base.position.set(0, 0.025, 0);
    base.receiveShadow = true;
    elevatorGroup.add(base);

    const warningMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFCC00,
        roughness: 0.6
    });
    const warningStripe = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth + 0.4, 0.02, 0.8),
        warningMaterial
    );
    warningStripe.position.set(0, 0.01, depth / 2 + 0.4);
    elevatorGroup.add(warningStripe);

    elevatorGroup.position.set(x, 0, z);
    elevatorGroup.rotation.y = rotation;
    elevatorGroup.userData = {
        isPart: true,
        partType: 'elevator',
        name: `电梯-${window.parts.length + 1}`,
        selected: false,
        hovered: false,
        width: width,
        height: height,
        depth: depth
    };

    scene.add(elevatorGroup);
    window.parts.push(elevatorGroup);
    updatePartsStatus();

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }

    return elevatorGroup;
}

/**
 * 创建厕所3D模型
 * @param {number} x - X坐标
 * @param {number} z - Z坐标
 * @param {number} width - 厕所宽度
 * @param {number} depth - 厕所深度
 * @param {number} height - 厕所高度
 * @param {number} rotation - 旋转角度（弧度）
 */
function createRestroom(x = 0, z = 0, width = 4, depth = 3, height = 3, rotation = 0) {
    const scene = window.CoreModule.getScene();
    const restroomGroup = new THREE.Group();

    const roomWidth = width;
    const roomDepth = depth;
    const roomHeight = height;
    const wallThickness = 0.15;

    const tileMaterial = new THREE.MeshStandardMaterial({
        color: 0xF5F5F5,
        roughness: 0.3,
        metalness: 0.1
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x606060,
        roughness: 0.5,
        metalness: 0.3
    });

    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, roomHeight, roomDepth),
        tileMaterial
    );
    leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
    leftWall.castShadow = true;
    restroomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, roomHeight, roomDepth),
        tileMaterial
    );
    rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
    rightWall.castShadow = true;
    restroomGroup.add(rightWall);

    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(roomWidth, roomHeight, wallThickness),
        tileMaterial
    );
    backWall.position.set(0, roomHeight / 2, -roomDepth / 2);
    backWall.castShadow = true;
    restroomGroup.add(backWall);

    const doorWidth = 1.2;
    const doorHeight = 2.2;

    const frontLeftWidth = (roomWidth - doorWidth) / 2;
    const frontLeft = new THREE.Mesh(
        new THREE.BoxGeometry(frontLeftWidth, roomHeight, wallThickness),
        tileMaterial
    );
    frontLeft.position.set(-roomWidth / 2 + frontLeftWidth / 2, roomHeight / 2, roomDepth / 2);
    restroomGroup.add(frontLeft);

    const frontRight = new THREE.Mesh(
        new THREE.BoxGeometry(frontLeftWidth, roomHeight, wallThickness),
        tileMaterial
    );
    frontRight.position.set(roomWidth / 2 - frontLeftWidth / 2, roomHeight / 2, roomDepth / 2);
    restroomGroup.add(frontRight);

    const frontTop = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth, roomHeight - doorHeight, wallThickness),
        tileMaterial
    );
    frontTop.position.set(0, doorHeight + (roomHeight - doorHeight) / 2, roomDepth / 2);
    restroomGroup.add(frontTop);

    const doorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth + 0.1, doorHeight + 0.05, 0.08),
        frameMaterial
    );
    doorFrame.position.set(0, doorHeight / 2, roomDepth / 2 + 0.04);
    restroomGroup.add(doorFrame);

    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.6,
        metalness: 0.1
    });
    const door = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth - 0.1, doorHeight - 0.1, 0.05),
        doorMaterial
    );
    door.position.set(doorWidth / 2 - 0.3, doorHeight / 2, roomDepth / 2 + 0.1);
    door.rotation.y = Math.PI / 6;
    restroomGroup.add(door);

    const signGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.02);
    const signMaterial = new THREE.MeshLambertMaterial({ color: 0x1E90FF });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, roomHeight - 0.5, roomDepth / 2 + 0.1);
    restroomGroup.add(sign);

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xDDDDDD,
        roughness: 0.4
    });
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(roomWidth - wallThickness * 2, 0.02, roomDepth - wallThickness),
        floorMaterial
    );
    floor.position.set(0, 0.01, 0);
    floor.receiveShadow = true;
    restroomGroup.add(floor);

    restroomGroup.position.set(x, 0, z);
    restroomGroup.rotation.y = rotation;
    restroomGroup.userData = {
        isPart: true,
        partType: 'restroom',
        name: `厕所-${window.parts.length + 1}`,
        selected: false,
        hovered: false,
        width: roomWidth,
        height: roomHeight,
        depth: roomDepth
    };

    scene.add(restroomGroup);
    window.parts.push(restroomGroup);
    updatePartsStatus();

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }

    return restroomGroup;
}

/**
 * 创建板房办公室3D模型
 * @param {number} x - X坐标
 * @param {number} z - Z坐标
 * @param {number} width - 办公室宽度
 * @param {number} depth - 办公室深度
 * @param {number} height - 办公室高度
 * @param {number} rotation - 旋转角度（弧度）
 */
function createOffice(x = 0, z = 0, width = 6, depth = 4, height = 3, rotation = 0) {
    const scene = window.CoreModule.getScene();
    const officeGroup = new THREE.Group();

    const wallThickness = 0.12;
    const roofOverhang = 0.3;

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x4A6B8A,
        roughness: 0.7,
        metalness: 0.3
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0xE8E8E8,
        roughness: 0.5,
        metalness: 0.2
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x87CEEB,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.6
    });

    const roofMaterial = new THREE.MeshStandardMaterial({
        color: 0x404040,
        roughness: 0.8,
        metalness: 0.2
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xB8860B,
        roughness: 0.6
    });

    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.1, depth),
        floorMaterial
    );
    floor.position.set(0, 0.05, 0);
    floor.receiveShadow = true;
    officeGroup.add(floor);

    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, wallThickness),
        wallMaterial
    );
    backWall.position.set(0, height / 2 + 0.1, -depth / 2);
    backWall.castShadow = true;
    officeGroup.add(backWall);

    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, height, depth),
        wallMaterial
    );
    leftWall.position.set(-width / 2, height / 2 + 0.1, 0);
    leftWall.castShadow = true;
    officeGroup.add(leftWall);

    const rightWallBottom = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, 1, depth),
        wallMaterial
    );
    rightWallBottom.position.set(width / 2, 0.6, 0);
    officeGroup.add(rightWallBottom);

    const rightWallTop = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, 0.8, depth),
        wallMaterial
    );
    rightWallTop.position.set(width / 2, height - 0.3, 0);
    officeGroup.add(rightWallTop);

    const windowHeight = height - 1.8;
    const rightWindow = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, windowHeight, depth - 0.4),
        glassMaterial
    );
    rightWindow.position.set(width / 2, 1.1 + windowHeight / 2, 0);
    officeGroup.add(rightWindow);

    const doorWidth = 1;
    const doorHeight = 2.2;
    const frontLeftWidth = (width - doorWidth) / 2 - 1;
    const frontRightWidth = (width - doorWidth) / 2 - 1;
    const windowWidth = 1;

    if (frontLeftWidth > 0) {
        const frontLeft = new THREE.Mesh(
            new THREE.BoxGeometry(frontLeftWidth, height, wallThickness),
            wallMaterial
        );
        frontLeft.position.set(-width / 2 + frontLeftWidth / 2, height / 2 + 0.1, depth / 2);
        officeGroup.add(frontLeft);
    }

    const leftWindow = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth, height - 1.5, 0.05),
        glassMaterial
    );
    leftWindow.position.set(-width / 2 + frontLeftWidth + windowWidth / 2, height / 2 + 0.35, depth / 2);
    officeGroup.add(leftWindow);

    if (frontRightWidth > 0) {
        const frontRight = new THREE.Mesh(
            new THREE.BoxGeometry(frontRightWidth, height, wallThickness),
            wallMaterial
        );
        frontRight.position.set(width / 2 - frontRightWidth / 2, height / 2 + 0.1, depth / 2);
        officeGroup.add(frontRight);
    }

    const rightFrontWindow = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth, height - 1.5, 0.05),
        glassMaterial
    );
    rightFrontWindow.position.set(width / 2 - frontRightWidth - windowWidth / 2, height / 2 + 0.35, depth / 2);
    officeGroup.add(rightFrontWindow);

    const frontTop = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth + 0.2, height - doorHeight, wallThickness),
        wallMaterial
    );
    frontTop.position.set(0, doorHeight + (height - doorHeight) / 2 + 0.1, depth / 2);
    officeGroup.add(frontTop);

    const doorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth + 0.15, doorHeight + 0.1, 0.08),
        frameMaterial
    );
    doorFrame.position.set(0, doorHeight / 2 + 0.1, depth / 2 + 0.05);
    officeGroup.add(doorFrame);

    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.6
    });
    const door = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth - 0.1, doorHeight - 0.15, 0.06),
        doorMaterial
    );
    door.position.set(0, doorHeight / 2 + 0.1, depth / 2 + 0.1);
    officeGroup.add(door);

    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0C0,
        metalness: 0.9,
        roughness: 0.2
    });
    const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.05),
        handleMaterial
    );
    handle.position.set(0.35, doorHeight / 2, depth / 2 + 0.15);
    officeGroup.add(handle);

    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width + roofOverhang * 2, 0.15, depth + roofOverhang * 2),
        roofMaterial
    );
    roof.position.set(0, height + 0.175, 0);
    roof.castShadow = true;
    officeGroup.add(roof);

    const roofEdge = new THREE.Mesh(
        new THREE.BoxGeometry(width + roofOverhang * 2 + 0.1, 0.08, 0.1),
        frameMaterial
    );
    roofEdge.position.set(0, height + 0.04, depth / 2 + roofOverhang);
    officeGroup.add(roofEdge);

    const signGeometry = new THREE.BoxGeometry(1.2, 0.4, 0.03);
    const signMaterial = new THREE.MeshLambertMaterial({ color: 0x1565C0 });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, height - 0.3, depth / 2 + 0.15);
    officeGroup.add(sign);

    officeGroup.position.set(x, 0, z);
    officeGroup.rotation.y = rotation;
    officeGroup.userData = {
        isPart: true,
        partType: 'office',
        name: `板房办公室-${window.parts.length + 1}`,
        selected: false,
        hovered: false,
        width: width,
        height: height,
        depth: depth
    };

    scene.add(officeGroup);
    window.parts.push(officeGroup);
    updatePartsStatus();

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }

    return officeGroup;
}

/**
 * 更新零件外观（选中/悬停效果）
 */
function updatePartAppearance(part) {
    if (!part) return;

    part.traverse(child => {
        if (child.type === 'Mesh' && child.material) {
            const material = child.material;
            if (part.userData.selected) {
                material.emissive = new THREE.Color(0x00ff00);
                material.emissiveIntensity = 0.3;
            } else if (part.userData.hovered) {
                material.emissive = new THREE.Color(0xffff00);
                material.emissiveIntensity = 0.2;
            } else {
                material.emissive = new THREE.Color(0x000000);
                material.emissiveIntensity = 0;
            }
        }
    });
}

/**
 * 选择零件
 */
function selectPart(part) {
    if (selectedPart && selectedPart !== part) {
        selectedPart.userData.selected = false;
        updatePartAppearance(selectedPart);
    }

    if (part) {
        part.userData.selected = true;
        updatePartAppearance(part);
        selectedPart = part;
        showPartControlPanel(part);
    } else {
        selectedPart = null;
        hidePartControlPanel();
    }
}

/**
 * 显示零件控制面板
 */
function showPartControlPanel(part) {
    const panel = document.getElementById('selectedPartPanel');
    if (panel) {
        panel.style.display = 'block';

        document.getElementById('partX').value = part.position.x.toFixed(2);
        document.getElementById('partZ').value = part.position.z.toFixed(2);
        document.getElementById('partRotation').value = (part.rotation.y * 180 / Math.PI).toFixed(0);

        const lengthGroup = document.getElementById('partLengthGroup');
        const heightGroup = document.getElementById('partHeightGroup');
        const applySizeBtn = document.getElementById('applyPartSizeBtn');

        if (part.userData.partType === 'wall') {
            lengthGroup.style.display = 'flex';
            heightGroup.style.display = 'block';
            if (applySizeBtn) applySizeBtn.style.display = 'block';
            document.getElementById('partLength').value = part.userData.length || 6;
            document.getElementById('partHeight').value = part.userData.height || 3;
        } else if (part.userData.partType === 'restroom' || part.userData.partType === 'office' || part.userData.partType === 'elevator') {
            lengthGroup.style.display = 'flex';
            heightGroup.style.display = 'block';
            if (applySizeBtn) applySizeBtn.style.display = 'block';
            const defaultWidth = part.userData.partType === 'office' ? 6 : (part.userData.partType === 'elevator' ? 3 : 4);
            const defaultHeight = part.userData.partType === 'elevator' ? 4 : 3;
            document.getElementById('partLength').value = part.userData.width || defaultWidth;
            document.getElementById('partHeight').value = part.userData.height || defaultHeight;
        } else {
            lengthGroup.style.display = 'none';
            heightGroup.style.display = 'none';
            if (applySizeBtn) applySizeBtn.style.display = 'none';
        }

        document.getElementById('selectedPartName').textContent = part.userData.name;
    }
}

/**
 * 隐藏零件控制面板
 */
function hidePartControlPanel() {
    const panel = document.getElementById('selectedPartPanel');
    if (panel) {
        panel.style.display = 'none';
    }
    document.getElementById('selectedPartName').textContent = '无';
}

/**
 * 应用零件位置
 */
function applyPartPosition() {
    if (!selectedPart) return;

    const x = parseFloat(document.getElementById('partX').value) || 0;
    const z = parseFloat(document.getElementById('partZ').value) || 0;

    selectedPart.position.x = x;
    selectedPart.position.z = z;

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }
}

/**
 * 应用零件旋转
 */
function applyPartRotation() {
    if (!selectedPart) return;

    const degrees = parseFloat(document.getElementById('partRotation').value) || 0;
    selectedPart.rotation.y = degrees * Math.PI / 180;

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }
}

/**
 * 旋转零件90度
 */
function rotatePartBy90() {
    if (!selectedPart) return;

    selectedPart.rotation.y += Math.PI / 2;
    document.getElementById('partRotation').value = (selectedPart.rotation.y * 180 / Math.PI).toFixed(0);

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }
}

/**
 * 应用零件尺寸（墙面、厕所、办公室、电梯）
 */
function applyPartSize() {
    if (!selectedPart) return;

    const partType = selectedPart.userData.partType;
    if (partType !== 'wall' && partType !== 'restroom' && partType !== 'office' && partType !== 'elevator') return;

    const length = parseFloat(document.getElementById('partLength').value) || 6;
    const height = parseFloat(document.getElementById('partHeight').value) || 3;

    const pos = selectedPart.position.clone();
    const rot = selectedPart.rotation.y;
    const oldDepth = selectedPart?.userData?.depth;

    deletePart(false);

    let newPart;
    if (partType === 'wall') {
        newPart = createWall(pos.x, pos.z, length, height, rot);
    } else if (partType === 'restroom') {
        const depth = oldDepth || 3;
        newPart = createRestroom(pos.x, pos.z, length, depth, height, rot);
    } else if (partType === 'office') {
        const depth = oldDepth || 4;
        newPart = createOffice(pos.x, pos.z, length, depth, height, rot);
    } else if (partType === 'elevator') {
        const depth = oldDepth || 3;
        newPart = createElevator(pos.x, pos.z, length, depth, height, rot);
    }

    if (newPart) selectPart(newPart);
}

/**
 * 删除选中零件
 */
function deletePart(clearSelection = true) {
    if (!selectedPart) return;

    const scene = window.CoreModule.getScene();
    scene.remove(selectedPart);

    const index = window.parts.indexOf(selectedPart);
    if (index > -1) {
        window.parts.splice(index, 1);
    }

    if (clearSelection) {
        selectedPart = null;
        hidePartControlPanel();
    }

    updatePartsStatus();

    if (window.ControlModule && window.ControlModule.saveConfig) {
        window.ControlModule.saveConfig();
    }
}

/**
 * 进入放置模式
 */
function enterPlacementMode(type) {
    placementMode = type;
    document.body.style.cursor = 'crosshair';

    const hint = document.getElementById('placementHint');
    if (hint) {
        const typeNames = {
            'dock': '出库口',
            'wall': '墙面',
            'staircase': '楼梯口',
            'restroom': '厕所',
            'office': '板房办公室',
            'elevator': '电梯'
        };
        hint.textContent = `点击场景放置${typeNames[type] || type}，按ESC取消`;
        hint.style.display = 'block';
    }
}

/**
 * 退出放置模式
 */
function exitPlacementMode() {
    placementMode = null;
    document.body.style.cursor = 'default';

    const hint = document.getElementById('placementHint');
    if (hint) {
        hint.style.display = 'none';
    }
}

/**
 * 在指定位置放置零件
 */
function placePartAt(x, z) {
    if (!placementMode) return;

    if (placementMode === 'dock') {
        createDock(x, z, 0);
    } else if (placementMode === 'wall') {
        createWall(x, z, 6, 3, 0);
    } else if (placementMode === 'staircase') {
        const stairType = window.currentStairType || 'straight';
        createStaircase(x, z, stairType, 0);
    } else if (placementMode === 'restroom') {
        createRestroom(x, z, 4, 3, 3, 0);
    } else if (placementMode === 'office') {
        createOffice(x, z, 6, 4, 3, 0);
    } else if (placementMode === 'elevator') {
        createElevator(x, z, 3, 3, 4, 0);
    }

    exitPlacementMode();
}

/**
 * 更新零件状态显示
 */
function updatePartsStatus() {
    const dockCount = window.parts.filter(p => p.userData.partType === 'dock').length;
    const wallCount = window.parts.filter(p => p.userData.partType === 'wall').length;
    const staircaseCount = window.parts.filter(p => p.userData.partType === 'staircase').length;
    const restroomCount = window.parts.filter(p => p.userData.partType === 'restroom').length;
    const officeCount = window.parts.filter(p => p.userData.partType === 'office').length;
    const elevatorCount = window.parts.filter(p => p.userData.partType === 'elevator').length;

    const statusEl = document.getElementById('partsCount');
    if (statusEl) {
        const parts = [];
        if (dockCount) parts.push(`出库口: ${dockCount}`);
        if (wallCount) parts.push(`墙面: ${wallCount}`);
        if (staircaseCount) parts.push(`楼梯: ${staircaseCount}`);
        if (restroomCount) parts.push(`厕所: ${restroomCount}`);
        if (officeCount) parts.push(`办公室: ${officeCount}`);
        if (elevatorCount) parts.push(`电梯: ${elevatorCount}`);
        statusEl.textContent = parts.length ? parts.join(', ') : '无';
    }
}

/**
 * 查找点击对象对应的零件
 */
function findPartFromObject(object) {
    let current = object;
    while (current) {
        if (current.userData && current.userData.isPart) {
            return current;
        }
        current = current.parent;
    }
    return null;
}

/**
 * 获取放置模式
 */
function getPlacementMode() {
    return placementMode;
}

/**
 * 获取选中零件
 */
function getSelectedPart() {
    return selectedPart;
}

let lineDrawMode = false;
let lineStartPoint = null;
let previewLine = null;
let previewWall = null;

/**
 * 进入划线放置模式
 */
function enterLineDrawMode() {
    lineDrawMode = true;
    lineStartPoint = null;
    document.body.style.cursor = 'crosshair';

    if (window.ControlModule && window.ControlModule.setView) {
        window.ControlModule.setView('top');
    }

    const camera = window.CoreModule.getCamera();
    const controls = window.CoreModule.getControls();
    controls.target.set(0, 0, 0);
    camera.position.set(0, 30, 0.01);
    camera.lookAt(0, 0, 0);
    controls.update();

    const hint = document.getElementById('placementHint');
    if (hint) {
        hint.innerHTML = '🖌️ <b>划线模式</b>：点击起点 → 点击终点放置墙面，按ESC退出';
        hint.style.display = 'block';
    }
}

/**
 * 退出划线模式
 */
function exitLineDrawMode() {
    lineDrawMode = false;
    lineStartPoint = null;
    document.body.style.cursor = 'default';

    clearPreview();

    const hint = document.getElementById('placementHint');
    if (hint) {
        hint.style.display = 'none';
    }
}

/**
 * 清除预览元素
 */
function clearPreview() {
    const scene = window.CoreModule.getScene();
    if (previewLine) {
        scene.remove(previewLine);
        if (previewLine.geometry) previewLine.geometry.dispose();
        if (previewLine.material) previewLine.material.dispose();
        previewLine = null;
    }
    if (previewWall) {
        scene.remove(previewWall);
        previewWall = null;
    }
}

/**
 * 处理划线模式点击
 */
function handleLineDrawClick(x, z) {
    if (!lineDrawMode) return false;

    if (!lineStartPoint) {
        lineStartPoint = { x, z };

        const hint = document.getElementById('placementHint');
        if (hint) {
            hint.innerHTML = `🖌️ 起点已设置 (${x.toFixed(1)}, ${z.toFixed(1)})，点击设置终点`;
        }

        createStartMarker(x, z);
        return true;
    } else {
        createWallFromLine(lineStartPoint.x, lineStartPoint.z, x, z);

        lineStartPoint = null;
        clearPreview();

        const hint = document.getElementById('placementHint');
        if (hint) {
            hint.innerHTML = '🖌️ 墙面已放置！继续点击画下一条，或按ESC退出';
        }
        return true;
    }
}

/**
 * 创建起点标记
 */
function createStartMarker(x, z) {
    const scene = window.CoreModule.getScene();
    clearPreview();

    const geometry = new THREE.RingGeometry(0.3, 0.5, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00FF00,
        side: THREE.DoubleSide
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(x, 0.05, z);
    scene.add(marker);
    previewLine = marker;
}

/**
 * 更新预览线
 */
function updatePreviewLine(endX, endZ) {
    if (!lineDrawMode || !lineStartPoint) return;

    const scene = window.CoreModule.getScene();

    clearPreview();

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00FF00,
        linewidth: 2
    });
    const points = [
        new THREE.Vector3(lineStartPoint.x, 0.1, lineStartPoint.z),
        new THREE.Vector3(endX, 0.1, endZ)
    ];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    previewLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(previewLine);

    const dx = endX - lineStartPoint.x;
    const dz = endZ - lineStartPoint.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    if (length > 0.5) {
        const wallMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FF00,
            transparent: true,
            opacity: 0.3
        });
        const wallGeometry = new THREE.BoxGeometry(length, 3, 0.2);
        previewWall = new THREE.Mesh(wallGeometry, wallMaterial);
        previewWall.position.set(
            lineStartPoint.x + dx / 2,
            1.5,
            lineStartPoint.z + dz / 2
        );
        previewWall.rotation.y = -angle;
        scene.add(previewWall);
    }
}

/**
 * 从两点创建墙面
 */
function createWallFromLine(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length < 0.5) {
        console.log('墙面太短，未创建');
        return;
    }

    const centerX = x1 + dx / 2;
    const centerZ = z1 + dz / 2;
    const angle = Math.atan2(dz, dx);

    createWall(centerX, centerZ, length, 3, -angle);
}

/**
 * 获取划线模式状态
 */
function isLineDrawMode() {
    return lineDrawMode;
}

/**
 * 获取划线起点
 */
function getLineStartPoint() {
    return lineStartPoint;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (lineDrawMode) {
            exitLineDrawMode();
        } else if (placementMode) {
            exitPlacementMode();
        }
    }
});

/**
 * 获取零件边界（考虑旋转）
 */
function getPartBounds(part) {
    const type = part.userData.partType;
    const pos = part.position;
    const rot = part.rotation.y;

    let width, depth;

    if (type === 'dock') {
        width = part.userData.width || 4;
        depth = part.userData.depth || 0.3;
    } else if (type === 'wall') {
        width = part.userData.length || 6;
        depth = part.userData.thickness || 0.2;
    } else {
        width = 1;
        depth = 1;
    }

    const cos = Math.abs(Math.cos(rot));
    const sin = Math.abs(Math.sin(rot));
    const rotatedWidth = width * cos + depth * sin;
    const rotatedDepth = width * sin + depth * cos;

    return {
        minX: pos.x - rotatedWidth / 2,
        maxX: pos.x + rotatedWidth / 2,
        minZ: pos.z - rotatedDepth / 2,
        maxZ: pos.z + rotatedDepth / 2,
        centerX: pos.x,
        centerZ: pos.z,
        width: rotatedWidth,
        depth: rotatedDepth
    };
}

/**
 * 获取零件在指定位置的边界
 */
function getPartBoundsAtPosition(part, position) {
    const type = part.userData.partType;
    const rot = part.rotation.y;

    let width, depth;

    if (type === 'dock') {
        width = part.userData.width || 4;
        depth = part.userData.depth || 0.3;
    } else if (type === 'wall') {
        width = part.userData.length || 6;
        depth = part.userData.thickness || 0.2;
    } else {
        width = 1;
        depth = 1;
    }

    const cos = Math.abs(Math.cos(rot));
    const sin = Math.abs(Math.sin(rot));
    const rotatedWidth = width * cos + depth * sin;
    const rotatedDepth = width * sin + depth * cos;

    return {
        minX: position.x - rotatedWidth / 2,
        maxX: position.x + rotatedWidth / 2,
        minZ: position.z - rotatedDepth / 2,
        maxZ: position.z + rotatedDepth / 2,
        centerX: position.x,
        centerZ: position.z,
        width: rotatedWidth,
        depth: rotatedDepth
    };
}

/**
 * 零件吸附功能
 */
function applyPartSnap(draggingPart, newPosition) {
    if (window.MeasureModule && !window.MeasureModule.isSnapEnabled()) {
        return newPosition;
    }

    const snapThreshold = 0.3;
    const dragBounds = getPartBoundsAtPosition(draggingPart, newPosition);

    let snappedX = newPosition.x;
    let snappedZ = newPosition.z;
    let snapped = false;

    for (const part of window.parts) {
        if (part === draggingPart) continue;

        const targetBounds = getPartBounds(part);

        if (Math.abs(dragBounds.minX - targetBounds.maxX) < snapThreshold) {
            snappedX = targetBounds.maxX + dragBounds.width / 2;
            snapped = true;
        }
        else if (Math.abs(dragBounds.maxX - targetBounds.minX) < snapThreshold) {
            snappedX = targetBounds.minX - dragBounds.width / 2;
            snapped = true;
        }
        else if (Math.abs(dragBounds.minX - targetBounds.minX) < snapThreshold) {
            snappedX = targetBounds.minX + dragBounds.width / 2;
            snapped = true;
        }
        else if (Math.abs(dragBounds.maxX - targetBounds.maxX) < snapThreshold) {
            snappedX = targetBounds.maxX - dragBounds.width / 2;
            snapped = true;
        }

        if (Math.abs(dragBounds.minZ - targetBounds.maxZ) < snapThreshold) {
            snappedZ = targetBounds.maxZ + dragBounds.depth / 2;
            snapped = true;
        }
        else if (Math.abs(dragBounds.maxZ - targetBounds.minZ) < snapThreshold) {
            snappedZ = targetBounds.minZ - dragBounds.depth / 2;
            snapped = true;
        }
        else if (Math.abs(dragBounds.minZ - targetBounds.minZ) < snapThreshold) {
            snappedZ = targetBounds.minZ + dragBounds.depth / 2;
            snapped = true;
        }
        else if (Math.abs(dragBounds.maxZ - targetBounds.maxZ) < snapThreshold) {
            snappedZ = targetBounds.maxZ - dragBounds.depth / 2;
            snapped = true;
        }
    }

    if (window.ShelfModule) {
        const shelves = window.ShelfModule.getShelves();
        for (const shelf of shelves) {
            const shelfWidth = shelf.userData.width || 2;
            const shelfDepth = shelf.userData.depth || 1;
            const pos = shelf.position;

            const targetBounds = {
                minX: pos.x - shelfWidth / 2,
                maxX: pos.x + shelfWidth / 2,
                minZ: pos.z - shelfDepth / 2,
                maxZ: pos.z + shelfDepth / 2
            };

            if (Math.abs(dragBounds.minX - targetBounds.maxX) < snapThreshold) {
                snappedX = targetBounds.maxX + dragBounds.width / 2;
                snapped = true;
            } else if (Math.abs(dragBounds.maxX - targetBounds.minX) < snapThreshold) {
                snappedX = targetBounds.minX - dragBounds.width / 2;
                snapped = true;
            }

            if (Math.abs(dragBounds.minZ - targetBounds.maxZ) < snapThreshold) {
                snappedZ = targetBounds.maxZ + dragBounds.depth / 2;
                snapped = true;
            } else if (Math.abs(dragBounds.maxZ - targetBounds.minZ) < snapThreshold) {
                snappedZ = targetBounds.minZ - dragBounds.depth / 2;
                snapped = true;
            }
        }
    }

    if (snapped) {
        return new THREE.Vector3(snappedX, newPosition.y, snappedZ);
    }
    return newPosition;
}

window.PartsModule = {
    createDock,
    createWall,
    createStaircase,
    createRestroom,
    createOffice,
    createElevator,
    updatePartAppearance,
    selectPart,
    deletePart,
    enterPlacementMode,
    exitPlacementMode,
    placePartAt,
    getPlacementMode,
    getSelectedPart,
    findPartFromObject,
    applyPartPosition,
    applyPartRotation,
    rotatePartBy90,
    applyPartSize,
    getPartBounds,
    applyPartSnap,
    enterLineDrawMode,
    exitLineDrawMode,
    handleLineDrawClick,
    updatePreviewLine,
    isLineDrawMode,
    getLineStartPoint
};

window.createDock = createDock;
window.createWall = createWall;
window.createStaircase = createStaircase;
window.createRestroom = createRestroom;
window.createOffice = createOffice;
window.createElevator = createElevator;
