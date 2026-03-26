// Copyright (c) 2026 YA-androidapp(https://github.com/yzkn) All rights reserved.


import { atom } from 'nanostores';

// ボード上の全要素（手書き、付箋）を管理
// { id, type: 'path'|'sticky', x, y, color, points, text, bgColor, textColor }
export const $elements = atom([]);

// ボード設定
export const $boardSettings = atom({
    background: 'grid', // 'grid' | 'plain'
});

export const addElement = (el) => {
    $elements.set([...$elements.get(), el]);
};

export const updateElement = (id, data) => {
    $elements.set($elements.get().map(el => el.id === id ? { ...el, ...data } : el));
};

export const deleteElement = (id) => {
    $elements.set($elements.get().filter(el => el.id !== id));
};
