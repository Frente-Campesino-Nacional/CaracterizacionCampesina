"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCedulaInput = exports.isValidCedulaCode = exports.generateRandomCedulaCode = void 0;
function generateRandomCedulaCode() {
    const digits = Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(9, '0');
    return digits;
}
exports.generateRandomCedulaCode = generateRandomCedulaCode;
function isValidCedulaCode(value) {
    return /^([VE]-\d{8}|\d{9})$/.test(value);
}
exports.isValidCedulaCode = isValidCedulaCode;
function normalizeCedulaInput(value) {
    const cleaned = value.trim().replace(/[\s.]+/g, '').toUpperCase();
    const venezuelaMatch = cleaned.match(/^([VE])[-]?(\d{8})$/);
    if (venezuelaMatch) {
        return `${venezuelaMatch[1]}-${venezuelaMatch[2]}`;
    }
    const numericMatch = cleaned.match(/^\d{9}$/);
    if (numericMatch) {
        return cleaned;
    }
    return cleaned;
}
exports.normalizeCedulaInput = normalizeCedulaInput;
//# sourceMappingURL=cedula-code.util.js.map