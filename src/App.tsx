import { useState } from 'react'
import { BatchView } from './ui/BatchView'
import { RaceView } from './ui/RaceView'

type Tab = 'race' | 'batch'

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'race', label: 'Race' },
  { id: 'batch', label: 'Batch benchmark' },
]

function App() {
  const [tab, setTab] = useState<Tab>('race')

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <h1>Mazerunner</h1>
          <span className="brand-sub">maze exploration lab</span>
        </div>
        <nav className="tabs" role="tablist" aria-label="Mode">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {/* Both views stay mounted so race state and a running batch survive tab switches. */}
      <main>
        {TABS.map((t) => (
          <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={tab !== t.id}>
            {t.id === 'race' ? <RaceView /> : <BatchView />}
          </div>
        ))}
      </main>
    </>
  )
}

export default App
