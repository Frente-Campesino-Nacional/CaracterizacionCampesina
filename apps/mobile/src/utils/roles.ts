export function isAdminRole(role?: string | null): boolean {
  const normalizedRole = role?.trim().toLowerCase();
  return normalizedRole === 'admin' || normalizedRole === 'administrador';
}