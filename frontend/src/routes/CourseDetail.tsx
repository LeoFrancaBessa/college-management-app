import { useParams, useSearchParams } from 'react-router-dom'
import { Tabs } from '../components/ui/Tabs'
export default function CourseDetail(){
  const {courseId}=useParams(); const [sp,setSp]=useSearchParams(); const tab=sp.get('tab')??'lista'
  void courseId
  return <div>
    <Tabs value={tab} onValueChange={v=> setSp({tab:v})} tabs={[{value:'lista',label:'Lista'},{value:'board',label:'Board'},{value:'cronograma',label:'Cronograma'}]} />
    {tab==='lista' && <div className="py-4 text-sm text-gray-500">Lista — items next task</div>}
    {tab==='board' && <div className="py-4 text-sm text-gray-500">Board — lazy next</div>}
    {tab==='cronograma' && <div className="py-4 text-sm text-gray-500">Cronograma — lazy next</div>}
  </div>
}
