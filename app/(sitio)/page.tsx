import { AdSlot } from "@/components/AdSlot/ad-slot";
import { WorkCarousel } from "@/components/WorkCarousel/work-carousel";
import { getLatestWorks } from "@/lib/works_queries";
import { getPopularWorks } from "@/lib/works_queries";
import { getCurrentPlan } from "@/lib/subscriptions_queries";
import Image from "next/image";

export default async function Home() {
  const latestWorks = await getLatestWorks();
  const popularWorks = await getPopularWorks();
  // los usuarios Premium no ven publicidad
  const showAds = (await getCurrentPlan()) === "free";

  return (
    <main className="flex flex-1 flex-col">
      <section className="w-full overflow-hidden ">
        <Image
          src="/hero.png"
          alt="NexoManga"
          width={1983}
          height={440}
          priority
          className="h-[440px] w-full object-cover"
        />
      </section>

      {showAds && (
        <div className="hidden shrink-0 lg:flex lg:flex-col lg:items-center lg:px-4 lg:py-4">
          <AdSlot size="leaderboard" />
        </div>
      )}

      <div className="flex w-full flex-1">
        {showAds && (
          <aside className="hidden shrink-0 lg:flex lg:flex-col lg:items-center lg:px-4 lg:py-4">
            <AdSlot size="wide-skyscraper" />
          </aside>
        )}

        <div className="min-w-0 flex-1 p-4">
          {showAds && (
            <div className="flex justify-center pb-4 lg:hidden">
              <AdSlot size="mobile-banner" />
            </div>
          )}

          <WorkCarousel title="Recien Añadidos" works={latestWorks}/>
          <br />
          <WorkCarousel title="Mas populares" works={popularWorks}/>
        </div>

        {showAds && (
          <aside className="hidden shrink-0 lg:flex lg:flex-col lg:items-center lg:px-4 lg:py-4">
            <AdSlot size="wide-skyscraper" />
          </aside>
        )}
      </div>
    </main>
  );
}
