import { Alert } from 'react-native';

/**
 * Convierte cualquier error técnico (Axios, NestJS DTO, red, 400, 409, 500)
 * a un mensaje comprensible y amigable en español.
 */
export function getHumanizedErrorMessage(error: any, fallbackMessage: string = 'Ocurrió un inconveniente al procesar la solicitud'): string {
  if (!error) {
    return fallbackMessage;
  }

  // 1. Errores de Red / Sin conexión
  const errorMessage = String(error?.message || '').toLowerCase();
  const errorName = String(error?.name || '').toLowerCase();
  if (
    errorMessage.includes('network error') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('timeout') ||
    errorName.includes('axioserror') && !error?.response
  ) {
    return 'No se pudo conectar con el servidor. Por favor, verifica tu conexión a Internet o intenta nuevamente.';
  }

  // 2. Extraer respuesta HTTP del backend si existe
  const responseData = error?.response?.data;
  const status = error?.response?.status;
  const backendMessage = responseData?.message;

  // Si la respuesta trae un mensaje o arreglo de mensajes de NestJS / class-validator
  if (backendMessage) {
    if (Array.isArray(backendMessage)) {
      const translatedList = backendMessage.map((msg) => translateValidationString(String(msg)));
      return translatedList.join('\n• ');
    }

    if (typeof backendMessage === 'string') {
      return translateValidationString(backendMessage);
    }
  }

  // 3. Traducir según código de estado HTTP
  if (status === 400) {
    return 'Por favor, verifica que todos los campos estén completados correctamente.';
  }
  if (status === 401) {
    return 'Credenciales incorrectas o tu sesión ha expirado. Por favor, inicia sesión de nuevo.';
  }
  if (status === 403) {
    return 'No tienes permisos suficientes para realizar esta acción.';
  }
  if (status === 404) {
    return 'El registro solicitado no fue encontrado o ha sido eliminado.';
  }
  if (status === 409) {
    return 'Ya existe un registro con estos mismos datos (correo, cédula o usuario registrado).';
  }
  if (status >= 500) {
    return 'Ocurrió un inconveniente temporal en el servidor. Por favor, intenta de nuevo en unos momentos.';
  }

  // Fallback si trae un mensaje de error no vacío
  if (typeof error === 'string') {
    return translateValidationString(error);
  }

  if (error?.message && typeof error.message === 'string' && !error.message.includes('Request failed')) {
    return translateValidationString(error.message);
  }

  return fallbackMessage;
}

/**
 * Traduce cadenas técnicas de validación a frases naturales en español.
 */
function translateValidationString(text: string): string {
  const str = text.trim();
  const lower = str.toLowerCase();

  if (lower.includes('email must be an email') || lower.includes('email invalido') || lower.includes('must be an email')) {
    return 'El correo electrónico no tiene un formato válido (ejemplo: usuario@dominio.com).';
  }
  if (lower.includes('password must be longer than') || lower.includes('minimo 8 caracteres') || lower.includes('minimal length is 8')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (lower.includes('should not be empty') || lower.includes('is required') || lower.includes('debe ser obligatorio')) {
    return 'Todos los campos obligatorios deben estar completados.';
  }
  if (lower.includes('cedula') && lower.includes('registrada')) {
    return 'La cédula ingresada ya pertenece a otro registro en el sistema.';
  }
  if (lower.includes('invalid credentials') || lower.includes('unauthorized') || lower.includes('credenciales')) {
    return 'El correo electrónico o la contraseña ingresados no son correctos.';
  }
  if (lower.includes('user not found') || lower.includes('usuario no encontrado')) {
    return 'El usuario indicado no existe en el sistema.';
  }
  if (lower.includes('cannot convert null') || lower.includes('null value to object') || lower.includes('convertir un valor nulo')) {
    return 'Ocurrió un inconveniente al cargar la información. Por favor, desliza hacia abajo para actualizar la pantalla.';
  }

  // Si ya está en español comprensible, retornarlo con la primera letra en mayúscula
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Muestra una alerta nativa de Éxito al completar una acción.
 */
export function showSuccessAlert(title: string, message: string, onPress?: () => void) {
  Alert.alert(
    `✅ ${title}`,
    message,
    [{ text: 'Entendido', onPress }],
    { cancelable: true }
  );
}

/**
 * Muestra una alerta nativa de Error con mensaje amigable e interpretado.
 */
export function showErrorAlert(error: any, fallbackMessage: string = 'No se pudo completar la operación', defaultTitle: string = 'Atención') {
  const humanizedMessage = getHumanizedErrorMessage(error, fallbackMessage);
  const msgLower = humanizedMessage.toLowerCase();
  let title = defaultTitle;

  if (msgLower.includes('correo') && (msgLower.includes('registrado') || msgLower.includes('diferente'))) {
    title = 'Correo ya registrado';
  } else if (msgLower.includes('cédula') && (msgLower.includes('registrad') || msgLower.includes('pertenece'))) {
    title = 'Cédula ya registrada';
  }

  Alert.alert(
    `⚠️ ${title}`,
    humanizedMessage,
    [{ text: 'Aceptar' }],
    { cancelable: true }
  );
}