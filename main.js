import './style.css';
import { generateShortId } from './src/utils';
import { initP2P, connectToPeer, broadcastData } from './src/p2p';
import { setupWhiteboard } from './src/whiteboard';
import { $elements, updateElement, deleteElement } from './src/store'; // 追加

// Lucideアイコンの初期化
window.lucide.createIcons();

// --- モーダル制御ロジック ---
const stickyModal = document.getElementById('sticky-modal');
let currentEditingId = null;

// グローバルに関数を公開（whiteboard.jsから呼べるようにする）
window.openStickyModal = (el) => {
    currentEditingId = el.id;
    document.getElementById('sticky-text-edit').value = el.text;
    document.getElementById('sticky-bg-color').value = el.bgColor;
    document.getElementById('sticky-text-color').value = el.textColor;
    stickyModal.classList.remove('hidden');
};

// Save ボタン
document.getElementById('sticky-save').onclick = () => {
    if (!currentEditingId) return;

    updateElement(currentEditingId, {
        text: document.getElementById('sticky-text-edit').value,
        bgColor: document.getElementById('sticky-bg-color').value,
        textColor: document.getElementById('sticky-text-color').value
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
        // 接続後にアイコンを再描画（必要に応じて）
        window.lucide.createIcons();
    }
};

initP2P(roomId, (id) => {
    console.log('Peer ready:', id);
});

setupWhiteboard();