export const API = '/api';

export function errMsg(e: any): string {
  const b = e?.error;
  if (typeof b === 'string' && b) return b;
  if (b?.message) return b.message;
  if (e?.status === 403) return 'You do not have permission to do that.';
  if (e?.status) return `Request failed (${e.status}${b?.error ? ': ' + b.error : ''})`;
  return 'Cannot reach the server.';
}
