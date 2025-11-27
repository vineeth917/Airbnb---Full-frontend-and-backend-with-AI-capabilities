import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import RouterWrapper from './RouterWrapper.jsx'
import store from './store/store'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterWrapper />
    </Provider>
  </React.StrictMode>,
)
