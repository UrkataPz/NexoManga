import { createClient } from "@/lib/supabase/server";
import { firstOf } from "@/lib/utils";
import { isChapterAuthor } from "@/lib/panel_queries";
import { searchWorks, type Work } from "@/lib/works_queries";

// consultas de traducciones y grupos (con la sesión del usuario: la RLS decide qué ve cada uno)

interface NameRow {
  username?: string;
  name?: string;
}

interface JobRow {
  id: string;
  status: string;
  target_language: string;
  material_type: string;
  rejection_note?: string | null;
  chapters: {
    chapter_number: number;
    original_language: string;
    page_count?: number;
    content?: unknown;
    works: { title: string; cover_url: string | null } | { title: string; cover_url: string | null }[] | null;
  } | null;
  user_profiles?: NameRow | NameRow[] | null;
  translation_groups?: NameRow | NameRow[] | null;
  translation_applications?: {
    id: string;
    status: string;
    user_profiles: NameRow | NameRow[] | null;
    translation_groups: NameRow | NameRow[] | null;
  }[];
  chapter_translations?: { content: unknown } | { content: unknown }[] | null;
}

export interface JobSummary {
  id: string;
  status: string;
  workTitle: string;
  coverUrl: string | null;
  chapterNumber: number;
  originalLanguage: string;
  targetLanguage: string;
  materialType: string;
}

// deja solo las URLs de una lista guardada en jsonb
function toUrlList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((url): url is string => typeof url === "string") : [];
}

// convierte una fila de translation_jobs al resumen que usan las pantallas
function toJobSummary(row: JobRow): JobSummary {
  const chapter = firstOf(row.chapters);
  const work = firstOf(chapter?.works);
  return {
    id: row.id,
    status: row.status,
    workTitle: work?.title ?? "Obra",
    coverUrl: work?.cover_url ?? null,
    chapterNumber: Number(chapter?.chapter_number ?? 0),
    originalLanguage: chapter?.original_language ?? "",
    targetLanguage: row.target_language,
    materialType: row.material_type,
  };
}

const JOB_SELECT =
  "id, status, target_language, material_type, chapters(chapter_number, original_language, works(title, cover_url))";

// ---------- tablero público ----------

// trabajos abiertos para postularse (los más nuevos primero)
export async function getOpenJobs(): Promise<JobSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("translation_jobs")
    .select(JOB_SELECT)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    return [];
  }

  return (data as unknown as JobRow[]).filter((row) => row.chapters).map(toJobSummary);
}

// ids de los trabajos a los que el usuario ya se postuló
export async function getMyAppliedJobIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();

  const { data } = await supabase.from("translation_applications").select("job_id").eq("translator_id", userId);

  return new Set((data ?? []).map((row) => row.job_id));
}

// ---------- autor ----------

export interface TranslatableChapter {
  id: string;
  label: string;
  originalLanguage: string;
  requestedLanguages: string[];
}

// capítulos publicados del autor, con los idiomas que ya pidió traducir
export async function getMyTranslatableChapters(userId: string): Promise<TranslatableChapter[]> {
  const supabase = await createClient();

  const { data: authorRows } = await supabase.from("work_authors").select("work_id").eq("user_id", userId);
  if (!authorRows || authorRows.length === 0) return [];

  const { data, error } = await supabase
    .from("chapters")
    .select("id, chapter_number, original_language, works(title), translation_jobs(target_language)")
    .in("work_id", authorRows.map((row) => row.work_id))
    .eq("publication_status", "published")
    .order("chapter_number", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    label: `${firstOf(row.works)?.title ?? "Obra"} — Cap. ${row.chapter_number}`,
    originalLanguage: row.original_language,
    requestedLanguages: row.translation_jobs.map((job) => job.target_language),
  }));
}

export interface RequestedJob extends JobSummary {
  pendingApplications: number;
}

