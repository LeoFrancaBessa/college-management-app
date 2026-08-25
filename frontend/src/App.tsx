import { Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<div className="p-8 text-gray-900">Init OK — wire routes next</div>} />
    </Routes>
  )
}
