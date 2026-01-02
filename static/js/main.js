let shelves = [];
let config = {};

/**
 * 初始化应用
 */
function initializeApp() {
    try {
        window.CoreModule.initThreeJS();

        setTimeout(() => {
            console.log('使用事件系统');
            window.EventsModule.initEventListeners();
        }, 1000);

        window.ControlModule.loadConfig();

        setTimeout(() => {
            if (window.CargoModule && window.CargoModule.loadCargosFromDb) {
                window.CargoModule.loadCargosFromDb();
            }
        }, 2000);

        setupTimers();

        console.log('仓库设计系统初始化完成');
    } catch (error) {
        console.error('应用初始化失败:', error);
        if (window.InfoModule) {
            window.InfoModule.showError('应用初始化失败: ' + error.message);
        }
    }
}

/**
 * 设置定时任务
 */
function setupTimers() {

    setInterval(() => {
        window.ControlModule.updateStatistics();
    }, 10000);
}

/**
 * 全局API访问函数
 */
window.WarehouseAPI = {
    getShelves: () => window.ShelfModule.getShelves(),
    createShelf: (length, height, depth, x, z) => window.ShelfModule.createShelf(length, height, depth, x, z),

    getConfig: () => window.ControlModule.getConfig(),
    loadConfig: () => window.ControlModule.loadConfig(),
    saveConfig: () => window.ControlModule.saveConfig(),

    setView: (viewType) => window.ControlModule.setView(viewType),
    resetView: () => window.ControlModule.resetView(),
    zoomIn: () => window.ControlModule.zoomIn(),
    zoomOut: () => window.ControlModule.zoomOut(),

    exportConfig: () => window.ControlModule.exportConfig(),
    importConfig: () => window.ControlModule.importConfig(),

    initialize: initializeApp
};

/**
 * 兼容旧的全局函数
 */
window.shelves = shelves;
window.config = config;

document.addEventListener('DOMContentLoaded', initializeApp);

window.initializeShelves = () => window.ControlModule.initializeShelves();
window.addShelf = () => window.ControlModule.addShelf();
window.applyPosition = () => window.ControlModule.applyPosition();
window.applyDimensions = () => window.ControlModule.applyDimensions();
window.alignShelf = (alignment) => window.ControlModule.alignShelf(alignment);
window.distributeShelves = (direction) => window.ControlModule.distributeShelves(direction);
window.rotateShelf = () => window.ControlModule.rotateShelf();
window.deleteShelf = () => window.ControlModule.deleteShelf();
window.setView = (viewType) => window.ControlModule.setView(viewType);
window.zoomIn = () => window.ControlModule.zoomIn();
window.zoomOut = () => window.ControlModule.zoomOut();
window.resetView = () => window.ControlModule.resetView();
window.exportConfig = () => window.ControlModule.exportConfig();
window.importConfig = () => window.ControlModule.importConfig();
window.applyGlobalConfig = () => window.ControlModule.applyGlobalConfig();
window.toggleSnap = () => window.MeasureModule && window.MeasureModule.toggleSnap();
window.clearSelection = () => window.EventsModule && window.EventsModule.clearAllSelections();
window.applyCellCount = () => window.ControlModule && window.ControlModule.applyCellCount();

window.startPlacePart = function () {
    const type = document.getElementById('partType').value;
    if (window.PartsModule) {
        window.PartsModule.enterPlacementMode(type);
    }
};

window.startDrawWallLine = function () {
    if (window.PartsModule && window.PartsModule.enterLineDrawMode) {
        window.PartsModule.enterLineDrawMode();
    }
};

window.toggleAisleMode = function () {
    if (window.AisleModule) {
        if (window.AisleModule.isAisleMode()) {
            window.AisleModule.exitAisleMode();
        } else {
            window.AisleModule.enterAisleMode();
        }
    }
};

window.deleteAislePoint = function () {
    if (window.AisleModule && window.AisleModule.deleteLastPoint) {
        window.AisleModule.deleteLastPoint();
    }
};

window.clearAllAislePaths = function () {
    if (window.AisleModule && window.AisleModule.clearCurrentPaths) {
        window.AisleModule.clearCurrentPaths();
    }
};