// trabajos de traducción que pidió el autor (de todas sus obras)
export async function getMyRequestedJobs(userId: string): Promise<RequestedJob[]> {
  const supabase = await createClient();

  const { data: authorRows } = await supabase.from("work_authors").select("work_id").eq("user_id", userId);
  if (!authorRows || authorRows.length === 0) return [];

  const { data: chapterRows } = await supabase
    .from("chapters")
    .select("id")
    .in("work_id", authorRows.map((row) => row.work_id));
  if (!chapterRows || chapterRows.length === 0) return [];

  const { data, error } = await supabase
    .from("translation_jobs")
    .select(`${JOB_SELECT}, translation_applications(id, status)`)
    .in("chapter_id", chapterRows.map((row) => row.id))
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data as unknown as JobRow[]).map((row) => ({
    ...toJobSummary(row),
    pendingApplications: (row.translation_applications ?? []).filter((app) => app.status === "pending").length,
  }));
}

// revisa si el usuario es autor de la obra de un trabajo de traducción
export async function isJobAuthor(userId: string, jobId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("translation_jobs").select("chapter_id").eq("id", jobId).maybeSingle();
  return data ? isChapterAuthor(userId, data.chapter_id) : false;
}

export interface JobApplication {
  id: string;
  status: string;
  translatorName: string;
  groupName: string | null;
}

export interface AuthorJobDetail extends JobSummary {
  translatorName: string | null;
  groupName: string | null;
  rejectionNote: string | null;
  applications: JobApplication[];
  translatedPages: string[];
}

// un trabajo visto por su autor: postulantes, quién lo tiene y las páginas enviadas
export async function getJobForAuthor(userId: string, jobId: string): Promise<AuthorJobDetail | null> {
  if (!(await isJobAuthor(userId, jobId))) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("translation_jobs")
    .select(
      `${JOB_SELECT}, rejection_note, user_profiles(username), translation_groups(name), translation_applications(id, status, user_profiles(username), translation_groups(name)), chapter_translations(content)`,
    )
    .eq("id", jobId)
    .maybeSingle();

  if (error) console.error(error);
  if (!data) return null;

  const row = data as unknown as JobRow;
  return {
    ...toJobSummary(row),
    translatorName: firstOf(row.user_profiles)?.username ?? null,
    groupName: firstOf(row.translation_groups)?.name ?? null,
    rejectionNote: row.rejection_note ?? null,
    applications: (row.translation_applications ?? []).map((app) => ({
      id: app.id,
      status: app.status,
      translatorName: firstOf(app.user_profiles)?.username ?? "Usuario",
      groupName: firstOf(app.translation_groups)?.name ?? null,
    })),
    translatedPages: toUrlList(firstOf(row.chapter_translations)?.content),
  };
}

// ---------- traductor ----------

export interface TranslatorJob extends JobSummary {
  groupName: string | null;
}

// trabajos asignados al traductor
export async function getMyTranslatorJobs(userId: string): Promise<TranslatorJob[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("translation_jobs")
    .select(`${JOB_SELECT}, translation_groups(name)`)
    .eq("translator_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data as unknown as JobRow[]).map((row) => ({
    ...toJobSummary(row),
    groupName: firstOf(row.translation_groups)?.name ?? null,
  }));
}

export interface MyApplication {
  id: string;
  status: string;
  job: JobSummary | null;
}

// postulaciones del usuario (si no lo eligieron, a veces ya no puede ver el trabajo: job = null)
export async function getMyApplications(userId: string): Promise<MyApplication[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("translation_applications")
    .select(
      "id, status, translation_jobs(id, status, target_language, material_type, chapters(chapter_number, original_language, works(title, cover_url)))",
    )
    .eq("translator_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((row) => {
    const job = firstOf(row.translation_jobs as unknown as JobRow | JobRow[] | null);
    return { id: row.id, status: row.status, job: job?.chapters ? toJobSummary(job) : null };
  });
}

export interface TranslatorJobDetail extends JobSummary {
  rejectionNote: string | null;
  originalPageCount: number;
  originalPages: string[];
  translatedPages: string[];
}

