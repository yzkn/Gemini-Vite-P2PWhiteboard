import './style.css';
import { generateShortId } from './src/utils';
import { initP2P, connectToPeer } from './src/p2p';
import { setupWhiteboard } from './src/whiteboard';

// URLのハッシュがあればそれをIDとして使用、なければ生成
let roomId = window.location.hash.substring(1);
if (!roomId) {
    roomId = generateShortId();
    window.location.hash = roomId;
}

document.getElementById('my-id-display').innerText = `ID: ${roomId}`;

// Peerの初期化
initP2P(roomId, (id) => {
    console.log('Peer ready');
});

// 手動接続ボタン
document.getElementById('connect-btn').onclick = () => {
    const peerId = document.getElementById('peer-id-input').value;
    if (peerId) connectToPeer(peerId);
};

// ホワイトボードのセットアップ
setupWhiteboard();
