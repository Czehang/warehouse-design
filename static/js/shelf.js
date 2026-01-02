
/**
 * 创建重型横梁式货架模型
 * 特点：粗壮立柱、橙色横梁、托盘货物
 */
function createShelf(width = 2, height = 3, depth = 1, x = 0, y = 0) {
    const scene = window.CoreModule.getScene();
    const shelfGroup = new THREE.Group();
    const shelfName = `货架-${window.shelves.length + 1}`;
    shelfGroup.userData = {
        isShelf: true,
        selected: false,
        hovered: false,
        name: shelfName,
        width, height, depth,
        length: width,
        cells: [],
        goods: []
    };

    shelfGroup.position.set(x - width / 2 + 0.5, height / 2, y - depth / 2 - 0.5);

    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x0066CC,
        roughness: 0.3,
        metalness: 0.9
    });

    const beamMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF6B00,
        roughness: 0.4,
        metalness: 0.8
    });

    const frameGroup = new THREE.Group();

    const pillarWidth = 0.1;
    const pillarDepth = 0.08;

    const pillarGeometry = new THREE.BoxGeometry(pillarWidth, height, pillarDepth);
    const pillarPositions = [
        [-depth / 2 + pillarWidth / 2, 0, -width / 2 + pillarDepth / 2],
        [depth / 2 - pillarWidth / 2, 0, -width / 2 + pillarDepth / 2],
        [-depth / 2 + pillarWidth / 2, 0, width / 2 - pillarDepth / 2],
        [depth / 2 - pillarWidth / 2, 0, width / 2 - pillarDepth / 2]
    ];

    pillarPositions.forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(pos[0], pos[1], pos[2]);
        pillar.castShadow = true;
        frameGroup.add(pillar);

        addPillarHoles(pillar, height, pillarMaterial);
    });

    const config = window.ControlModule.getConfig() || {};
    const globalParams = config.global_params || {};
    const layerCount = globalParams.layer_count || 5;
    const beamHeight = 0.12;
    const beamWidth = 0.06;

    for (let i = 0; i < layerCount; i++) {
        const layerY = -height / 2 + (height / layerCount) * (i + 1);

        const frontBeamGeometry = new THREE.BoxGeometry(depth - pillarWidth * 2, beamHeight, beamWidth);
        const frontBeam = new THREE.Mesh(frontBeamGeometry, beamMaterial);
        frontBeam.position.set(0, layerY - beamHeight / 2, -width / 2 + pillarDepth / 2 + beamWidth / 2);
        frontBeam.castShadow = true;
        frameGroup.add(frontBeam);

        const backBeam = new THREE.Mesh(frontBeamGeometry, beamMaterial);
        backBeam.position.set(0, layerY - beamHeight / 2, width / 2 - pillarDepth / 2 - beamWidth / 2);
        backBeam.castShadow = true;
        frameGroup.add(backBeam);

        addBeamConnectors(frameGroup, layerY, beamHeight, depth, width, pillarWidth, pillarDepth, beamMaterial);
    }


    const bottomBeamGeometry = new THREE.BoxGeometry(depth - pillarWidth * 2, 0.04, 0.04);
    const bottomBeamFront = new THREE.Mesh(bottomBeamGeometry, pillarMaterial);
    bottomBeamFront.position.set(0, -height / 2 + 0.15, -width / 2 + pillarDepth / 2);
    frameGroup.add(bottomBeamFront);

    const bottomBeamBack = new THREE.Mesh(bottomBeamGeometry, pillarMaterial);
    bottomBeamBack.position.set(0, -height / 2 + 0.15, width / 2 - pillarDepth / 2);
    frameGroup.add(bottomBeamBack);

    shelfGroup.add(frameGroup);

    const layerBoardGroup = new THREE.Group();

    const steelBoardMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF6B00,
        roughness: 0.35,
        metalness: 0.8
    });

    const boardWidth = width - pillarDepth * 2;
    const boardDepth = depth - pillarWidth * 2;
    const boardThickness = 0.015;

    for (let layer = 0; layer < layerCount; layer++) {
        const layerY = -height / 2 + (height / layerCount) * (layer + 1);

        const boardGeometry = new THREE.BoxGeometry(boardDepth, boardThickness, boardWidth);
        const steelBoard = new THREE.Mesh(boardGeometry, steelBoardMaterial);
        steelBoard.position.set(0, layerY - 0.06, 0);
        steelBoard.castShadow = true;
        steelBoard.receiveShadow = true;
        layerBoardGroup.add(steelBoard);

        const crossBeamCount = 2;
        const crossBeamGeometry = new THREE.BoxGeometry(0.05, 0.06, boardWidth);
        for (let cb = 0; cb < crossBeamCount; cb++) {
            const beamX = -boardDepth / 2 + boardDepth / (crossBeamCount + 1) * (cb + 1);
            const crossBeam = new THREE.Mesh(crossBeamGeometry, beamMaterial);
            crossBeam.position.set(beamX, layerY - 0.10, 0);
            crossBeam.castShadow = true;
            layerBoardGroup.add(crossBeam);
        }

        shelfGroup.userData.cells.push({
            layer: layer,
            hasBoard: true
        });
    }

    shelfGroup.add(layerBoardGroup);

    addHeavyDutySignSystem(shelfGroup, width, height, depth, layerCount);

    scene.add(shelfGroup);
    window.shelves.push(shelfGroup);
    return shelfGroup;
}

