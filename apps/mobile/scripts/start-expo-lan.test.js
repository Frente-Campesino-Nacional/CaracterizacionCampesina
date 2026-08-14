const assert = require('assert');
const { getExpoArgs } = require('./start-expo-lan.cjs');

const args = getExpoArgs({ mode: 'tunnel', selectedPort: 8081, openAndroid: true });
assert.ok(args.includes('--tunnel'), 'debe incluir el modo tunnel por defecto');
assert.ok(args.includes('--android'), 'debe incluir la bandera para Android cuando openAndroid es true');
assert.ok(args.includes('--port'), 'debe incluir la opción de puerto');
assert.ok(args.includes('8081'), 'debe incluir el puerto seleccionado');

const argsNoAndroid = getExpoArgs({ mode: 'lan', selectedPort: 8081, openAndroid: false });
assert.strictEqual(argsNoAndroid.includes('--android'), false, 'no debe incluir la bandera --android por defecto');

console.log('start-expo-lan test passed');

