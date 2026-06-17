import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import NavigationLayout from "./components/NavigationLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import VehicleDetails from "./pages/VehicleDetails";
import AddVehicle from "./pages/AddVehicle";
import StockLog from "./pages/StockLog";
import PendingRequests from "./pages/PendingRequests";
import SalesAnalytics from "./pages/SalesAnalytics";
import UserManagement from "./pages/UserManagement";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Employee Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <NavigationLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="vehicle/:id" element={<VehicleDetails />} />
          <Route path="add-vehicle" element={<AddVehicle />} />
          <Route path="stock-log" element={<StockLog />} />
          <Route path="pending-requests" element={<PendingRequests />} />
          <Route path="sales-analytics" element={<SalesAnalytics />} />
          <Route path="user-management" element={<UserManagement />} />
        </Route>

        {/* Fallback Catch-all Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
