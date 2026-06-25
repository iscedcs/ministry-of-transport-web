import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { coreServices } from "@/lib/services-data";

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <Navbar />

      <main className="flex-1">
        {/* Header Section */}
        <section className="bg-muted/30 px-6 py-16 md:py-24 border-b border-border/60">
          <div className="mx-auto w-full max-w-6xl text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Our Services
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Comprehensive digital services designed to optimize Anambra&apos;s transport operations, revenue collection, and compliance management.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coreServices.map((module) => {
              const Icon = module.icon;
              const cardContent = (
                <Card
                  key={module.title}
                  className={`border-border/70 bg-card/60 transition-colors h-full ${
                    module.href
                      ? "hover:bg-card hover:border-primary/40 hover:shadow-sm cursor-pointer"
                      : "opacity-70"
                  }`}>
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="grid h-10 w-10 place-content-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      {!module.href && (
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl leading-snug">
                      {module.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {module.description}
                    </p>
                  </CardContent>
                </Card>
              );
              return module.href ? (
                <Link key={module.title} href={module.href} className="block h-full">
                  {cardContent}
                </Link>
              ) : (
                <div key={module.title} className="h-full">{cardContent}</div>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
