import { redirect } from "next/navigation";
import { getAdminId } from "@/features/admin/admin-tools";

// puerta de las páginas de administración: solo entra el admin
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminId = await getAdminId();
  if (!adminId) {
    redirect("/mi-panel");
  }

  return children;
}
