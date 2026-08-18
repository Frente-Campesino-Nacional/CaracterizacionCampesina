export type EntityFilterType = 'all' | 'campesino' | 'usuario' | 'consejo' | 'formulario';

export interface EntityFilterOption {
  key: EntityFilterType;
  label: string;
}

export const ENTITY_FILTER_OPTIONS: EntityFilterOption[] = [
  { key: 'all', label: 'Todas las entidades' },
  { key: 'campesino', label: 'Campesinos' },
  { key: 'usuario', label: 'Usuarios' },
  { key: 'consejo', label: 'Consejos Comunales' },
  { key: 'formulario', label: 'Formularios' },
];

export function filterItemsByEntity<T extends { entidad?: string }>(
  items: T[],
  entityFilter: EntityFilterType
): T[] {
  if (entityFilter === 'all') return items;

  const target = (entityFilter || '').toLowerCase().trim();
  return items.filter((item) => {
    const ent = (item.entidad || '').toLowerCase().trim();
    if (target === 'usuario') {
      return ent.includes('usuario') || ent.includes('persona');
    }
    if (target === 'campesino') {
      return ent.includes('campesino');
    }
    if (target === 'consejo') {
      return ent.includes('consejo');
    }
    if (target === 'formulario') {
      return ent.includes('formulario');
    }
    return ent.includes(target);
  });
}