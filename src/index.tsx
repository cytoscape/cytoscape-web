import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import './index.css'
import logo from './assets/react.svg'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div></div>
    <img src={logo} className="logo react" alt="React logo" />
  </React.StrictMode>,
)
