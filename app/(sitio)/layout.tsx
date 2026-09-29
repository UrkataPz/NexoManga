import { Navbar } from "@/components/NavBar/nav";
import { Footer } from "@/components/Footer/footer";

// envuelve las páginas del sitio con la trama de puntos, la barra de navegación y el footer
export default function SitioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-halftone bg-fixed">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