/**
 * 添加立柱孔洞装饰
 */
function addPillarHoles(pillar, height, material) {
    const holeCount = Math.floor(height / 0.1);
    for (let i = 1; i < holeCount; i++) {
        const holeGeometry = new THREE.BoxGeometry(0.03, 0.02, 0.12);
        const holeMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.9,
            metalness: 0.1
        });
        const hole = new THREE.Mesh(holeGeometry, holeMaterial);
        hole.position.set(0, -height / 2 + i * 0.1, 0);
        pillar.add(hole);
    }
}

/**
 * 添加横梁连接件
 */
function addBeamConnectors(frameGroup, layerY, beamHeight, depth, width, pillarWidth, pillarDepth, material) {
    const connectorGeometry = new THREE.BoxGeometry(0.03, beamHeight * 1.5, 0.04);
    const positions = [
        [-depth / 2 + pillarWidth, layerY - beamHeight / 2, -width / 2 + pillarDepth / 2],
        [depth / 2 - pillarWidth, layerY - beamHeight / 2, -width / 2 + pillarDepth / 2],
        [-depth / 2 + pillarWidth, layerY - beamHeight / 2, width / 2 - pillarDepth / 2],
        [depth / 2 - pillarWidth, layerY - beamHeight / 2, width / 2 - pillarDepth / 2]
    ];

    positions.forEach(pos => {
        const connector = new THREE.Mesh(connectorGeometry, material);
        connector.position.set(pos[0], pos[1], pos[2]);
        frameGroup.add(connector);
    });
}

/**
 * 添加斜撑
 */
function addDiagonalBraces(frameGroup, height, depth, width, pillarWidth, pillarDepth, material) {
    const braceWidth = 0.03;
    const braceGeometry = new THREE.BoxGeometry(braceWidth, height * 0.3, braceWidth);

    const leftBrace1 = new THREE.Mesh(braceGeometry, material);
    leftBrace1.position.set(-depth / 2 + pillarWidth / 2, 0, 0);
    leftBrace1.rotation.z = Math.PI / 6;
    frameGroup.add(leftBrace1);

    const leftBrace2 = new THREE.Mesh(braceGeometry, material);
    leftBrace2.position.set(-depth / 2 + pillarWidth / 2, 0, 0);
    leftBrace2.rotation.z = -Math.PI / 6;
    frameGroup.add(leftBrace2);

    const rightBrace1 = new THREE.Mesh(braceGeometry, material);
    rightBrace1.position.set(depth / 2 - pillarWidth / 2, 0, 0);
    rightBrace1.rotation.z = Math.PI / 6;
    frameGroup.add(rightBrace1);

    const rightBrace2 = new THREE.Mesh(braceGeometry, material);
    rightBrace2.position.set(depth / 2 - pillarWidth / 2, 0, 0);
    rightBrace2.rotation.z = -Math.PI / 6;
    frameGroup.add(rightBrace2);
}

