import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Clients } from './pages/Clients'
import { ClientDetail } from './pages/ClientDetail'
import { SessionInbox } from './pages/SessionInbox'
import { Supervision } from './pages/Supervision'
import { TreatmentPlans } from './pages/TreatmentPlans'
import { CasePresentations } from './pages/CasePresentations'
import { ClinicalLearning } from './pages/ClinicalLearning'
import { DocumentationGaps } from './pages/DocumentationGaps'
import { Practicum } from './pages/Practicum'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/inbox" element={<SessionInbox />} />
          <Route path="/supervision" element={<Supervision />} />
          <Route path="/treatment-plans" element={<TreatmentPlans />} />
          <Route path="/presentations" element={<CasePresentations />} />
          <Route path="/learning" element={<ClinicalLearning />} />
          <Route path="/gaps" element={<DocumentationGaps />} />
          <Route path="/practicum" element={<Practicum />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
