import { $elements, $boardSettings, addElement, updateElement, deleteElement } from './store';
import { generateElementId } from './utils';
import { broadcastData } from './p2p';

let currentTool = 'pencil';
let isDragging = false;
let activeElementId = null;
let dragOffset = { x: 0, y: 0 };
let currentPath = null;

export function setupWhiteboard() {
    const board = document.getElementById('whiteboard');
    const colorPicker = document.getElementById('color-picker');

    // ツール切り替え
    document.getElementById('tool-pencil').onclick = () => setTool('pencil');
    document.getElementById('tool-sticky').onclick = () => setTool('sticky');
    document.getElementById('bg-grid').onclick = () => updateBg('grid');
    document.getElementById('bg-plain').onclick = () => updateBg('plain');

    function setTool(tool) {
        currentTool = tool;
        document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active'));
        document.getElementById(`tool-${tool}`).classList.add('active');
    }

    function updateBg(type) {
        $boardSettings.set({ ...$boardSettings.get(), background: type });
        broadcastData('UPDATE_SETTINGS', { settings: $boardSettings.get() });
    }

    // 描画ロジック
    board.onmousedown = (e) => {
        const rect = board.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (currentTool === 'pencil') {
            isDragging = true;
            const id = generateElementId();
            currentPath = { id, type: 'path', color: colorPicker.value, points: [{ x, y }] };
            addElement(currentPath);
        } else if (currentTool === 'sticky') {
            const id = generateElementId();
            addElement({
                id, type: 'sticky', x, y,
                text: 'New Note', bgColor: '#ffff88', textColor: '#000000'
            });
            broadcastSync();
        }
    };

    window.onmousemove = (e) => {
        if (!isDragging) return;
        const rect = board.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (currentTool === 'pencil' && currentPath) {
            currentPath.points.push({ x, y });
            updateElement(currentPath.id, { points: [...currentPath.points] });
        }
    };

    window.onmouseup = () => {
        if (isDragging) broadcastSync();
        isDragging = false;
        currentPath = null;
    };

    // ストア監視でレンダリング
    $elements.subscribe(render);
    $boardSettings.subscribe(settings => {
        board.className = settings.background === 'grid' ? 'grid-bg' : '';
    });
}

function broadcastSync() {
    broadcastData('UPDATE_ELEMENTS', { elements: $elements.get() });
}

function render(elements) {
    const board = document.getElementById('whiteboard');
    // 差分更新ではなく全書き換え（シンプル化のため。要素が多い場合は最適化が必要）
    board.innerHTML = '';

    elements.forEach(el => {
        if (el.type === 'path') {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.style.position = 'absolute';
            svg.style.left = '0'; svg.style.top = '0';
            svg.style.width = '100%'; svg.style.height = '100%';
            svg.style.pointerEvents = 'none';

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            path.setAttribute('d', d);
            path.setAttribute('stroke', el.color);
            path.setAttribute('stroke-width', '3');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.style.pointerEvents = 'auto';
            path.style.cursor = 'move';

            // 移動ロジック
            path.onmousedown = (e) => {
                e.stopPropagation();
                setupDrag(el, e);
            };

            svg.appendChild(path);
            board.appendChild(svg);
        }
        else if (el.type === 'sticky') {
            const div = document.createElement('div');
            div.className = 'sticky-note';
            div.innerText = el.text;
            div.style.left = `${el.x}px`;
            div.style.top = `${el.y}px`;
            div.style.backgroundColor = el.bgColor;
            div.style.color = el.textColor;

            div.onmousedown = (e) => {
                e.stopPropagation();
                setupDrag(el, e);
            };
            div.ondblclick = () => openStickyModal(el);

            board.appendChild(div);
        }
    });
}

function setupDrag(el, e) {
    let startX = e.clientX;
    let startY = e.clientY;

    const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        startX = moveEvent.clientX;
        startY = moveEvent.clientY;

        if (el.type === 'path') {
            const newPoints = el.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
            updateElement(el.id, { points: newPoints });
        } else {
            updateElement(el.id, { x: el.x + dx, y: el.y + dy });
        }
    };

    const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        broadcastSync();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

// 付箋編集モーダル
const modal = document.getElementById('sticky-modal');
let editingId = null;

function openStickyModal(el) {
    editingId = el.id;
    document.getElementById('sticky-text-edit').value = el.text;
    document.getElementById('sticky-bg-color').value = el.bgColor;
    document.getElementById('sticky-text-color').value = el.textColor;
    modal.classList.remove('hidden');
}

document.getElementById('sticky-save').onclick = () => {
    updateElement(editingId, {
        text: document.getElementById('sticky-text-edit').value,
        bgColor: document.getElementById('sticky-bg-color').value,
        textColor: document.getElementById('sticky-text-color').value
    });
    broadcastSync();
    modal.classList.add('hidden');
};

document.getElementById('sticky-delete').onclick = () => {
    deleteElement(editingId);
    broadcastSync();
    modal.classList.add('hidden');
};

document.getElementById('sticky-close').onclick = () => modal.classList.add('hidden');