/**
 * 创建钢板托盘
 */
function createPallet(palletWidth, palletDepth) {
    const palletGroup = new THREE.Group();

    const steelMaterial = new THREE.MeshStandardMaterial({
        color: 0x6E7B8B,
        roughness: 0.3,
        metalness: 0.9
    });

    const mainPlate = new THREE.Mesh(
        new THREE.BoxGeometry(palletDepth, 0.03, palletWidth),
        steelMaterial
    );
    mainPlate.position.y = 0.06;
    mainPlate.castShadow = true;
    palletGroup.add(mainPlate);

    const ribGeometry = new THREE.BoxGeometry(palletDepth, 0.02, 0.05);
    const ribPositions = [
        [0, 0.025, -palletWidth / 3],
        [0, 0.025, 0],
        [0, 0.025, palletWidth / 3]
    ];

    ribPositions.forEach(pos => {
        const rib = new THREE.Mesh(ribGeometry, steelMaterial);
        rib.position.set(pos[0], pos[1], pos[2]);
        palletGroup.add(rib);
    });

    return palletGroup;
}

/**
 * 创建托盘上的货物
 */
function createPalletGoods(goodsWidth, goodsDepth, layer) {
    const goodsGroup = new THREE.Group();

    const goodsTypes = [
        { color: 0x8B4513, name: '纸箱堆', height: 0.4 + Math.random() * 0.4 },
        { color: 0x4169E1, name: '塑料周转箱', height: 0.3 + Math.random() * 0.3 },
        { color: 0x228B22, name: '木箱', height: 0.5 + Math.random() * 0.3 },
        { color: 0xDC143C, name: '危险品', height: 0.4 },
        { color: 0x708090, name: '金属件', height: 0.35 }
    ];

    const goodsType = goodsTypes[Math.floor(Math.random() * goodsTypes.length)];

    const goodsMaterial = new THREE.MeshStandardMaterial({
        color: goodsType.color,
        roughness: 0.7,
        metalness: 0.1
    });

    const mainGoods = new THREE.Mesh(
        new THREE.BoxGeometry(goodsDepth * 0.9, goodsType.height, goodsWidth * 0.9),
        goodsMaterial
    );
    mainGoods.position.y = goodsType.height / 2;
    mainGoods.castShadow = true;
    mainGoods.userData = {
        isGoods: true,
        type: goodsType.name,
        layer: layer
    };
    goodsGroup.add(mainGoods);

    if (goodsType.name === '纸箱堆') {
        addStackedBoxes(goodsGroup, goodsDepth, goodsWidth, goodsType.height);
    }

    return goodsGroup;
}

/**
 * 添加堆叠纸箱效果
 */
function addStackedBoxes(group, goodsDepth, goodsWidth, baseHeight) {
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x5C4033 });

    const boxHeight = baseHeight / 3;
    for (let i = 1; i < 3; i++) {
        const points = [
            new THREE.Vector3(-goodsDepth * 0.45, boxHeight * i, -goodsWidth * 0.45),
            new THREE.Vector3(goodsDepth * 0.45, boxHeight * i, -goodsWidth * 0.45),
            new THREE.Vector3(goodsDepth * 0.45, boxHeight * i, goodsWidth * 0.45),
            new THREE.Vector3(-goodsDepth * 0.45, boxHeight * i, goodsWidth * 0.45),
            new THREE.Vector3(-goodsDepth * 0.45, boxHeight * i, -goodsWidth * 0.45)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, lineMaterial);
        group.add(line);
    }
}

/**
 * 添加重型货架标识系统
 * 以前视图为主视觉，标识牌贴紧立柱
 */
