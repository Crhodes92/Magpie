export default function ItemTags({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null
  return (
    <div className="absolute left-0 right-0 -bottom-1 translate-y-full flex flex-wrap gap-1 pt-1 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
      {tags.map(tag => (
        <span key={tag} className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md">
          {tag}
        </span>
      ))}
    </div>
  )
}
