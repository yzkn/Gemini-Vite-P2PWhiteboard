// Copyright (c) 2026 YA-androidapp(https://github.com/yzkn) All rights reserved.


import './style.css';
import { generateShortId } from './src/utils';
import { initP2P, connectToPeer } from './src/p2p';
import { setupWhiteboard } from './src/whiteboard';

// Lucideアイコンの初期化
window.lucide.createIcons();

let roomId = window.location.hash.substring(1);
if (!roomId) {
    roomId = generateShortId();
    window.location.hash = roomId;
}

document.getElementById('my-id-display').innerText = `ID: ${roomId}`;

// コピー機能
document.getElementById('copy-link-btn').onclick = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
};

// Joinモーダルの制御
const joinModal = document.getElementById('join-modal');
document.getElementById('join-btn').onclick = () => joinModal.classList.remove('hidden');
document.getElementById('join-close-btn').onclick = () => joinModal.classList.add('hidden');

document.getElementById('connect-btn').onclick = () => {
    const peerId = document.getElementById('peer-id-input').value;
    if (peerId) {
        connectToPeer(peerId);
        joinModal.classList.add('hidden');
        window.location.hash = peerId; // URLも更新
    }
};

initP2P(roomId, (id) => {
    console.log('Peer ready:', id);
});

setupWhiteboard();