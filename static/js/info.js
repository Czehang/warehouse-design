
/**
 * 显示货架详细信息
 */
function showShelfInfo(shelf) {
    const shelves = window.ShelfModule.getShelves();
    const config = window.ControlModule.getConfig();
    const infoPanel = document.getElementById('shelfInfo');
    infoPanel.classList.add('visible');

    const shelfIndex = window.shelves.indexOf(shelf) + 1;
    const totalCells = shelf.userData.cells?.length || 0;
    const occupiedCells = shelf.userData.goods?.length || 0;

    infoPanel.innerHTML = `
        <div class="info-title">🏭 工业货架 #${shelfIndex}</div>
        <div class="info-content">
            <div class="info-row">
                <span class="info-label">📍 位置坐标:</span>
                <span class="info-value">X:${(shelf.position.x + shelf.userData.depth / 2).toFixed(2)} Y:${(shelf.position.z - shelf.userData.width / 2).toFixed(2)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">📐 结构尺寸:</span>
                <span class="info-value">${shelf.userData.length}×${shelf.userData.height}×${shelf.userData.depth}米</span>
            </div>
            <div class="info-row">
                <span class="info-label">🏗️ 层数:</span>
                <span class="info-value">${window.config.global_params.layer_count}层</span>
            </div>
            <div class="info-row">
                <span class="info-label">📦 总格口:</span>
                <span class="info-value">${totalCells}个</span>
            </div>
            <div class="info-row">
                <span class="info-label">✅ 已占用:</span>
                <span class="info-value">${occupiedCells}个 (${(occupiedCells / totalCells * 100).toFixed(1)}%)</span>
            </div>
            <div class="info-row">
                <span class="info-label">❌ 空闲:</span>
                <span class="info-value">${totalCells - occupiedCells}个</span>
            </div>
            <div class="info-row">
                <span class="info-label">📋 货物类型:</span>
                <span class="info-value">${shelf.userData.goods?.map(g => g.userData.type).join(', ') || '无'}</span>
            </div>
        </div>
    `;

    document.getElementById('selectedShelf').textContent = `工业货架 #${shelfIndex}`;
}

/**
 * 显示货物详细信息
 */
function showGoodsInfo(goods) {
    const infoPanel = document.getElementById('shelfInfo');
    infoPanel.classList.add('visible');

    const goodsType = goods.userData.type;
    const goodsWeight = goods.userData.weight;
    const position = goods.position;

    const typeIcons = {
        '纸箱': '📦',
        '塑料箱': '🧰',
        '木箱': '📦',
        '危险品': '⚠️',
        '金属件': '🔧'
    };

    infoPanel.innerHTML = `
        <div class="info-title">${typeIcons[goodsType] || '📦'} ${goodsType}</div>
        <div class="info-content">
            <div class="info-row">
                <span class="info-label">📍 位置:</span>
                <span class="info-value">X:${position.x.toFixed(2)} Y:${position.y.toFixed(2)} Z:${position.z.toFixed(2)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">⚖️ 重量:</span>
                <span class="info-value">${goodsWeight}</span>
            </div>
            <div class="info-row">
                <span class="info-label">📐 尺寸:</span>
                <span class="info-value">${goods.scale.x.toFixed(1)}×${goods.scale.y.toFixed(1)}×${goods.scale.z.toFixed(1)}米</span>
            </div>
            <div class="info-row">
                <span class="info-label">🎨 颜色:</span>
                <span class="info-value" style="color: #${goods.material.color.getHexString()}">█</span>
            </div>
            <div class="info-row">
                <span class="info-label">📋 状态:</span>
                <span class="info-value">已存储</span>
            </div>
        </div>
    `;
}

/**
 * 显示格口详细信息
 */
