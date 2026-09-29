// límites de las publicaciones de comunidad
export const POST_MAX_LENGTH = 2000;
export const POST_IMAGE_MAX_MB = 4;

// rol que se muestra junto al nombre en comunidad
export function getCommunityRoleLabel(roles: string[]): string {
  const isAuthor = roles.includes("author");
  const isTranslator = roles.includes("translator");
  if (isAuthor && isTranslator) return "Autor y traductor";
  if (isAuthor) return "Autor";
  if (isTranslator) return "Traductor";
  return "Lector";
}
