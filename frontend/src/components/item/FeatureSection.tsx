export function FeatureSection({title, enabled, onToggle, children}:{title:string; enabled:boolean; onToggle:(v:boolean)=>void; children:React.ReactNode}){
  return <div className="border border-gray-200 rounded-xl bg-white">
    <div className="flex items-center justify-between px-4 py-3"><h3 className="font-medium">{title}</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e=> onToggle(e.target.checked)} /> Ativar</label></div>
    {enabled && <div className="px-4 pb-4 border-t border-gray-200 pt-4">{children}</div>}
  </div>
}
