import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { getToken } from "./lib/api";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Items from "./pages/Items";
import Hotels from "./pages/Hotels";
import Buyers from "./pages/Buyers";
import Suppliers from "./pages/Suppliers";
import AppLayout from "./components/AppLayout";
import Prices from "./pages/Prices";
import Orders from "./pages/Orders";
import Cash from "./pages/Cash";
import Purchases from "./pages/Purchases";
import SupplierPayments from "./pages/SupplierPayments";

function Protected({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route
            path="/items"
            element={
              <Protected>
                <Items />
              </Protected>
            }
          />
          <Route
            path="/hotels"
            element={
              <Protected>
                <Hotels />
              </Protected>
            }
          />
          <Route
            path="/suppliers"
            element={
              <Protected>
                <Suppliers />
              </Protected>
            }
          />
          <Route
            path="/buyers"
            element={
              <Protected>
                <Buyers />
              </Protected>
            }
          />
          <Route
            path="/prices"
            element={
              <Protected>
                <Prices />
              </Protected>
            }
          />
          <Route
            path="/orders"
            element={
              <Protected>
                <Orders />
              </Protected>
            }
          />
          <Route
            path="/purchases"
            element={
              <Protected>
                <Purchases />
              </Protected>
            }
          />
          <Route
            path="/supplier-payments"
            element={
              <Protected>
                <SupplierPayments />
              </Protected>
            }
          />
          <Route
            path="/cash"
            element={
              <Protected>
                <Cash />
              </Protected>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
