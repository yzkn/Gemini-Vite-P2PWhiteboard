// Copyright (c) 2026 YA-androidapp(https://github.com/yzkn) All rights reserved.


import './style.css';
import { generateShortId } from './src/utils';
import { initP2P, connectToPeer, broadcastData } from './src/p2p';
import { setupWhiteboard } from './src/whiteboard';
import { $elements, updateElement, deleteElement } from './src/store';

// 1. 必要なアイコンをすべてインポートする
import {
    createIcons,
    Pencil,
    StickyNote,
    Grid3X3,
    Square,
    Copy
} from 'lucide';

// 2. アイコンを再描画するための関数を定義
const refreshIcons = () => {
    createIcons({
        icons: {
            Pencil,
            StickyNote,
            Grid3X3,
            Square,
            Copy
        }
    });
};

// 3. 初回実行
refreshIcons();

// --- モーダル制御ロジック ---
const stickyModal = document.getElementById('sticky-modal');
let currentEditingId = null;

// グローバルに関数を公開（whiteboard.jsから呼べるようにする）
window.openStickyModal = (el) => {
    currentEditingId = el.id;
    document.getElementById('sticky-text-edit').value = el.text;
    document.getElementById('sticky-bg-color').value = el.bgColor;
    document.getElementById('sticky-text-color').value = el.textColor;
    // 現在のフォントサイズをセット（未設定ならデフォルト16）
    document.getElementById('sticky-font-size').value = el.fontSize || 16;
    stickyModal.classList.remove('hidden');
};

// Save ボタン
document.getElementById('sticky-save').onclick = () => {
    if (!currentEditingId) return;

    updateElement(currentEditingId, {
        text: document.getElementById('sticky-text-edit').value,
        bgColor: document.getElementById('sticky-bg-color').value,
        textColor: document.getElementById('sticky-text-color').value,
        // 数値として取得して保存
        fontSize: parseInt(document.getElementById('sticky-font-size').value, 10) || 16
    });

    // 変更を全員に同期
    broadcastData('UPDATE_ELEMENTS', { elements: $elements.get() });

    stickyModal.classList.add('hidden');
    currentEditingId = null;
};

// Delete ボタン
document.getElementById('sticky-delete').onclick = () => {
    if (!currentEditingId) return;

    deleteElement(currentEditingId);
    broadcastData('UPDATE_ELEMENTS', { elements: $elements.get() });

    stickyModal.classList.add('hidden');
    currentEditingId = null;
};

// Close ボタン
document.getElementById('sticky-close').onclick = () => {
    stickyModal.classList.add('hidden');
    currentEditingId = null;
};

// --- その他初期化 ---

let roomId = window.location.hash.substring(1);
if (!roomId) {
    roomId = generateShortId();
    window.location.hash = roomId;
}

document.getElementById('my-id-display').innerText = `ID: ${roomId}`;

// IDコピー機能
document.getElementById('copy-id-btn').onclick = () => {
    // 現在のroomId（4文字のID）を取得
    const idToCopy = window.location.hash.substring(1) || roomId;

    navigator.clipboard.writeText(idToCopy).then(() => {
        // ユーザーへの通知（簡易的ですが、ボタンのテキストを一瞬変えるなどの演出も可能です）
        const btn = document.getElementById('copy-id-btn');
        const originalTitle = btn.title;

        btn.title = 'Copied!';
        alert(`ID "${idToCopy}" copied to clipboard!`);

        // 数秒後にツールチップを戻す
        setTimeout(() => {
            btn.title = originalTitle;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy ID: ', err);
    });
};

const joinModal = document.getElementById('join-modal');
document.getElementById('join-btn').onclick = () => joinModal.classList.remove('hidden');
document.getElementById('join-close-btn').onclick = () => joinModal.classList.add('hidden');

document.getElementById('connect-btn').onclick = () => {
    const peerId = document.getElementById('peer-id-input').value;
    if (peerId) {
        connectToPeer(peerId);
        document.getElementById('join-modal').classList.add('hidden');
        window.location.hash = peerId;

        // 接続後にアイコンを再描画
        refreshIcons();
    }
};

initP2P(roomId, (id) => {
    console.log('Peer ready:', id);
});

// フォーカストラップ用の関数
function setupFocusTrap(modalId) {
    const modal = document.getElementById(modalId);
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    modal.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    });
}

// ページロード時の初期フォーカス
window.addEventListener('DOMContentLoaded', () => {
    // 鉛筆ツールをデフォルトでフォーカス（または操作開始しやすい場所）
    document.getElementById('tool-pencil').focus();
});

// モーダル表示時の制御（既存のコードを強化）
let lastFocusedElement = null;

// Joinモーダル
const joinBtn = document.getElementById('join-btn');
// const joinModal = document.getElementById('join-modal');
const peerIdInput = document.getElementById('peer-id-input');

joinBtn.onclick = () => {
    lastFocusedElement = document.activeElement;
    joinModal.classList.remove('hidden');
    peerIdInput.focus(); // ID入力欄にフォーカス
};

document.getElementById('join-close-btn').onclick = () => {
    joinModal.classList.add('hidden');
    lastFocusedElement?.focus(); // 元のボタンに戻す
};

// Stickyモーダル
window.openStickyModal = (el) => {
    lastFocusedElement = document.activeElement;
    currentEditingId = el.id;

    document.getElementById('sticky-text-edit').value = el.text;
    document.getElementById('sticky-bg-color').value = el.bgColor;
    document.getElementById('sticky-text-color').value = el.textColor;
    document.getElementById('sticky-font-size').value = el.fontSize || 16;

    stickyModal.classList.remove('hidden');
    document.getElementById('sticky-text-edit').focus(); // テキストエリアにフォーカス
};

// 保存・閉じるボタンの共通処理にフォーカス戻しを追加
const closeStickyModal = () => {
    stickyModal.classList.add('hidden');
    lastFocusedElement?.focus();
    currentEditingId = null;
};

document.getElementById('sticky-save').onclick = () => {
    if (!currentEditingId) return;

    // 各項目の値を取得
    const text = document.getElementById('sticky-text-edit').value;
    const bgColor = document.getElementById('sticky-bg-color').value;
    const textColor = document.getElementById('sticky-text-color').value;
    // フォントサイズを数値として取得
    const fontSize = parseInt(document.getElementById('sticky-font-size').value, 10) || 16;

    updateElement(currentEditingId, {
        text,
        bgColor,
        textColor,
        fontSize // ストアを更新
    });

    broadcastData('UPDATE_ELEMENTS', { elements: $elements.get() });
    stickyModal.classList.add('hidden');
    currentEditingId = null;

    closeStickyModal();
};
document.getElementById('sticky-close').onclick = closeStickyModal;

// フォーカストラップの初期化
setupFocusTrap('join-modal');
setupFocusTrap('sticky-modal');

setupWhiteboard();
