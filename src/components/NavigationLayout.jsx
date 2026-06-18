import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function NavigationLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState("employee@truevalue.com");
  const [userInitial, setUserInitial] = useState("E");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!supabase) {
      const mockSession = localStorage.getItem("truevalue_mock_session");
      if (mockSession) {
        const parsed = JSON.parse(mockSession);
        setUserEmail(parsed.email);
        setUserInitial(parsed.email.substring(0, 2).toUpperCase());
      }
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email);
        setUserInitial(user.email.substring(0, 2).toUpperCase());
      }
    });
  }, []);

  const handleLogout = async () => {
    if (!supabase) {
      localStorage.removeItem("truevalue_mock_session");
      navigate("/login");
      return;
    }
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="bg-surface text-text-main min-h-screen flex flex-col md:flex-row">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface border-b border-surface-variant flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 left-0 right-0">
        <div className="flex items-center gap-3">
          <img src="/saraswati.png" alt="Saraswati Motors Logo" className="h-10 w-10 object-contain" />
          <span className="font-headline-md text-headline-md font-bold text-primary">TrueValue</span>
        </div>
        
        {/* Desktop Top Nav links */}
        <nav className="hidden md:flex items-center gap-gutter h-full">
          <Link to="/" className={`font-label-lg px-2 py-1 transition-all ${isActive("/") ? "text-primary border-b-2 border-primary font-bold" : "text-on-surface-variant hover:text-primary"}`}>Home</Link>
          <Link to="/inventory" className={`font-label-lg px-2 py-1 transition-all ${isActive("/inventory") || location.pathname.startsWith("/vehicle/") ? "text-primary border-b-2 border-primary font-bold" : "text-on-surface-variant hover:text-primary"}`}>Stock</Link>
          <Link to="/sales-analytics" className={`font-label-lg px-2 py-1 transition-all ${isActive("/sales-analytics") ? "text-primary border-b-2 border-primary font-bold" : "text-on-surface-variant hover:text-primary"}`}>Data</Link>
          <Link to="/user-management" className={`font-label-lg px-2 py-1 transition-all ${isActive("/user-management") ? "text-primary border-b-2 border-primary font-bold" : "text-on-surface-variant hover:text-primary"}`}>Admin</Link>
        </nav>

        <div className="flex items-center gap-4 relative">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold overflow-hidden border border-outline-variant hover:bg-surface-container-high transition-colors active:scale-95 duration-100 outline-none cursor-pointer"
            title="User Profile Menu"
          >
            {userInitial}
          </button>

          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-12 w-64 bg-white border border-outline-variant rounded-xl shadow-2xl py-3 z-50 flex flex-col gap-1">
                <div className="px-4 py-2 flex flex-col gap-1 border-b border-outline-variant mb-2">
                  <p className="font-label-lg text-text-main font-bold truncate">Saraswati Employee</p>
                  <p className="font-body-sm text-on-surface-variant truncate text-xs">{userEmail}</p>
                </div>

                <Link 
                  to="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container transition-colors text-left ${isActive("/") ? "text-primary font-bold bg-primary-container/20" : "text-on-surface-variant"}`}
                >
                  <span className="material-symbols-outlined text-lg">dashboard</span>
                  <span className="font-body-md text-sm">Dashboard</span>
                </Link>
                <Link 
                  to="/inventory" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container transition-colors text-left ${isActive("/inventory") ? "text-primary font-bold bg-primary-container/20" : "text-on-surface-variant"}`}
                >
                  <span className="material-symbols-outlined text-lg">directions_car</span>
                  <span className="font-body-md text-sm">Inventory Management</span>
                </Link>
                <Link 
                  to="/stock-log" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container transition-colors text-left ${isActive("/stock-log") ? "text-primary font-bold bg-primary-container/20" : "text-on-surface-variant"}`}
                >
                  <span className="material-symbols-outlined text-lg">history</span>
                  <span className="font-body-md text-sm">Recent Stock Log</span>
                </Link>
                <Link 
                  to="/pending-requests" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container transition-colors text-left ${isActive("/pending-requests") ? "text-primary font-bold bg-primary-container/20" : "text-on-surface-variant"}`}
                >
                  <span className="material-symbols-outlined text-lg">description</span>
                  <span className="font-body-md text-sm">Pending Inquiries</span>
                </Link>
                <Link 
                  to="/sales-analytics" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container transition-colors text-left ${isActive("/sales-analytics") ? "text-primary font-bold bg-primary-container/20" : "text-on-surface-variant"}`}
                >
                  <span className="material-symbols-outlined text-lg">bar_chart</span>
                  <span className="font-body-md text-sm">Sales Analytics</span>
                </Link>
                <Link 
                  to="/user-management" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container transition-colors text-left ${isActive("/user-management") ? "text-primary font-bold bg-primary-container/20" : "text-on-surface-variant"}`}
                >
                  <span className="material-symbols-outlined text-lg">group</span>
                  <span className="font-body-md text-sm">User Management</span>
                </Link>

                <div className="border-t border-outline-variant mt-2 pt-2">
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    <span className="font-body-md text-sm">Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* NavigationDrawer (Desktop Only Sidebar) */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 w-72 bg-surface-container-low py-stack-lg px-stack-md shadow-lg pt-24 z-40">
        <div className="flex flex-col items-start px-4 mb-stack-lg">
          <div className="w-16 h-16 rounded-xl bg-primary mb-4 flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-4xl">admin_panel_settings</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-primary">Saraswati Admin</h3>
          <p className="font-body-sm text-on-surface-variant truncate w-full">{userEmail}</p>
        </div>

        <nav className="flex-grow flex flex-col gap-2">
          <Link 
            to="/" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive("/") ? "bg-primary-container text-on-primary-container font-bold" : "text-on-surface-variant hover:bg-surface-container-high"}`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-body-md">Dashboard</span>
          </Link>
          <Link 
            to="/inventory" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive("/inventory") ? "bg-primary-container text-on-primary-container font-bold" : "text-on-surface-variant hover:bg-surface-container-high"}`}
          >
            <span className="material-symbols-outlined">directions_car</span>
            <span className="font-body-md">Inventory Management</span>
          </Link>
          <Link 
            to="/stock-log" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive("/stock-log") ? "bg-primary-container text-on-primary-container font-bold" : "text-on-surface-variant hover:bg-surface-container-high"}`}
          >
            <span className="material-symbols-outlined">history</span>
            <span className="font-body-md">Recent Stock Log</span>
          </Link>
          <Link 
            to="/pending-requests" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive("/pending-requests") ? "bg-primary-container text-on-primary-container font-bold" : "text-on-surface-variant hover:bg-surface-container-high"}`}
          >
            <span className="material-symbols-outlined">description</span>
            <span className="font-body-md">Pending Inquiries</span>
          </Link>
          <Link 
            to="/sales-analytics" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive("/sales-analytics") ? "bg-primary-container text-on-primary-container font-bold" : "text-on-surface-variant hover:bg-surface-container-high"}`}
          >
            <span className="material-symbols-outlined">bar_chart</span>
            <span className="font-body-md">Sales Analytics</span>
          </Link>
          <Link 
            to="/user-management" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive("/user-management") ? "bg-primary-container text-on-primary-container font-bold" : "text-on-surface-variant hover:bg-surface-container-high"}`}
          >
            <span className="material-symbols-outlined">group</span>
            <span className="font-body-md">User Management</span>
          </Link>
        </nav>

        <div className="pt-4 border-t border-outline-variant mt-auto">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors active:opacity-80 duration-200"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-body-md">Logout</span>
          </button>
          <p className="text-center text-[10px] text-outline mt-4 tracking-widest font-bold">V1.2.0</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow pt-24 pb-32 md:pb-12 md:pl-6 px-margin-mobile md:px-margin-desktop min-h-screen">
        <Outlet />
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-safe h-20 bg-surface border-t border-surface-variant shadow-lg">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center px-3 py-1.5 transition-all ${isActive("/") ? "bg-primary-container text-on-primary-container rounded-xl" : "text-on-surface-variant"}`}
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-label-md text-label-md">Home</span>
        </Link>
        <Link 
          to="/inventory" 
          className={`flex flex-col items-center justify-center px-3 py-1.5 transition-all ${isActive("/inventory") ? "bg-primary-container text-on-primary-container rounded-xl" : "text-on-surface-variant"}`}
        >
          <span className="material-symbols-outlined">directions_car</span>
          <span className="font-label-md text-label-md">Stock</span>
        </Link>
        <Link 
          to="/add-vehicle" 
          className={`flex flex-col items-center justify-center px-3 py-1.5 transition-all ${isActive("/add-vehicle") ? "bg-primary-container text-on-primary-container rounded-xl" : "text-on-surface-variant"}`}
        >
          <span className="material-symbols-outlined">add_box</span>
          <span className="font-label-md text-label-md">Add</span>
        </Link>
        <Link 
          to="/sales-analytics" 
          className={`flex flex-col items-center justify-center px-3 py-1.5 transition-all ${isActive("/sales-analytics") ? "bg-primary-container text-on-primary-container rounded-xl" : "text-on-surface-variant"}`}
        >
          <span className="material-symbols-outlined">bar_chart</span>
          <span className="font-label-md text-label-md">Data</span>
        </Link>
        <Link 
          to="/user-management" 
          className={`flex flex-col items-center justify-center px-3 py-1.5 transition-all ${isActive("/user-management") ? "bg-primary-container text-on-primary-container rounded-xl" : "text-on-surface-variant"}`}
        >
          <span className="material-symbols-outlined">group</span>
          <span className="font-label-md text-label-md">Admin</span>
        </Link>
      </nav>
    </div>
  );
}
