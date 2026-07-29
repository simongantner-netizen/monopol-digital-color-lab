import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Boundary from './components/Boundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/*
      Outside App on purpose. A boundary inside the tree it is meant to protect
      cannot catch the tree unmounting around it, and the things this app can
      throw on — the address bar, the audio context, the WebGL context — are
      reached from effects at the very top.
    */}
    <Boundary>
      <App />
    </Boundary>
  </StrictMode>,
)
