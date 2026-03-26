// Copyright (c) 2026 YA-androidapp(https://github.com/yzkn) All rights reserved.


import { Peer } from 'peerjs';
import { $elements, $boardSettings } from './store';

let peer = null;
let connections = [];

export function initP2P(myId, onOpen) {
    // Firefox ICE失敗対策として、明示的にGoogleのSTUNサーバーを追加設定
    peer = new Peer(myId, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        },
        debug: 1
    });

    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        onOpen(id);
    });

    peer.on('connection', (conn) => {
        setupConnection(conn);
    });

    peer.on('error', (err) => {
        console.error('PeerJS Error:', err.type);
        if (err.type === 'peer-unavailable') {
            alert('Peer not found.');
        } else if (err.type === 'network') {
            alert('Network error. Retrying...');
        }
    });
}

function updateStatusUI(isConnected) {
    const statusText = document.getElementById('connection-status');
    const statusDot = document.getElementById('connection-status-dot');

    if (statusText) {
        statusText.innerText = isConnected ? 'Connected' : 'Disconnected';
    }
    if (statusDot) {
        if (isConnected) {
            statusDot.classList.add('connected');
        } else {
            statusDot.classList.remove('connected');
        }
    }
}

function setupConnection(conn) {
    conn.on('open', () => {
        if (!connections.find(c => c.peer === conn.peer)) {
            connections.push(conn);
        }
        // 安全なUI更新関数を呼び出す
        updateStatusUI(true);

        // 現在の状態を新規接続者に送信
        conn.send({ type: 'SYNC_ALL', elements: $elements.get(), settings: $boardSettings.get() });
    });

    conn.on('data', (data) => {
        if (data.type === 'SYNC_ALL') {
            $elements.set(data.elements);
            $boardSettings.set(data.settings);
        } else if (data.type === 'UPDATE_ELEMENTS') {
            $elements.set(data.elements);
        } else if (data.type === 'UPDATE_SETTINGS') {
            $boardSettings.set(data.settings);
        }
    });

    conn.on('close', () => {
        connections = connections.filter(c => c !== conn);
        if (connections.length === 0) {
            // 安全なUI更新関数を呼び出す
            updateStatusUI(false);
        }
    });
}

export function connectToPeer(peerId) {
    const conn = peer.connect(peerId);
    setupConnection(conn);
}

// 状態が変更されたときに全員に通知
export function broadcastData(type, payload) {
    connections.forEach(conn => {
        if (conn.open) {
            conn.send({ type, ...payload });
        }
    });
}
