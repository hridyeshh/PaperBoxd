import Image from "next/image";

import { Header } from "@/components/ui/layout/header-with-search";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dock, type DockItem } from "@/components/ui/dock-two";
import { savedBoards, boardSuggestions } from "@/lib/mock/profileBoards";
import { InteractiveHoverButton } from "@/components/ui/shared/interactive-hover-button";

function BoardCard({
  title,
  cover,
  pins,
  updatedAgo,
}: {
  title: string;
  cover: string;
  pins: number;
  updatedAgo: string;
}) {
  return (
    <div className="group flex w-[220px] flex-shrink-0 flex-col gap-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-sm transition-transform duration-300 group-hover:-translate-y-1">
        <Image src={cover} alt={title} fill className="object-cover" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">
          {pins} Pins · {updatedAgo}
        </p>
      </div>
    </div>
  );
}

function CreateBoardCard({ label }: { label: string }) {
  return (
    <div className="flex w-[220px] flex-shrink-0 flex-col gap-3">
      <div className="flex aspect-[3/4] items-center justify-center rounded-3xl border border-dashed border-muted-foreground/40 bg-muted/30">
        <Button className="rounded-full px-6">Create board</Button>
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{label}</h3>
        <p className="text-sm text-muted-foreground">Start a new board</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const dockItems: DockItem[] = [
    { label: "Profile" },
    { label: "Activity" },
    { label: "Bookshelf" },
    { label: "Authors" },
    { label: "Lists" },
    { label: "'to-be-read'" },
    { label: "Likes" },
  ];

  return (
    <main className="relative min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 pb-16 pt-12 md:px-8">
          <header className="flex flex-col gap-6">
            <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Your saved ideas
                </h1>
                <p className="text-sm text-muted-foreground">All your boards, pins, and collages in one place.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-4">
                  <Image
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80"
                    alt="User avatar"
                    width={64}
                    height={64}
                    className="rounded-full border-2 border-foreground/80 object-cover"
                  />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">hridyesh</p>
                  </div>
                </div>
                <InteractiveHoverButton
                  text="Edit profile"
                  showIdleAccent={false}
                  invert
                  className="w-36"
                />
              </div>
            </div>

            <Dock items={dockItems} className="justify-start px-0" />
          </header>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Boards</h2>
            </div>
            <div className="flex flex-nowrap gap-6 overflow-x-auto pb-4">
              {savedBoards.map((board) => (
                <BoardCard key={board.id} {...board} />
              ))}
              <CreateBoardCard label="Create board" />
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Board suggestions</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {boardSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="group flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                    <Image src={suggestion.cover} alt={suggestion.title} fill className="object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                      <Button className="rounded-full px-6">Create</Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{suggestion.title}</h3>
                    <p className="text-sm text-muted-foreground">{suggestion.pins} Pins</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

