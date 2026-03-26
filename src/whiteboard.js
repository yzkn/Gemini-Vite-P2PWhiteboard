// Copyright (c) 2026 YA-androidapp(https://github.com/yzkn) All rights reserved.


import { $elements, $boardSettings, addElement, updateElement, deleteElement } from './store';
import { generateElementId } from './utils';
import { broadcastData } from './p2p';

let currentTool = 'pencil';
let isDrawing = false;
let currentPath = null;

function setupResize(el, e, domElement) {
    e.preventDefault();
    e.stopPropagation();

    let startX = e.clientX;
    let startY = e.clientY;
    let startWidth = domElement.offsetWidth;
    let startHeight = domElement.offsetHeight;

    const onMove = (moveEvent) => {
        const dw = moveEvent.clientX - startX;
        const dh = moveEvent.clientY - startY;

        // 最小サイズ制限 (100x80)
        const newWidth = Math.max(100, startWidth + dw);
        const newHeight = Math.max(80, startHeight + dh);

        // DOMを直接操作してリアルタイムに反映
        domElement.style.width = `${newWidth}px`;
        domElement.style.height = `${newHeight}px`;
    };

    const onUp = (upEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);

        const dw = upEvent.clientX - startX;
        const dh = upEvent.clientY - startY;

        // ストアを更新してP2P共有
        updateElement(el.id, {
            width: Math.max(100, startWidth + dw),
            height: Math.max(80, startHeight + dh)
        });
        broadcastSync();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

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
        document.querySelectorAll('.floating-toolbar button').forEach(b => b.classList.remove('active'));
        document.getElementById(`tool-${tool}`).classList.add('active');
        board.style.cursor = tool === 'pencil' ? 'crosshair' : 'default';
    }

    function updateBg(type) {
        $boardSettings.set({ ...$boardSettings.get(), background: type });
        broadcastData('UPDATE_SETTINGS', { settings: $boardSettings.get() });
    }

    // 新規描画
    board.onmousedown = (e) => {
        if (e.target !== board) return;
        const rect = board.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (currentTool === 'pencil') {
            isDrawing = true;
            const id = generateElementId();
            currentPath = { id, type: 'path', color: colorPicker.value, points: [{ x, y }] };
            addElement(currentPath);
        } else if (currentTool === 'sticky') {
            const id = generateElementId();

            const selectedColor = colorPicker.value;

            addElement({
                id, type: 'sticky', x: x - 90, y: y - 60,
                width: 180, height: 120, // デフォルトサイズを追加
                text: 'New Note', bgColor: selectedColor, textColor: '#000000'
            });
            broadcastSync();
        }
    };

    window.onmousemove = (e) => {
        if (!isDrawing || !currentPath) return;
        const rect = board.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        currentPath.points.push({ x, y });
        updateElement(currentPath.id, { points: [...currentPath.points] });
    };

    window.onmouseup = () => {
        if (isDrawing) {
            broadcastSync();
            isDrawing = false;
            currentPath = null;
        }
    };

    $elements.subscribe(render);
    $boardSettings.subscribe(settings => {
        board.classList.toggle('grid-bg', settings.background === 'grid');
    });
}

function broadcastSync() {
    broadcastData('UPDATE_ELEMENTS', { elements: $elements.get() });
}

// 描画処理
function render(elements) {
    const board = document.getElementById('whiteboard');
    board.innerHTML = '';

    elements.forEach(el => {
        if (el.type === 'path') {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute('class', 'drawing-svg');

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            path.setAttribute('d', d);
            path.setAttribute('stroke', el.color);
            path.setAttribute('stroke-width', '4');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('class', 'drawing-path');

            path.onmousedown = (e) => {
                e.stopPropagation();
                setupDrag(el, e, svg); // svg全体を動かす対象として渡す
            };
            svg.appendChild(path);
            board.appendChild(svg);
        }
        else if (el.type === 'sticky') {
            const div = document.createElement('div');
            div.className = 'sticky-note';
            div.setAttribute('tabindex', '0'); // キーボードで選択可能にする
            div.innerText = el.text;
            div.style.left = `${el.x}px`;
            div.style.top = `${el.y}px`;
            // サイズをストアから反映
            div.style.width = `${el.width || 180}px`;
            div.style.height = `${el.height || 120}px`;
            div.style.backgroundColor = el.bgColor;
            div.style.color = el.textColor;
            div.style.fontSize = `${el.fontSize || 16}px`;

            // 移動用ドラッグ
            div.onmousedown = (e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                setupDrag(el, e, div);
            };

            // --- 追加: リサイズハンドルの作成 ---
            const handle = document.createElement('div');
            handle.className = 'resize-handle';
            handle.onmousedown = (e) => {
                setupResize(el, e, div);
            };
            div.appendChild(handle);

            div.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.openStickyModal) window.openStickyModal(el);
            };

            // キーボード操作対応: Enterキーでモーダルを開く
            div.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.openStickyModal(el);
                }
            };

            board.appendChild(div);
        }
    });
}

// 移動ロジックの修正
function setupDrag(el, e, domElement) {
    let startX = e.clientX;
    let startY = e.clientY;

    let currentX = el.x || 0;
    let currentY = el.y || 0;
    const initialPoints = el.type === 'path' ? JSON.parse(JSON.stringify(el.points)) : null;

    let moved = false; // 移動したかどうかのフラグ

    const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        // わずかな手ブレ（2px以下）は移動とみなさない
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            moved = true;
        } else {
            return;
        }

        if (el.type === 'sticky') {
            domElement.style.left = `${currentX + dx}px`;
            domElement.style.top = `${currentY + dy}px`;
        } else if (el.type === 'path') {
            domElement.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    };

    const onUp = (upEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);

        if (!moved) {
            // 全く動いていない（＝ただのクリック/ダブルクリック）場合は
            // ストアを更新せずに終了する。これにより DOM が維持される。
            return;
        }

        const dx = upEvent.clientX - startX;
        const dy = upEvent.clientY - startY;

        // 実際に移動した場合のみストアを更新（ここで render が走る）
        if (el.type === 'path') {
            const movedPoints = initialPoints.map(p => ({ x: p.x + dx, y: p.y + dy }));
            updateElement(el.id, { points: movedPoints });
        } else {
            updateElement(el.id, { x: currentX + dx, y: currentY + dy });
        }

        broadcastSync();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}