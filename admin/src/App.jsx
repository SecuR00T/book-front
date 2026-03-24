import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import ProductListPage from "@/pages/products/ProductList";
import ProductFormPage from "@/pages/products/ProductForm";
import ProductDetailPage from "@/pages/products/ProductDetail";
import OrderListPage from "@/pages/orders/OrderList";
import OrderDetailPage from "@/pages/orders/OrderDetail";
import CustomerListPage from "@/pages/customers/CustomerList";
import CustomerDetailPage from "@/pages/customers/CustomerDetail";
import InventoryPage from "@/pages/Inventory";
import CustomerServicePage from "@/pages/CustomerService";
import MonitoringPage from "@/pages/Monitoring";
import CouponsPage from "@/pages/Coupons";
import ReviewsPage from "@/pages/Reviews";
import NoticesPage from "@/pages/Notices";
import PopupsPage from "@/pages/Popups";
import SettingsPage from "@/pages/Settings";
import PaymentsPage from "@/pages/Payments";
import NotFound from "@/pages/NotFound";
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
const normalizeBasePath = (value) => {
    if (!value || value === "/") return "/";
    const withSlash = value.startsWith("/") ? value : `/${value}`;
    return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
};
const routerBasePath = normalizeBasePath(import.meta.env.BASE_URL);
const App = () => (<QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={routerBasePath}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />}/>
            <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace/>}/>
              <Route path="dashboard" element={<DashboardPage />}/>
              <Route path="products" element={<ProductListPage />}/>
              <Route path="products/new" element={<ProductFormPage />}/>
              <Route path="products/:id" element={<ProductDetailPage />}/>
              <Route path="orders" element={<OrderListPage />}/>
              <Route path="orders/:id" element={<OrderDetailPage />}/>
              <Route path="customers" element={<CustomerListPage />}/>
              <Route path="customers/:id" element={<CustomerDetailPage />}/>
              <Route path="inventory" element={<InventoryPage />}/>
              <Route path="customer-service" element={<CustomerServicePage />}/>
              <Route path="monitoring" element={<MonitoringPage />}/>
              <Route path="coupons" element={<CouponsPage />}/>
              <Route path="reviews" element={<ReviewsPage />}/>
              <Route path="notices" element={<NoticesPage />}/>
              <Route path="popups" element={<PopupsPage />}/>
              <Route path="payments" element={<PaymentsPage />}/>
              <Route path="settings" element={<SettingsPage />}/>
            </Route>
            <Route path="*" element={<NotFound />}/>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>);
export default App;
