import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
// import Cytoscape from 'cytoscape'
import './index.css'
import logo from './assets/react.svg'

// let cy = Cytoscape({ headless: true })
// console.log(cy)
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div style={{ backgroundColor: 'black' }}></div>
    <img src={logo} className="logo react" alt="React logo" />
  </React.StrictMode>,
)