function addHeavyDutySignSystem(shelfGroup, width, height, depth, layerCount) {
    const signGroup = new THREE.Group();

    const pillarWidth = 0.1;
    const pillarDepth = 0.08;

    const leftFrontPillarX = -depth / 2 + pillarWidth / 2;
    const leftFrontPillarZ = width / 2 - pillarDepth / 2;

    const mainSignGeometry = new THREE.BoxGeometry(0.8, 0.35, 0.015);
    const mainSignMaterial = new THREE.MeshLambertMaterial({
        color: 0x1E90FF,
        transparent: true,
        opacity: 0.95
    });
    const mainSign = new THREE.Mesh(mainSignGeometry, mainSignMaterial);
    mainSign.position.set(
        leftFrontPillarX,
        height / 2 - 0.2,
        leftFrontPillarZ + pillarDepth / 2 + 0.008
    );
    mainSign.userData = {
        isSign: true,
        level: 'main',
        zone: 'A区',
        shelfId: window.shelves.length + 1
    };
    signGroup.add(mainSign);

    for (let layer = 0; layer < layerCount; layer++) {
        const layerY = -height / 2 + (height / layerCount) * (layer + 0.5);

        const layerSignGeometry = new THREE.BoxGeometry(0.35, 0.15, 0.015);
        const layerSignMaterial = new THREE.MeshLambertMaterial({
            color: 0x32CD32,
            transparent: true,
            opacity: 0.9
        });
        const layerSign = new THREE.Mesh(layerSignGeometry, layerSignMaterial);
        layerSign.position.set(
            leftFrontPillarX,
            layerY,
            leftFrontPillarZ + pillarDepth / 2 + 0.008
        );
        layerSign.userData = {
            isSign: true,
            level: 'layer',
            layer: layer + 1,
            shelfId: window.shelves.length + 1
        };
        signGroup.add(layerSign);
    }

    addSignTextures(signGroup);

    shelfGroup.add(signGroup);
}

/**
 * 添加标识牌纹理
 */
function addSignTextures(signSystemGroup) {
    signSystemGroup.children.forEach(sign => {
        if (sign.userData.isSign) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 512;
            canvas.height = 256;

            let bgColor, textColor, fontSize, content, borderColor;

            switch (sign.userData.level) {
                case 'main':
                    bgColor = '#000080';
                    textColor = '#FFFF00';
                    borderColor = '#FFFF00';
                    fontSize = 'bold 56px Arial Black';
                    content = [`A区-${sign.userData.shelfId}号`, 'WAREHOUSE A'];
                    break;
                case 'layer':
                    bgColor = '#006400';
                    textColor = '#FFFFFF';
                    borderColor = '#FFFFFF';
                    fontSize = 'bold 42px Arial Black';
                    content = [`${sign.userData.layer}层`, `LAYER ${sign.userData.layer}`];
                    break;
                default:
                    return;
            }

            context.fillStyle = bgColor;
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.strokeStyle = borderColor;
            context.lineWidth = 8;
            context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

            context.fillStyle = textColor;
            context.font = fontSize;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(content[0], canvas.width / 2, canvas.height * 0.4);

            context.font = fontSize.replace('bold', 'normal').replace(/\d+px/, (size) => `${parseInt(size) * 0.6}px`);
            context.fillText(content[1], canvas.width / 2, canvas.height * 0.7);

            const texture = new THREE.CanvasTexture(canvas);
            sign.material.map = texture;
            sign.material.side = THREE.DoubleSide;
        }
    });
}

/**
 * 更新货架外观（选中/悬停效果）
 */
function updateShelfAppearance(shelf) {
    const frameGroup = shelf.children.find(child => child.type === 'Group');
    if (!frameGroup || !frameGroup.children || frameGroup.children.length === 0) {
        return;
    }

    frameGroup.traverse(child => {
        if (child.type === 'Mesh' && child.material) {
            const material = child.material;
            if (shelf.userData.selected) {
                material.emissive = new THREE.Color(0x00ff00);
                material.emissiveIntensity = 0.3;
            } else if (shelf.userData.hovered) {
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
 * 获取所有货架
 */
function getShelves() {
    return window.shelves;
}

/**
 * 设置货架列表
 */
function setShelves(newShelves) {
    window.shelves = newShelves;
}

/**
 * 清除所有货架
 */
function clearShelves() {
    const scene = window.CoreModule.getScene();
    window.shelves.forEach(shelf => scene.remove(shelf));
    window.shelves = [];
}

window.ShelfModule = {
    createShelf,
    updateShelfAppearance,
    getShelves,
    setShelves,
    clearShelves
};