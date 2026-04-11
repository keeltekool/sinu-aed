import SearchBar from "../components/SearchBar";
import CategoryGrid from "../components/CategoryGrid";

export default function HomePage() {
  return (
    <div className="pt-8 space-y-10">
      <section className="space-y-4">
        <h2 className="headline font-bold text-3xl tracking-tight text-primary leading-tight">
          Kõik aiatarbed ühest kohast,{" "}
          <span className="text-primary-container">parima hinnaga</span>.
        </h2>
        <SearchBar autoFocus />
      </section>

      <CategoryGrid />
    </div>
  );
}
