import { getPlatformAnnouncements } from "@/lib/community_queries";

// anuncios oficiales de NexoManga (los publica el admin)
export default async function AnunciosPage() {
  const announcements = await getPlatformAnnouncements();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">Anuncios</h1>
        <p className="text-muted-foreground">Novedades oficiales de NexoManga.</p>
      </div>

      {announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay anuncios.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{announcement.title}</h2>
                <span className="shrink-0 text-xs text-muted-foreground">{announcement.dateLabel}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{announcement.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
