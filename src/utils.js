const ALPHABET = '123456789abcdefghijkmnopqrstuvwxyz';

export function generateShortId() {
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    return result;
}

export function generateElementId() {
    return Math.random().toString(36).substr(2, 9);
}