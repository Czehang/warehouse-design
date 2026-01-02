
/**
 * SKU列表数据
 */
let skuList = [];

/**
 * 当前编辑的SKU ID
 */
let editingSkuId = null;

/**
 * 当前上传的图片信息
 */
let uploadedImage = {
    image: '',
    thumbnail: ''
};

/**
 * 当前上传的多面贴图信息
 */
let uploadedTextures = {
    texture_top: '',
    texture_bottom: '',
    texture_front: '',
    texture_back: '',
    texture_left: '',
    texture_right: ''
};

/**
 * 打开SKU配置模态框
 */
async function openSkuModal() {
    const modal = document.getElementById('skuConfigModal');
    if (modal) {
        modal.classList.add('visible');
        await loadSkuList();
        clearSkuForm();
    }
}

/**
 * 关闭SKU配置模态框
 */
function closeSkuModal() {
    const modal = document.getElementById('skuConfigModal');
    if (modal) {
        modal.classList.remove('visible');
    }
    clearSkuForm();
}

/**
 * 加载SKU列表
 */
async function loadSkuList() {
    try {
        const response = await fetch('/api/skus');
        if (response.ok) {
            skuList = await response.json();
            renderSkuList();
        }
    } catch (error) {
        console.error('加载SKU列表失败:', error);
    }
}

/**
 * 渲染SKU列表
 */
function renderSkuList() {
    const listContainer = document.getElementById('skuListContainer');
    if (!listContainer) return;

    if (skuList.length === 0) {
        listContainer.innerHTML = '<div class="sku-empty">暂无SKU数据，请添加新的货物种类</div>';
        return;
    }

    listContainer.innerHTML = skuList.map(sku => `
        <div class="sku-item" data-id="${sku.id}">
            <div class="sku-thumbnail">
                ${sku.thumbnail
            ? `<img src="/static/uploads/sku_thumbnails/${sku.thumbnail}" alt="${sku.name}">`
            : '<div class="sku-no-image">📦</div>'
        }
            </div>
            <div class="sku-info">
                <div class="sku-name">${sku.name || '未命名'}</div>
                <div class="sku-code">${sku.sku_code}</div>
                <div class="sku-dimensions">
                    ${sku.length}m × ${sku.width}m × ${sku.height}m | ${sku.weight}kg
                </div>
            </div>
            <div class="sku-actions">
                <button class="sku-btn sku-btn-edit" onclick="editSku('${sku.id}')" title="编辑">✏️</button>
                <button class="sku-btn sku-btn-delete" onclick="deleteSku('${sku.id}')" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

/**
 * 清空SKU表单
 */
function clearSkuForm() {
    editingSkuId = null;
    uploadedImage = { image: '', thumbnail: '' };
    uploadedTextures = {
        texture_top: '',
        texture_bottom: '',
        texture_front: '',
        texture_back: '',
        texture_left: '',
        texture_right: ''
    };

    document.getElementById('skuName').value = '';
    document.getElementById('skuCode').value = '';
    document.getElementById('skuLength').value = '0.5';
    document.getElementById('skuWidth').value = '0.3';
    document.getElementById('skuHeight').value = '0.2';
    document.getElementById('skuWeight').value = '1.0';

    const preview = document.getElementById('skuImagePreview');
    if (preview) {
        preview.innerHTML = '<div class="upload-placeholder">点击上传图片</div>';
    }

    const fileInput = document.getElementById('skuImageInput');
    if (fileInput) {
        fileInput.value = '';
    }

    const faceNames = ['top', 'bottom', 'front', 'back', 'left', 'right'];
    faceNames.forEach(face => {
        const previewId = `texturePreview${face.charAt(0).toUpperCase() + face.slice(1)}`;
        const preview = document.getElementById(previewId);
        const uploadItem = preview ? preview.closest('.texture-upload-item') : null;
        
        if (preview) {
            preview.innerHTML = '<div class="upload-placeholder">点击上传</div>';
            if (uploadItem) {
                uploadItem.classList.remove('has-texture');
            }
        }
        const input = document.getElementById(`textureInput${face.charAt(0).toUpperCase() + face.slice(1)}`);
        if (input) {
            input.value = '';
        }
    });

    const saveBtn = document.getElementById('saveSkuBtn');
    if (saveBtn) {
        saveBtn.textContent = '添加SKU';
    }
}

/**
 * 编辑SKU
 */
function editSku(skuId) {
    const sku = skuList.find(s => s.id === skuId);
    if (!sku) return;

    editingSkuId = skuId;
    uploadedImage = {
        image: sku.image || '',
        thumbnail: sku.thumbnail || ''
    };
    uploadedTextures = {
        texture_top: sku.texture_top || '',
        texture_bottom: sku.texture_bottom || '',
        texture_front: sku.texture_front || '',
        texture_back: sku.texture_back || '',
        texture_left: sku.texture_left || '',
        texture_right: sku.texture_right || ''
    };

    document.getElementById('skuName').value = sku.name;
    document.getElementById('skuCode').value = sku.sku_code;
    document.getElementById('skuLength').value = sku.length;
    document.getElementById('skuWidth').value = sku.width;
    document.getElementById('skuHeight').value = sku.height;
    document.getElementById('skuWeight').value = sku.weight;

    const preview = document.getElementById('skuImagePreview');
    if (preview) {
        if (sku.thumbnail) {
            preview.innerHTML = `<img src="/static/uploads/sku_thumbnails/${sku.thumbnail}" alt="${sku.name}">`;
        } else {
            preview.innerHTML = '<div class="upload-placeholder">点击上传图片</div>';
        }
    }

    const faceNames = ['top', 'bottom', 'front', 'back', 'left', 'right'];
    faceNames.forEach(face => {
        const textureKey = `texture_${face}`;
        const textureFile = uploadedTextures[textureKey];
        const previewId = `texturePreview${face.charAt(0).toUpperCase() + face.slice(1)}`;
        const preview = document.getElementById(previewId);
        const uploadItem = preview ? preview.closest('.texture-upload-item') : null;
        
        if (preview) {
            if (textureFile) {
                preview.innerHTML = `<img src="/static/uploads/sku_images/${textureFile}" alt="${face}">`;
                if (uploadItem) {
                    uploadItem.classList.add('has-texture');
                }
            } else {
                preview.innerHTML = '<div class="upload-placeholder">点击上传</div>';
                if (uploadItem) {
                    uploadItem.classList.remove('has-texture');
                }
            }
        }
    });

    const saveBtn = document.getElementById('saveSkuBtn');
    if (saveBtn) {
        saveBtn.textContent = '更新SKU';
    }
}

/**
 * 删除SKU
 */
async function deleteSku(skuId) {
    if (!confirm('确定要删除这个SKU吗？此操作无法撤销。')) {
        return;
    }

    try {
        const response = await fetch(`/api/skus/${skuId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadSkuList();
            if (editingSkuId === skuId) {
                clearSkuForm();
            }
        } else {
            alert('删除失败，请重试');
        }
    } catch (error) {
        console.error('删除SKU失败:', error);
        alert('删除失败，请检查网络连接');
    }
}

