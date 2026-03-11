import { Search, ShoppingCart, Heart, Menu, X, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const categories = ["베스트셀러", "신간", "소설", "에세이", "인문", "경제/경영", "자기계발", "IT/과학"];

const Header = () => {
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const boardPath = user ? "/board" : "/login";

  const categoryNavItems = useMemo(
    () => categories.map((cat) => ({ label: cat, to: `/books?category=${encodeURIComponent(cat)}` })),
    [],
  );

  const utilityNavItems = useMemo(
    () => [
      { label: "공지사항", to: "/customer-service?tab=notice" },
      { label: "회원게시판", to: boardPath },
      { label: "파일업로드", to: "/file-upload" },
    ],
    [boardPath],
  );

  const handleSearch = (e) => {
    e.preventDefault();
    const rawQuery = searchQuery.trim();
    navigate(rawQuery ? `/books?q=${encodeURIComponent(rawQuery)}` : "/books");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
      <div className="bg-header text-header">
        <div className="container mx-auto flex items-center justify-between px-4 py-1.5 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles size={12} />
            {user ? (
              <span className="font-medium">회원 전용 혜택과 주문 기능을 이용할 수 있습니다.</span>
            ) : (
              <Link to="/register" className="font-medium hover:underline">
                회원가입하면 첫 구매 15% 할인 쿠폰 지급
              </Link>
            )}
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Link to={user ? "/mypage" : "/login"} className="hover:underline opacity-90 hover:opacity-100 transition-opacity">
              마이페이지
            </Link>
            <span className="opacity-40">|</span>
            <Link to={user ? "/orders" : "/login"} className="hover:underline opacity-90 hover:opacity-100 transition-opacity">
              주문조회
            </Link>
            {isAdmin && (
              <>
                <span className="opacity-40">|</span>
                <a href="/admin/" className="hover:underline opacity-90 hover:opacity-100 transition-opacity">
                  관리자
                </a>
              </>
            )}
            <span className="opacity-40">|</span>
            {user ? (
              <button className="hover:underline opacity-90 hover:opacity-100 transition-opacity" onClick={logout}>
                로그아웃
              </button>
            ) : (
              <Link to="/login" className="hover:underline opacity-90 hover:opacity-100 transition-opacity">
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex shrink-0 items-center">
            <img src="/bookvillage-logo.svg?v=bukchon-v150" alt="북촌" className="h-9 w-auto sm:h-11" />
          </Link>

          <form onSubmit={handleSearch} className="hidden flex-1 max-w-2xl sm:flex">
            <div className="relative w-full group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="도서명, 저자, ISBN으로 검색..."
                className="w-full h-12 pl-6 pr-16 rounded-full border border-primary/20 bg-background/80 text-foreground text-sm outline-none transition-all duration-300 group-hover:border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/15 placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 h-9 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button className="p-2 rounded-xl hover:bg-secondary transition-all duration-300 hover:-translate-y-0.5 relative" title="찜 목록">
              <Heart size={20} className="text-muted-foreground" />
            </button>
            <Link to="/cart" className="p-2 rounded-xl hover:bg-secondary transition-all duration-300 hover:-translate-y-0.5 relative" title="장바구니">
              <ShoppingCart size={20} className="text-muted-foreground" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </Link>
            <button className="sm:hidden p-2 rounded-xl hover:bg-secondary transition-all duration-300" onClick={() => setMobileMenuOpen((v) => !v)}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="sm:hidden mt-3">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어를 입력하세요..."
              className="w-full h-11 pl-4 pr-12 rounded-full border border-primary/25 bg-background/85 text-foreground text-sm outline-none transition-all duration-300 focus:border-primary focus:ring-4 focus:ring-primary/15 placeholder:text-muted-foreground"
            />
            <button type="submit" className="absolute right-1 top-1 h-9 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Search size={16} />
            </button>
          </div>
        </form>
      </div>

      <div className="border-t border-border/80">
        <div className="container mx-auto px-4">
          <div className="hidden sm:flex items-center justify-between py-2.5 text-sm font-medium text-muted-foreground">
            <nav className="flex items-center gap-6">
              {categoryNavItems.map((item) => (
                <button
                  key={item.label}
                  className="relative whitespace-nowrap transition-all duration-300 hover:text-primary after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
                  onClick={() => navigate(item.to)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <nav className="flex items-center gap-6 pl-6">
              {utilityNavItems.map((item) => (
                <button
                  key={item.label}
                  className="relative whitespace-nowrap transition-all duration-300 hover:text-primary after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
                  onClick={() => navigate(item.to)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
            className="sm:hidden overflow-hidden border-t border-border bg-card/95 backdrop-blur-md"
          >
            <div className="p-4 space-y-2.5">
              {categoryNavItems.map((item, idx) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="block w-full text-left py-2 px-3 rounded-lg hover:bg-secondary text-sm text-foreground transition-colors"
                  onClick={() => {
                    navigate(item.to);
                    setMobileMenuOpen(false);
                  }}
                >
                  {item.label}
                </motion.button>
              ))}
              <hr className="border-border" />
              {utilityNavItems.map((item) => (
                <button
                  key={item.label}
                  className="block w-full text-left py-2 px-3 rounded-lg hover:bg-secondary text-sm text-foreground transition-colors"
                  onClick={() => {
                    navigate(item.to);
                    setMobileMenuOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
              <hr className="border-border" />
              <Link to="/guest-orders" className="block w-full text-left py-2 px-3 rounded-lg hover:bg-secondary text-sm text-foreground">
                비회원 주문조회
              </Link>
              <Link to={user ? "/mypage" : "/login"} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-secondary text-sm text-foreground">
                마이페이지
              </Link>
              <Link to={user ? "/orders" : "/login"} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-secondary text-sm text-foreground">
                주문조회
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
