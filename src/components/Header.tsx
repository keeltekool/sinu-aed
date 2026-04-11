"use client";

export default function Header() {
  return (
    <header className="bg-surface sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4 w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">
            eco
          </span>
          <div className="flex flex-col">
            <h1 className="headline text-primary font-bold tracking-tight text-xl leading-none">
              Sinu Aed
            </h1>
            <span className="text-[10px] text-secondary font-medium tracking-wide uppercase">
              Leia parim hind
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
