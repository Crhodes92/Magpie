export default function ItemTags({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null
  return (
    <div className="absolute top-1.5 right-1.5 flex flex-wrap justify-end gap-1 max-w-[85%] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
      {tags.map(tag => (
        <span key={tag} className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md">
          {tag}
        </span>
      ))}
    </div>
  )
}
