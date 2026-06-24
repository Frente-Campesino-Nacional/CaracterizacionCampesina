-- Asigna un estado y municipio válidos a usuarios existentes con ubicación vacía
UPDATE usuarios
SET estado = 'Distrito Capital', municipio = 'Libertador'
WHERE estado IS NULL OR estado = '' OR municipio IS NULL OR municipio = '';

-- En caso de que existan consejos sin ubicación válidos (schema antigua), también se actualizan.
UPDATE consejos
SET estado = 'Distrito Capital', municipio = 'Libertador'
WHERE estado IS NULL OR estado = '' OR municipio IS NULL OR municipio = '';

-- Asigna un estado y municipio válidos a campesinos existentes con ubicación vacía
UPDATE campesinos
SET estado = 'Distrito Capital', municipio = 'Libertador'
WHERE estado IS NULL OR estado = '' OR municipio IS NULL OR municipio = '';

-- Formulario del predio
INSERT INTO formularios (
	titulo,
	version,
	estructura,
	activo,
	creado_por,
	creado_en,
	actualizado_en
) SELECT
	'Formulario del predio',
	1,
	'{
		"preguntas": [
			{
				"id": "nombre_predio",
				"label": "Nombre del predio",
				"type": "text",
				"required": true,
				"placeholder": "Ingrese el nombre del predio"
			},
			{
				"id": "via_penetracion",
				"label": "Via penetracion",
				"type": "select",
				"required": true,
				"options": [
					{ "label": "Asfalto", "value": "asfalto" },
					{ "label": "Camino de tierra", "value": "camino_de_tierra" }
				]
			},
			{
				"id": "tiene_vivienda",
				"label": "Tiene vivienda en el predio?",
				"type": "select",
				"required": true,
				"options": [
					{ "label": "Si", "value": "si" },
					{ "label": "No", "value": "no" }
				]
			},
			{
				"id": "posee_permiso_sanitario",
				"label": "Posee permiso sanitario?",
				"type": "select",
				"required": true,
				"options": [
					{ "label": "Si", "value": "si" },
					{ "label": "No", "value": "no" }
				]
			},
			{
				"id": "superficie_predio_mt2",
				"label": "Ingrese la superficie del predio por mt2",
				"type": "number",
				"required": true,
				"placeholder": "Cantidad en metros cuadrados"
			},
			{
				"id": "condicion_legal_predio",
				"label": "Condicion legal del predio",
				"type": "select",
				"required": true,
				"options": [
					{ "label": "Titulo de adjudicacion", "value": "titulo_de_adjudicacion" },
					{ "label": "Titulo de propiedad", "value": "titulo_de_propiedad" },
					{ "label": "Sin documento", "value": "sin_documento" }
				]
			},
			{
				"id": "posee_rubros",
				"label": "Posee rubros en el predio?",
				"type": "select",
				"required": true,
				"options": [
					{ "label": "Si", "value": "si" },
					{ "label": "No", "value": "no" }
				]
			},
			{
				"id": "posee_produccion_animal",
				"label": "Posee produccion animal en el predio?",
				"type": "select",
				"required": true,
				"options": [
					{ "label": "Si", "value": "si" },
					{ "label": "No", "value": "no" }
				]
			}
		]
	}'::jsonb,
	TRUE,
	1,
	NOW(),
	NOW()
WHERE NOT EXISTS (
	SELECT 1
	FROM formularios
	WHERE titulo = 'Formulario del predio'
);
