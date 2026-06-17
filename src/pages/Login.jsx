import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [emailOrId, setEmailOrId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!emailOrId || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    // Format email if employee ID is entered without a domain
    const email = emailOrId.includes("@") ? emailOrId : `${emailOrId.toLowerCase()}@truevalue.com`;

    if (!supabase) {
      // Local Sandbox Fallback
      setTimeout(() => {
        setSubmitting(false);
        // Save mock session
        localStorage.setItem(
          "truevalue_mock_session",
          JSON.stringify({ email, role: "admin" })
        );
        navigate("/");
      }, 1000);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      navigate("/");
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMsg(err.message || "Failed to authenticate.");
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col md:flex-row">
      {/* Hero Section (Visual Anchor) */}
      <section className="relative w-full md:w-1/2 min-h-[265px] md:min-h-screen bg-primary-container overflow-hidden flex flex-col justify-center items-center p-gutter">
        <div className="absolute inset-0 z-0">
          <img 
            alt="Luxury Showroom" 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJdrqgB-2Jfkja8xyhiTzKP2_OdBPE9eRflOkWq1hHjbdRCnqGHW9vXREKowqsD5OJXizdjRbXVLZqQkwHWqrywMWfAQnHZUXWwguB8u3Uu6wI24p6GYnOsObaHghNoS-mEwm5ELectPvB5RVUa7Kk1WmIgeS9Cbis5OYb0hzA15qhmxl7dvnUjrN2-aJiwjBZBIG56pSt2cfD9vKMQjB1r84Csb4Mk8wyrRsxE3U06qHgnlvx3JXJjcyvpw7dv_2srbrJj38KC3zL"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container/80 to-transparent"></div>
        </div>
        <div className="relative z-10 text-center md:text-left max-w-md">
          <div className="flex items-center justify-center md:justify-start gap-4 mb-stack-md">
            <div className="p-3 bg-surface-container-lowest rounded-xl shadow-lg">
              <span className="material-symbols-outlined text-primary text-4xl">directions_car</span>
            </div>
            <div className="h-10 w-px bg-white/20 hidden md:block"></div>
            <h1 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-white">Saraswati Motors</h1>
          </div>
          <p className="font-body-lg text-body-lg text-white/80 max-w-sm mb-stack-lg">
            The Internal Employee Portal for TrueValue Inventory &amp; Sales Management.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <span className="material-symbols-outlined text-attention-yellow text-sm">verified_user</span>
            <span className="text-label-md font-label-md text-white uppercase tracking-wider">Internal Secure Access</span>
          </div>
        </div>
      </section>

      {/* Login Form Canvas */}
      <main className="w-full md:w-1/2 flex flex-col justify-center items-center p-margin-mobile md:p-margin-desktop bg-surface-container-lowest">
        <div className="w-full max-w-md">
          {/* Header for Mobile Only */}
          <div className="md:hidden flex flex-col items-center mb-stack-lg">
            <img src="/saraswati.png" alt="Saraswati Motors Logo" className="h-12 w-12 object-contain mb-2" />
            <h2 className="font-headline-md text-headline-md text-primary">TrueValue Employee</h2>
            <div className="h-1 w-12 bg-secondary rounded-full mt-2"></div>
          </div>
          
          <div className="mb-stack-lg">
            <h2 className="hidden md:block font-headline-lg text-headline-lg text-on-surface mb-2">Welcome Back</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Log in with your corporate credentials to manage the inventory.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg font-body-sm flex items-center gap-2 border border-error/20">
              <span className="material-symbols-outlined text-error">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-stack-md" onSubmit={handleLogin}>
            {/* Employee ID/Email Field */}
            <div className="space-y-2">
              <label className="block font-label-lg text-label-lg text-on-surface-variant" htmlFor="employee-id">Employee ID or Email</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">person</span>
                <input 
                  className="w-full pl-12 pr-4 h-12 bg-surface-bright border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md placeholder:text-outline-variant outline-none" 
                  id="employee-id" 
                  type="text" 
                  placeholder="Enter your ID or Email"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block font-label-lg text-label-lg text-on-surface-variant" htmlFor="password">Password</label>
                <a className="font-label-md text-label-md text-primary hover:underline transition-all" href="#">Forgot Password?</a>
              </div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">lock</span>
                <input 
                  className="w-full pl-12 pr-12 h-12 bg-surface-bright border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md placeholder:text-outline-variant outline-none" 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline hover:text-on-surface transition-colors" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "visibility_off" : "visibility"}
                </button>
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center gap-3 py-2">
              <input 
                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" 
                id="remember" 
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                disabled={submitting}
              />
              <label className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer select-none" htmlFor="remember">Remember me on this device</label>
            </div>

            {/* Primary Action */}
            <button 
              className="w-full h-14 bg-primary text-white font-headline-md text-headline-md rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50" 
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                  <span className="material-symbols-outlined">login</span>
                </>
              )}
            </button>
          </form>

          {/* Security Footer */}
          <div className="mt-stack-lg pt-stack-md border-t border-surface-variant">
            <div className="flex items-start gap-3 p-4 bg-surface-container-low rounded-xl">
              <span className="material-symbols-outlined text-on-surface-variant mt-1">shield</span>
              <div className="space-y-1">
                <p className="font-label-md text-label-md text-on-surface">Secure Enterprise Portal</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Access is restricted to authorized Saraswati Motors employees. All sessions are encrypted and monitored for security compliance.
                </p>
              </div>
            </div>
          </div>

          {/* Language/Links */}
          <div className="mt-stack-lg flex flex-wrap justify-center gap-stack-md">
            <a className="font-label-md text-label-md text-outline hover:text-on-surface-variant transition-colors" href="#">Privacy Policy</a>
            <a className="font-label-md text-label-md text-outline hover:text-on-surface-variant transition-colors" href="#">Terms of Use</a>
            <a className="font-label-md text-label-md text-outline hover:text-on-surface-variant transition-colors" href="#">Contact IT Support</a>
          </div>
        </div>
      </main>
    </div>
  );
}
