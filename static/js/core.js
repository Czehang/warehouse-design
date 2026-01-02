let scene, camera, renderer, controls;
let raycaster, mouse;

/**
 * 初始化Three.js场景
 */
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('renderCanvas'), antialias: true });
    renderer.setSize(window.innerWidth - 300, window.innerHeight - 80);
    renderer.shadowMap.enabled = true;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    console.log('OrbitControls initialized:', controls);
    console.log('Controls target:', controls.target);
    console.log('Controls enabled:', controls.enabled);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    gridHelper.name = 'environmentGrid';
    gridHelper.visible = false;
    scene.add(gridHelper);

    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.name = 'environmentGround';
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.name = 'environmentAxes';
    scene.add(axesHelper);

    animate();

    window.addEventListener('resize', onWindowResize);
}

/**
 * 动画循环
 */
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    if (window.EventsModule && window.EventsModule.updateCameraMovement) {
        window.EventsModule.updateCameraMovement();
    }
    
    renderer.render(scene, camera);
}

/**
 * 窗口大小调整处理
 */
function onWindowResize() {
    camera.aspect = (window.innerWidth - 300) / (window.innerHeight - 80);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - 300, window.innerHeight - 80);
}

/**
 * 获取场景对象
 */
function getScene() {
    return scene;
}

/**
 * 获取相机对象
 */
function getCamera() {
    return camera;
}

/**
 * 获取渲染器对象
 */
function getRenderer() {
    return renderer;
}

/**
 * 获取控制器对象
 */
function getControls() {
    return controls;
}

/**
 * 获取射线投射器
 */
function getRaycaster() {
    return raycaster;
}

/**
 * 获取鼠标向量
 */
function getMouse() {
    return mouse;
}

window.CoreModule = {
    initThreeJS,
    animate,
    onWindowResize,
    getScene,
    getCamera,
    getRenderer,
    getControls,
    getRaycaster,
    getMouse
};