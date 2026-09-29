export const LIBRARY_TAGS = ["following" ,"to_read", "read", "favorite", "dislike"] as const;
export type LibraryTag = (typeof LIBRARY_TAGS)[number];

export const LIBRARY_TAG_LABELS: Record<LibraryTag, string> = {
  following: "Siguiendo",
  to_read: "Por Leer",
  read: "Leído",
  favorite: "Favorito",
  dislike: "No me Gusta",
};