// un trabajo visto por su traductor: páginas originales y las que ya envió
export async function getJobForTranslator(userId: string, jobId: string): Promise<TranslatorJobDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("translation_jobs")
    .select(
      "id, status, target_language, material_type, rejection_note, chapters(chapter_number, original_language, page_count, content, works(title, cover_url)), chapter_translations(content)",
    )
    .eq("id", jobId)
    .eq("translator_id", userId)
    .maybeSingle();

  if (error) console.error(error);
  if (!data) return null;

  const row = data as unknown as JobRow;
  const chapter = firstOf(row.chapters);
  return {
    ...toJobSummary(row),
    rejectionNote: row.rejection_note ?? null,
    originalPageCount: chapter?.page_count ?? 0,
    originalPages: toUrlList(chapter?.content),
    translatedPages: toUrlList(firstOf(row.chapter_translations)?.content),
  };
}

// ---------- grupos ----------

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  maxMembers: number;
}

// grupos con al menos un miembro (los vacíos se esconden)
export async function getGroups(): Promise<GroupSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("translation_groups")
    .select("id, name, description, max_members, translation_group_members(user_id)")
    .order("name");

  if (error) {
    console.error(error);
    return [];
  }

  return data
    .map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: group.translation_group_members.length,
      maxMembers: group.max_members,
    }))
    .filter((group) => group.memberCount > 0);
}

export interface MyGroup {
  id: string;
  name: string;
  role: string;
}

// el grupo del usuario (solo puede tener uno) y su rol en él
export async function getMyGroup(userId: string): Promise<MyGroup | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("translation_group_members")
    .select("role, translation_groups(id, name)")
    .eq("user_id", userId)
    .maybeSingle();

  const group = firstOf(data?.translation_groups);
  if (!data || !group) return null;
  return { id: group.id, name: group.name, role: data.role };
}

export interface GroupMember {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  maxMembers: number;
  members: GroupMember[];
  works: Work[];
}

// un grupo con sus miembros (el líder primero) y las obras que tradujo
export async function getGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("translation_groups")
    .select(
      "id, name, description, max_members, translation_group_members(user_id, role, user_profiles(username, profile_image_url))",
    )
    .eq("id", groupId)
    .maybeSingle();

  if (error) console.error(error);
  if (!data) return null;

  const members = data.translation_group_members
    .map((member) => {
      const profile = firstOf(member.user_profiles);
      return {
        userId: member.user_id,
        username: profile?.username ?? "Usuario",
        avatarUrl: profile?.profile_image_url ?? null,
        role: member.role,
      };
    })
    .sort((a, b) => (a.role === "leader" ? -1 : b.role === "leader" ? 1 : 0));

  const { data: jobRows } = await supabase
    .from("translation_jobs")
    .select("chapters(work_id)")
    .eq("group_id", groupId)
    .eq("status", "published");

  const workIds = new Set<string>();
  for (const row of jobRows ?? []) {
    const workId = firstOf(row.chapters)?.work_id;
    if (workId) workIds.add(workId);
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    maxMembers: data.max_members,
    members,
    works: workIds.size > 0 ? await searchWorks({ onlyIds: Array.from(workIds) }) : [],
  };
}

// porcentaje de cada miembro (id → %); la BD solo se lo da a los miembros del grupo
export async function getGroupShares(groupId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_group_shares", { p_group_id: groupId });

  const shares: Record<string, number> = {};
  for (const row of (data ?? []) as { member_id: string; share: number }[]) {
    shares[row.member_id] = row.share;
  }
  return shares;
}

export interface GroupInvite {
  id: string;
  userId: string;
  username: string;
}

// invitaciones pendientes de un grupo (la BD solo se las muestra al líder)
export async function getGroupInvites(groupId: string): Promise<GroupInvite[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("translation_group_invites")
    .select("id, user_id, user_profiles(username)")
    .eq("group_id", groupId)
    .order("created_at");

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: firstOf(row.user_profiles)?.username ?? "Usuario",
  }));
}

export interface MyInvite {
  id: string;
  groupId: string;
  groupName: string;
}

// invitaciones que recibió el usuario
export async function getMyInvites(userId: string): Promise<MyInvite[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("translation_group_invites")
    .select("id, group_id, translation_groups(name)")
    .eq("user_id", userId)
    .order("created_at");

  return (data ?? []).map((row) => ({
    id: row.id,
    groupId: row.group_id,
    groupName: firstOf(row.translation_groups)?.name ?? "Grupo",
  }));
}
