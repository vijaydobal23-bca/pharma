import React from 'react'
import { Outlet } from 'react-router-dom'
import { AuthContextProvider } from './features/auth/auth.context';

  const App = () => {
  return (
    <div>
      <Outlet/>
    </div>
  )
}



export default App