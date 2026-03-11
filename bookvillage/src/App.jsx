import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import BookDetail from "./pages/BookDetail";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BookSearch from "./pages/BookSearch";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Mypage from "./pages/Mypage";
import MypageAccount from "./pages/MypageAccount";
import MypageActivity from "./pages/MypageActivity";
import MypageWallet from "./pages/MypageWallet";
import CustomerService from "./pages/CustomerService";
import CustomerInquiryList from "./pages/CustomerInquiryList";
import CustomerInquiryDetail from "./pages/CustomerInquiryDetail";
import Board from "./pages/Board";
import BoardDetail from "./pages/BoardDetail";
import BoardWrite from "./pages/BoardWrite";
import GuestOrderLookup from "./pages/GuestOrderLookup";
import Security from "./pages/Security";
import FileUpload from "./pages/FileUpload";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AccountRecovery from "./pages/AccountRecovery";
import Events from "./pages/Events";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

const queryClient = new QueryClient();

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/book/:id" element={<BookDetail />} />
              <Route path="/books" element={<BookSearch />} />
              <Route path="/login" element={<Login />} />
              <Route path="/account-recovery" element={<AccountRecovery />} />
              <Route path="/register" element={<Register />} />
              <Route path="/terms/service" element={<TermsOfService />} />
              <Route path="/terms/privacy" element={<PrivacyPolicy />} />
              <Route path="/guest-orders" element={<GuestOrderLookup />} />
              <Route path="/events" element={<Events />} />
              <Route path="/security" element={<Security />} />
              <Route path="/file-upload" element={<FileUpload />} />
              <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
              <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
              <Route path="/orders/:orderId" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
              <Route path="/mypage" element={<PrivateRoute><Mypage /></PrivateRoute>} />
              <Route path="/mypage/account" element={<PrivateRoute><MypageAccount /></PrivateRoute>} />
              <Route path="/mypage/activity" element={<PrivateRoute><MypageActivity /></PrivateRoute>} />
              <Route path="/mypage/wallet" element={<PrivateRoute><MypageWallet /></PrivateRoute>} />
              <Route path="/customer-service" element={<CustomerService />} />
              <Route path="/customer-service/inquiries" element={<PrivateRoute><CustomerInquiryList /></PrivateRoute>} />
              <Route path="/customer-service/inquiries/:inquiryId" element={<PrivateRoute><CustomerInquiryDetail /></PrivateRoute>} />
              <Route path="/board" element={<PrivateRoute><Board /></PrivateRoute>} />
              <Route path="/board/new" element={<PrivateRoute><BoardWrite /></PrivateRoute>} />
              <Route path="/board/:postId" element={<PrivateRoute><BoardDetail /></PrivateRoute>} />
              <Route path="/board/:postId/edit" element={<PrivateRoute><BoardWrite /></PrivateRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
