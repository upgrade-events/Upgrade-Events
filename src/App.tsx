import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/auth/LandingPage'
import { Login } from './pages/auth/LoginPage'
import { Register } from './pages/auth/RegisterPage'
import { Home } from './pages/Home/Home'
import { Account } from './pages/Home/Account'
import { Dashboard } from './pages/Home/Dashboard'
import { UsersList } from './pages/Dashboard/UsersList'
import { CreateEvent } from './pages/Events/CreateEvent'
import { MyEvents } from './pages/Events/MyEvents'
import { EditEvent } from './pages/Events/EditEvent'
import { EventsList } from './pages/Events/EventsList'
import { EventDetails } from './pages/Events/EventDetails'
import { BuyTickets } from './pages/Events/BuyTickets'
import { PurchaseSuccess } from './pages/Events/PurchaseSuccess'
import { MyTickets } from './pages/Tickets/MyTickets'
import { Admin } from './pages/Home/Admin'
import { Owner } from './pages/Home/Owner'
import { StaffCheckin } from './pages/Home/Staffcheckin'
import { TicketsManagement } from './pages/Dashboard/TicketsManagement'




function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/account" element={<Account />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/users" element={<UsersList />} />
        <Route path="/events" element={<EventsList />} />
        <Route path="/events/create" element={<CreateEvent />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/events/:id/buy" element={<BuyTickets />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/events/edit/:id" element={<EditEvent />} />
        <Route path="/purchase-success/:orderId" element={<PurchaseSuccess />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/owner" element={<Owner />} />
        <Route path="/staff" element={<StaffCheckin />} />
        <Route path="/dashboard/tickets-management" element={<TicketsManagement />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App