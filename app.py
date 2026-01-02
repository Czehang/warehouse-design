from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import json
import os
import uuid
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app)

CONFIG_FILE = 'warehouse_config.json'
SKU_DB_FILE = 'sku_data.db'

SKU_IMAGE_DIR = os.path.join(app.static_folder, 'uploads', 'sku_images')
SKU_THUMB_DIR = os.path.join(app.static_folder, 'uploads', 'sku_thumbnails')

os.makedirs(SKU_IMAGE_DIR, exist_ok=True)
os.makedirs(SKU_THUMB_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

THUMBNAIL_SIZE = (150, 150)

default_config = {
    "global_params": {
        "area_count": 4,
        "channel_count": 2,
        "layer_count": 5,
        "cell_count": 20,
        "unit": "米"
    },
    "shelves": [],
    "view_settings": {
        "camera_position": {"x": 0, "y": 10, "z": 15},
        "camera_target": {"x": 0, "y": 0, "z": 0}
    }
}


def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(SKU_DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库表结构"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS skus (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sku_code TEXT UNIQUE,
            length REAL DEFAULT 0.5,
            width REAL DEFAULT 0.3,
            height REAL DEFAULT 0.2,
            weight REAL DEFAULT 1.0,
            image TEXT DEFAULT '',
            thumbnail TEXT DEFAULT '',
            texture_top TEXT DEFAULT '',
            texture_bottom TEXT DEFAULT '',
            texture_front TEXT DEFAULT '',
            texture_back TEXT DEFAULT '',
            texture_left TEXT DEFAULT '',
            texture_right TEXT DEFAULT '',
            created_at TEXT,
            updated_at TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cargos (
            id TEXT PRIMARY KEY,
            sku_id TEXT NOT NULL,
            x REAL DEFAULT 0,
            y REAL DEFAULT 0,
            z REAL DEFAULT 0,
            rotation REAL DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (sku_id) REFERENCES skus(id)
        )
    ''')
    
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sku_code ON skus(sku_code)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sku_name ON skus(name)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_cargo_sku ON cargos(sku_id)')
    
    conn.commit()
    conn.close()

def sku_row_to_dict(row):
    """将数据库行转换为字典"""
    if row is None:
        return None
    
    def safe_get(key, default=''):
        try:
            return row[key] or default
        except (IndexError, KeyError):
            return default
    
    return {
        "id": row['id'],
        "name": row['name'],
        "sku_code": row['sku_code'],
        "length": row['length'],
        "width": row['width'],
        "height": row['height'],
        "weight": row['weight'],
        "image": row['image'] or '',
        "thumbnail": row['thumbnail'] or '',
        "texture_top": safe_get('texture_top'),
        "texture_bottom": safe_get('texture_bottom'),
        "texture_front": safe_get('texture_front'),
        "texture_back": safe_get('texture_back'),
        "texture_left": safe_get('texture_left'),
        "texture_right": safe_get('texture_right'),
        "created_at": row['created_at']
    }

init_db()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return default_config.copy()
    return default_config.copy()

def save_config(config):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

def create_thumbnail(image_path, thumb_path):
    """创建缩略图"""
    try:
        with Image.open(image_path) as img:
            img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            img.save(thumb_path, 'JPEG', quality=85)
            return True
    except Exception as e:
        print(f"创建缩略图失败: {e}")
        return False

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/config', methods=['GET', 'POST'])
def manage_config():
    if request.method == 'POST':
        data = request.json
        config = load_config()
        config.update(data)
        save_config(config)
        return jsonify({"status": "success"})
    
    config = load_config()
    return jsonify(config)

@app.route('/api/config/global', methods=['POST'])
def update_global_config():
    data = request.json
    config = load_config()
    
    if 'global_params' not in config:
        config['global_params'] = default_config['global_params'].copy()
    
    config['global_params'].update(data)
    save_config(config)
    return jsonify({"status": "success"})


@app.route('/api/shelves', methods=['GET', 'POST'])
def manage_shelves():
    config = load_config()
    if request.method == 'POST':
        shelf_data = request.json
        config['shelves'].append(shelf_data)
        save_config(config)
        return jsonify({"status": "success", "id": len(config['shelves']) - 1})
    
    return jsonify(config['shelves'])

@app.route('/api/shelves/<int:shelf_id>', methods=['PUT', 'DELETE'])
def manage_shelf(shelf_id):
    config = load_config()
    if shelf_id < 0 or shelf_id >= len(config['shelves']):
        return jsonify({"error": "Invalid shelf ID"}), 404
    
    if request.method == 'PUT':
        update_data = request.json
        config['shelves'][shelf_id].update(update_data)
        save_config(config)
        return jsonify({"status": "success"})
    
    elif request.method == 'DELETE':
        del config['shelves'][shelf_id]
        save_config(config)
        return jsonify({"status": "success"})


@app.route('/api/statistics')
def get_statistics():
    config = load_config()
    
    if 'global_params' not in config:
        config['global_params'] = default_config['global_params'].copy()
    
    global_params = config['global_params']
    for key in ['area_count', 'channel_count', 'layer_count', 'cell_count']:
        if key not in global_params:
            global_params[key] = default_config['global_params'][key]
    
    total_cells = global_params['area_count'] * global_params['cell_count']
    occupied_cells = sum(1 for shelf in config.get('shelves', []) for _ in shelf.get('cells', []))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as count FROM skus')
    sku_count = cursor.fetchone()['count']
    conn.close()
    
    return jsonify({
        "total_cells": total_cells,
        "occupied_cells": occupied_cells,
        "free_cells": total_cells - occupied_cells,
        "sku_count": sku_count
    })


@app.route('/api/export', methods=['POST'])
def export_config():
    config = load_config()
    return jsonify(config)

@app.route('/api/import', methods=['POST'])
def import_config():
    data = request.json
    save_config(data)
    return jsonify({"status": "success"})


@app.route('/api/skus', methods=['GET'])
def get_skus():
    """获取所有SKU列表，支持分页和搜索"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)
    search = request.args.get('search', '', type=str)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if search:
        cursor.execute('''
            SELECT * FROM skus 
            WHERE name LIKE ? OR sku_code LIKE ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (f'%{search}%', f'%{search}%', per_page, (page - 1) * per_page))
    else:
        cursor.execute('''
            SELECT * FROM skus 
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (per_page, (page - 1) * per_page))
    
    rows = cursor.fetchall()
    skus = [sku_row_to_dict(row) for row in rows]
    
    if search:
        cursor.execute('SELECT COUNT(*) as count FROM skus WHERE name LIKE ? OR sku_code LIKE ?',
                       (f'%{search}%', f'%{search}%'))
    else:
        cursor.execute('SELECT COUNT(*) as count FROM skus')
    total = cursor.fetchone()['count']
    
    conn.close()
    
    return jsonify(skus)

@app.route('/api/skus/count', methods=['GET'])
def get_sku_count():
    """获取SKU总数"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as count FROM skus')
    count = cursor.fetchone()['count']
    conn.close()
    return jsonify({"count": count})

@app.route('/api/skus', methods=['POST'])
def create_sku():
    """创建新SKU"""
    data = request.json
    
    sku_id = str(uuid.uuid4())[:8]
    sku_code = data.get('sku_code', '').strip()
    if not sku_code:
        sku_code = f'SKU-{sku_id}'
    
    now = datetime.now().isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO skus (id, name, sku_code, length, width, height, weight, image, thumbnail,
                            texture_top, texture_bottom, texture_front, texture_back, texture_left, texture_right,
                            created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            sku_id,
            data.get('name', ''),
            sku_code,
            float(data.get('length', 0.5)),
            float(data.get('width', 0.3)),
            float(data.get('height', 0.2)),
            float(data.get('weight', 1.0)),
            data.get('image', ''),
            data.get('thumbnail', ''),
            data.get('texture_top', ''),
            data.get('texture_bottom', ''),
            data.get('texture_front', ''),
            data.get('texture_back', ''),
            data.get('texture_left', ''),
            data.get('texture_right', ''),
            now,
            now
        ))
        conn.commit()
        
        cursor.execute('SELECT * FROM skus WHERE id = ?', (sku_id,))
        new_sku = sku_row_to_dict(cursor.fetchone())
        conn.close()
        
        return jsonify({"status": "success", "sku": new_sku})
    
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({"error": f"SKU编码已存在: {sku_code}"}), 400
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/api/skus/<sku_id>', methods=['GET'])
def get_sku(sku_id):
    """获取单个SKU"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM skus WHERE id = ?', (sku_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return jsonify(sku_row_to_dict(row))
    return jsonify({"error": "SKU not found"}), 404

@app.route('/api/skus/<sku_id>', methods=['PUT'])
def update_sku(sku_id):
    """更新SKU"""
    data = request.json
    now = datetime.now().isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM skus WHERE id = ?', (sku_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({"error": "SKU not found"}), 404
    
    def safe_existing(key, default=''):
        try:
            return existing[key] or default
        except (IndexError, KeyError):
            return default
    
    try:
        cursor.execute('''
            UPDATE skus SET
                name = ?,
                sku_code = ?,
                length = ?,
                width = ?,
                height = ?,
                weight = ?,
                image = ?,
                thumbnail = ?,
                texture_top = ?,
                texture_bottom = ?,
                texture_front = ?,
                texture_back = ?,
                texture_left = ?,
                texture_right = ?,
                updated_at = ?
            WHERE id = ?
        ''', (
            data.get('name', existing['name']),
            data.get('sku_code', existing['sku_code']),
            float(data.get('length', existing['length'])),
            float(data.get('width', existing['width'])),
            float(data.get('height', existing['height'])),
            float(data.get('weight', existing['weight'])),
            data.get('image', existing['image']),
            data.get('thumbnail', existing['thumbnail']),
            data.get('texture_top', safe_existing('texture_top')),
            data.get('texture_bottom', safe_existing('texture_bottom')),
            data.get('texture_front', safe_existing('texture_front')),
            data.get('texture_back', safe_existing('texture_back')),
            data.get('texture_left', safe_existing('texture_left')),
            data.get('texture_right', safe_existing('texture_right')),
            now,
            sku_id
        ))
        conn.commit()
        
        cursor.execute('SELECT * FROM skus WHERE id = ?', (sku_id,))
        updated_sku = sku_row_to_dict(cursor.fetchone())
        conn.close()
        
        return jsonify({"status": "success", "sku": updated_sku})
    
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({"error": "SKU编码已存在"}), 400
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/api/skus/<sku_id>', methods=['DELETE'])
def delete_sku(sku_id):
    """删除SKU"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT image, thumbnail FROM skus WHERE id = ?', (sku_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return jsonify({"error": "SKU not found"}), 404
    
    if row['image']:
        image_path = os.path.join(SKU_IMAGE_DIR, row['image'])
        if os.path.exists(image_path):
            os.remove(image_path)
    if row['thumbnail']:
        thumb_path = os.path.join(SKU_THUMB_DIR, row['thumbnail'])
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
    
    cursor.execute('DELETE FROM skus WHERE id = ?', (sku_id,))
    conn.commit()
    conn.close()
    
    return jsonify({"status": "success"})

@app.route('/api/skus/upload-image', methods=['POST'])
def upload_sku_image():
    """上传SKU图片并创建缩略图"""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        unique_id = str(uuid.uuid4())[:8]
        filename = f"sku_{unique_id}.{ext}"
        thumb_filename = f"sku_{unique_id}_thumb.jpg"
        
        image_path = os.path.join(SKU_IMAGE_DIR, filename)
        file.save(image_path)
        
        thumb_path = os.path.join(SKU_THUMB_DIR, thumb_filename)
        create_thumbnail(image_path, thumb_path)
        
        return jsonify({
            "status": "success",
            "image": filename,
            "thumbnail": thumb_filename,
            "image_url": f"/static/uploads/sku_images/{filename}",
            "thumbnail_url": f"/static/uploads/sku_thumbnails/{thumb_filename}"
        })
    
    return jsonify({"error": "Invalid file type"}), 400

@app.route('/api/skus/upload-textures', methods=['POST'])
def upload_sku_textures():
    """上传SKU多面贴图（上下前后左右6个面）"""
    textures = {}
    face_names = ['top', 'bottom', 'front', 'back', 'left', 'right']
    
    for face in face_names:
        file_key = f'texture_{face}'
        if file_key in request.files:
            file = request.files[file_key]
            if file and file.filename and allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                unique_id = str(uuid.uuid4())[:8]
                filename = f"sku_tex_{face}_{unique_id}.{ext}"
                
                file_path = os.path.join(SKU_IMAGE_DIR, filename)
                file.save(file_path)
                textures[f'texture_{face}'] = filename
    
    if not textures:
        return jsonify({"error": "No valid texture files uploaded"}), 400
    
    composite_thumb = None
    try:
        composite_thumb = create_composite_thumbnail(textures)
    except Exception as e:
        print(f"合成缩略图失败: {e}")
    
    return jsonify({
        "status": "success",
        "textures": textures,
        "composite_thumbnail": composite_thumb
    })

def create_composite_thumbnail(textures):
    """将多面贴图合成为一张缩略图（展开图）"""
    from PIL import Image
    
    cell_size = 100
    
    layout_width = cell_size * 4
    layout_height = cell_size * 3
    
    composite = Image.new('RGB', (layout_width, layout_height), color=(240, 240, 240))
    
    positions = {
        'texture_top': (cell_size, 0),
        'texture_left': (0, cell_size),
        'texture_front': (cell_size, cell_size),
        'texture_right': (cell_size * 2, cell_size),
        'texture_back': (cell_size * 3, cell_size),
        'texture_bottom': (cell_size, cell_size * 2)
    }
    
    for texture_key, pos in positions.items():
        if texture_key in textures:
            img_path = os.path.join(SKU_IMAGE_DIR, textures[texture_key])
            if os.path.exists(img_path):
                try:
                    img = Image.open(img_path)
                    img = img.convert('RGB')
                    img.thumbnail((cell_size, cell_size))
                    
                    offset_x = (cell_size - img.width) // 2
                    offset_y = (cell_size - img.height) // 2
                    composite.paste(img, (pos[0] + offset_x, pos[1] + offset_y))
                except Exception as e:
                    print(f"处理贴图失败 {texture_key}: {e}")
    
    unique_id = str(uuid.uuid4())[:8]
    composite_filename = f"sku_composite_{unique_id}.jpg"
    composite_path = os.path.join(SKU_THUMB_DIR, composite_filename)
    composite.save(composite_path, 'JPEG', quality=85)
    
    return composite_filename

@app.route('/api/skus/batch-delete', methods=['POST'])
def batch_delete_skus():
    """批量删除SKU"""
    data = request.json
    sku_ids = data.get('ids', [])
    
    if not sku_ids:
        return jsonify({"error": "No SKU IDs provided"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    deleted_count = 0
    for sku_id in sku_ids:
        cursor.execute('SELECT image, thumbnail FROM skus WHERE id = ?', (sku_id,))
        row = cursor.fetchone()
        
        if row:
            if row['image']:
                image_path = os.path.join(SKU_IMAGE_DIR, row['image'])
                if os.path.exists(image_path):
                    os.remove(image_path)
            if row['thumbnail']:
                thumb_path = os.path.join(SKU_THUMB_DIR, row['thumbnail'])
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)
            
            cursor.execute('DELETE FROM skus WHERE id = ?', (sku_id,))
            deleted_count += 1
    
    conn.commit()
    conn.close()
    
    return jsonify({"status": "success", "deleted_count": deleted_count})


@app.route('/api/cargos', methods=['GET'])
def get_cargos():
    """获取所有货物列表（包含SKU信息）"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT c.id, c.sku_id, c.x, c.y, c.z, c.rotation, c.created_at,
               s.name, s.sku_code, s.length, s.width, s.height, s.weight, s.thumbnail,
               s.texture_top, s.texture_bottom, s.texture_front, s.texture_back, s.texture_left, s.texture_right
        FROM cargos c
        LEFT JOIN skus s ON c.sku_id = s.id
        ORDER BY c.created_at DESC
    ''')
    
    rows = cursor.fetchall()
    cargos = []
    for row in rows:
        cargos.append({
            "id": row['id'],
            "sku_id": row['sku_id'],
            "x": row['x'],
            "y": row['y'],
            "z": row['z'],
            "rotation": row['rotation'],
            "created_at": row['created_at'],
            "sku": {
                "name": row['name'],
                "sku_code": row['sku_code'],
                "length": row['length'],
                "width": row['width'],
                "height": row['height'],
                "weight": row['weight'],
                "thumbnail": row['thumbnail'] or '',
                "texture_top": row['texture_top'] or '',
                "texture_bottom": row['texture_bottom'] or '',
                "texture_front": row['texture_front'] or '',
                "texture_back": row['texture_back'] or '',
                "texture_left": row['texture_left'] or '',
                "texture_right": row['texture_right'] or ''
            }
        })
    
    conn.close()
    return jsonify(cargos)

@app.route('/api/cargos', methods=['POST'])
def create_cargo():
    """创建新货物"""
    data = request.json
    
    cargo_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO cargos (id, sku_id, x, y, z, rotation, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            cargo_id,
            data.get('sku_id'),
            float(data.get('x', 0)),
            float(data.get('y', 0)),
            float(data.get('z', 0)),
            float(data.get('rotation', 0)),
            now
        ))
        conn.commit()
        conn.close()
        
        return jsonify({"status": "success", "id": cargo_id})
    
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/api/cargos/<cargo_id>', methods=['DELETE'])
def delete_cargo(cargo_id):
    """删除单个货物"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM cargos WHERE id = ?', (cargo_id,))
    conn.commit()
    conn.close()
    
    return jsonify({"status": "success"})

@app.route('/api/cargos/clear', methods=['POST'])
def clear_all_cargos():
    """清空所有货物"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM cargos')
    conn.commit()
    conn.close()
    
    return jsonify({"status": "success"})

@app.route('/api/cargos/<cargo_id>', methods=['PUT'])
def update_cargo(cargo_id):
    """更新货物位置"""
    data = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE cargos SET x = ?, y = ?, z = ?, rotation = ?
        WHERE id = ?
    ''', (
        float(data.get('x', 0)),
        float(data.get('y', 0)),
        float(data.get('z', 0)),
        float(data.get('rotation', 0)),
        cargo_id
    ))
    conn.commit()
    conn.close()
    
    return jsonify({"status": "success"})


@app.route('/static/uploads/sku_images/<filename>')
def serve_sku_image(filename):
    return send_from_directory(SKU_IMAGE_DIR, filename)

@app.route('/static/uploads/sku_thumbnails/<filename>')
def serve_sku_thumbnail(filename):
    return send_from_directory(SKU_THUMB_DIR, filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)