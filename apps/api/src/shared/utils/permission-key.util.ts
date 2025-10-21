export function formatPermissionKey(resource: string, action: string): string {
  return `${resource}.${action}`;
}

export function parsePermissionKey(key: string): { resource: string; action: string } {
  const separatorIndex = key.indexOf('.');
  if (separatorIndex <= 0 || separatorIndex === key.length - 1) {
    throw new Error(`Invalid permission key format: ${key}`);
  }

  return {
    resource: key.slice(0, separatorIndex),
    action: key.slice(separatorIndex + 1),
  };
}