function showCellInfo(sign) {
    const infoPanel = document.getElementById('shelfInfo');
    infoPanel.classList.add('visible');

    const cellId = sign.userData.cellId || '';
    if (!cellId || typeof cellId !== 'string') {
        infoPanel.innerHTML = `
            <div class="info-title">🏷️ 格口标识</div>
            <div class="info-content">
                <div class="info-row">
                    <span class="info-label">❌ 错误:</span>
                    <span class="info-value">无效的格口标识</span>
                </div>
            </div>
        `;
        return;
    }

    const parts = cellId.split('-');
    if (parts.length < 2) {
        infoPanel.innerHTML = `
            <div class="info-title">🏷️ 格口标识</div>
            <div class="info-content">
                <div class="info-row">
                    <span class="info-label">❌ 错误:</span>
                    <span class="info-value">格口标识格式错误</span>
                </div>
            </div>
        `;
        return;
    }

    const [layer, cell] = parts;

    let hasGoods = false;
    let goodsType = '无';

    const shelves = window.ShelfModule.getShelves();
    shelves.forEach(shelf => {
        shelf.userData.goods.forEach(goods => {
            const goodsPos = goods.position;
            const goodsLayer = Math.floor(layer);
            if (Math.abs(goodsPos.y - (-shelf.userData.height / 2 + shelf.userData.height / 5 * (parseInt(layer) + 0.5))) < 0.1) {
                hasGoods = true;
                goodsType = goods.userData.type;
            }
        });
    });

    infoPanel.innerHTML = `
        <div class="info-title">🏷️ 格口标识</div>
        <div class="info-content">
            <div class="info-row">
                <span class="info-label">🏷️ 格口编号:</span>
                <span class="info-value">${cellId}</span>
            </div>
            <div class="info-row">
                <span class="info-label">📊 层号:</span>
                <span class="info-value">${parseInt(layer) + 1}层</span>
            </div>
            <div class="info-row">
                <span class="info-label">📍 列号:</span>
                <span class="info-value">${parseInt(cell) + 1}列</span>
            </div>
            <div class="info-row">
                <span class="info-label">📦 货物状态:</span>
                <span class="info-value">${hasGoods ? goodsType : '空闲'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">🔍 操作:</span>
                <span class="info-value">点击查看详情</span>
            </div>
        </div>
    `;
}

/**
 * 隐藏信息面板
 */
function hideInfoPanel() {
    const infoPanel = document.getElementById('shelfInfo');
    infoPanel.classList.remove('visible');
}

/**
 * 更新统计信息显示
 */
function updateStatisticsDisplay(stats) {
    if (stats) {
        document.getElementById('totalCells').textContent = stats.total_cells;
        document.getElementById('occupiedCells').textContent = stats.occupied_cells;
        document.getElementById('freeCells').textContent = stats.free_cells;
    }
}

/**
 * 显示加载状态
 */
function showLoading(message = '加载中...') {
    const infoPanel = document.getElementById('shelfInfo');
    infoPanel.classList.add('visible');
    infoPanel.innerHTML = `
        <div class="info-title">⏳ 加载中</div>
        <div class="info-content">
            <div class="info-row">
                <span class="info-value">${message}</span>
            </div>
        </div>
    `;
}

/**
 * 显示错误信息
 */
function showError(message) {
    const infoPanel = document.getElementById('shelfInfo');
    infoPanel.classList.add('visible');
    infoPanel.innerHTML = `
        <div class="info-title">❌ 错误</div>
        <div class="info-content">
            <div class="info-row">
                <span class="info-value">${message}</span>
            </div>
        </div>
    `;
}

/**
 * 显示成功信息
 */
function showSuccess(message) {
    const infoPanel = document.getElementById('shelfInfo');
    infoPanel.classList.add('visible');
    infoPanel.innerHTML = `
        <div class="info-title">✅ 成功</div>
        <div class="info-content">
            <div class="info-row">
                <span class="info-value">${message}</span>
            </div>
        </div>
    `;

    setTimeout(() => {
        hideInfoPanel();
    }, 3000);
}

window.InfoModule = {
    showShelfInfo,
    showGoodsInfo,
    showCellInfo,
    hideInfoPanel,
    updateStatisticsDisplay,
    showLoading,
    showError,
    showSuccess
};