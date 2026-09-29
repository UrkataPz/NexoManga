import { getPlatformAnnouncements } from "@/lib/community_queries";
import { deleteAnnouncement } from "@/features/admin/admin-actions";
import { AnnouncementForm } from "@/components/Admin/announcement-form";
import { ActionButton } from "@/components/ActionButton/action-button";

// el admin publica y borra los anuncios oficiales (se ven en /anuncios)
export default async function AdminAnunciosPage() {
  const announcements = await getPlatformAnnouncements();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Anuncios</h1>
        <p className="text-muted-foreground">Los anuncios oficiales que todos ven en /anuncios.</p>
      </div>

      <AnnouncementForm />

      {announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay anuncios.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{announcement.title}</h2>
                <span className="shrink-0 text-xs text-muted-foreground">{announcement.dateLabel}</span>
              </div>
              <p className="whitespace-pre-line text-sm">{announcement.content}</p>
              <div>
                <ActionButton
                  action={deleteAnnouncement.bind(null, announcement.id)}
                  label="Borrar"
                  confirmText="¿Borrar este anuncio?"
                  successText="Anuncio borrado."
                  variant="destructive"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