/**
 * 保存SKU（新增或更新）
 */
async function saveSku() {
    const skuData = {
        name: document.getElementById('skuName').value.trim(),
        sku_code: document.getElementById('skuCode').value.trim(),
        length: parseFloat(document.getElementById('skuLength').value) || 0.5,
        width: parseFloat(document.getElementById('skuWidth').value) || 0.3,
        height: parseFloat(document.getElementById('skuHeight').value) || 0.2,
        weight: parseFloat(document.getElementById('skuWeight').value) || 1.0,
        image: uploadedImage.image,
        thumbnail: uploadedImage.thumbnail,
        texture_top: uploadedTextures.texture_top,
        texture_bottom: uploadedTextures.texture_bottom,
        texture_front: uploadedTextures.texture_front,
        texture_back: uploadedTextures.texture_back,
        texture_left: uploadedTextures.texture_left,
        texture_right: uploadedTextures.texture_right
    };

    if (!skuData.name) {
        alert('请输入货物名称');
        return;
    }

    try {
        let response;
        if (editingSkuId) {
            response = await fetch(`/api/skus/${editingSkuId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(skuData)
            });
        } else {
            response = await fetch('/api/skus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(skuData)
            });
        }

        if (response.ok) {
            await loadSkuList();
            clearSkuForm();
        } else {
            alert('保存失败，请重试');
        }
    } catch (error) {
        console.error('保存SKU失败:', error);
        alert('保存失败，请检查网络连接');
    }
}

/**
 * 触发图片上传
 */
function triggerImageUpload() {
    const fileInput = document.getElementById('skuImageInput');
    if (fileInput) {
        fileInput.click();
    }
}

/**
 * 处理图片上传
 */
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('请上传有效的图片格式 (PNG, JPG, GIF, WebP)');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const preview = document.getElementById('skuImagePreview');
    if (preview) {
        preview.innerHTML = '<div class="upload-loading">上传中...</div>';
    }

    try {
        const response = await fetch('/api/skus/upload-image', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            uploadedImage = {
                image: result.image,
                thumbnail: result.thumbnail
            };

            if (preview) {
                preview.innerHTML = `<img src="${result.thumbnail_url}" alt="预览">`;
            }
        } else {
            const error = await response.json();
            alert('上传失败: ' + (error.error || '未知错误'));
            if (preview) {
                preview.innerHTML = '<div class="upload-placeholder">点击上传图片</div>';
            }
        }
    } catch (error) {
        console.error('上传图片失败:', error);
        alert('上传失败，请检查网络连接');
        if (preview) {
            preview.innerHTML = '<div class="upload-placeholder">点击上传图片</div>';
        }
    }
}

/**
 * 触发多面贴图上传
 */
function triggerTextureUpload(face) {
    const input = document.getElementById(`textureInput${face.charAt(0).toUpperCase() + face.slice(1)}`);
    if (input) {
        input.click();
    }
}

/**
 * 处理多面贴图上传
 */
async function handleTextureUpload(event, face) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('请上传有效的图片格式 (PNG, JPG, GIF, WebP)');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB');
        return;
    }

    const formData = new FormData();
    formData.append(`texture_${face}`, file);

    const preview = document.getElementById(`texturePreview${face.charAt(0).toUpperCase() + face.slice(1)}`);
    if (preview) {
        preview.innerHTML = '<div class="upload-loading">上传中...</div>';
    }

    try {
        const response = await fetch('/api/skus/upload-textures', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            if (result.textures && result.textures[`texture_${face}`]) {
                uploadedTextures[`texture_${face}`] = result.textures[`texture_${face}`];
                
                if (preview) {
                    preview.innerHTML = `<img src="/static/uploads/sku_images/${result.textures[`texture_${face}`]}" alt="${face}">`;
                    const uploadItem = preview.closest('.texture-upload-item');
                    if (uploadItem) {
                        uploadItem.classList.add('has-texture');
                    }
                }
            } else {
                throw new Error('上传失败：未返回贴图文件');
            }
        } else {
            const error = await response.json();
            alert('上传失败: ' + (error.error || '未知错误'));
            if (preview) {
                preview.innerHTML = '<div class="upload-placeholder">点击上传</div>';
            }
        }
    } catch (error) {
        console.error('上传贴图失败:', error);
        alert('上传失败，请检查网络连接');
        if (preview) {
            preview.innerHTML = '<div class="upload-placeholder">点击上传</div>';
        }
    }
}

/**
 * 删除多面贴图
 */
function removeTexture(face) {
    uploadedTextures[`texture_${face}`] = '';
    
    const previewId = `texturePreview${face.charAt(0).toUpperCase() + face.slice(1)}`;
    const preview = document.getElementById(previewId);
    const uploadItem = preview ? preview.closest('.texture-upload-item') : null;
    
    if (preview) {
        preview.innerHTML = '<div class="upload-placeholder">点击上传</div>';
        if (uploadItem) {
            uploadItem.classList.remove('has-texture');
        }
    }
    
    const input = document.getElementById(`textureInput${face.charAt(0).toUpperCase() + face.slice(1)}`);
    if (input) {
        input.value = '';
    }
}

/**
 * 获取所有SKU数据（供其他模块使用）
 */
function getSkuList() {
    return skuList;
}

/**
 * 通过ID获取SKU
 */
function getSkuById(skuId) {
    return skuList.find(sku => sku.id === skuId);
}

window.SkuModule = {
    openSkuModal,
    closeSkuModal,
    loadSkuList,
    clearSkuForm,
    editSku,
    deleteSku,
    saveSku,
    triggerImageUpload,
    handleImageUpload,
    getSkuList,
    getSkuById
};

window.openSkuModal = openSkuModal;
window.closeSkuModal = closeSkuModal;
window.clearSkuForm = clearSkuForm;
window.editSku = editSku;
window.deleteSku = deleteSku;
window.saveSku = saveSku;
window.triggerImageUpload = triggerImageUpload;
window.handleImageUpload = handleImageUpload;
window.triggerTextureUpload = triggerTextureUpload;
window.handleTextureUpload = handleTextureUpload;
window.removeTexture = removeTexture;
