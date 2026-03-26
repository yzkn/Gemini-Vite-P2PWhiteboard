// Copyright (c) 2026 YA-androidapp(https://github.com/yzkn) All rights reserved.


import { defineConfig } from 'vite';

export default defineConfig({
    base: '/Gemini-Vite-P2PWhiteboard/',
    server: {
        // 明示的にヘッダーを上書きして、外部からのポリシーを緩和を試みる
        headers: {
            'Content-Security-Policy': "worker-src 'self' blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
        }
    },
    build: {
        outDir: 'dist',
    }
});