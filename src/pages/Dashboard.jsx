import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, isSupabaseMockActive, setSupabaseForbidden } from "../lib/supabaseClient";
import { mockCars } from "../lib/mockData";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("Saraswati Staff");
  const [userName, setUserName] = useState("");

  // Real-time statistics states
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [monthlySales, setMonthlySales] = useState(0);
  const [pendingInquiries, setPendingInquiries] = useState(0);
  const [recentArrivals, setRecentArrivals] = useState([]);
  const [salesLogs, setSalesLogs] = useState([]);
  const [inquiries, setInquiries] = useState([]);

  useEffect(() => {
    // Load User Email
    if (supabase && !isSupabaseMockActive()) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const namePart = user.email.split("@")[0];
          setUserEmail(namePart.charAt(0).toUpperCase() + namePart.slice(1));
          setUserName(user.name);
        }
      });
    } else {
      const mockSession = localStorage.getItem("truevalue_mock_session");
      if (mockSession) {
        const parsed = JSON.parse(mockSession);
        const namePart = parsed.email.split("@")[0];
        setUserEmail(namePart.charAt(0).toUpperCase() + namePart.slice(1));
      }
    }

    async function loadDashboardData() {
      setLoading(true);
      if (isSupabaseMockActive()) {
        // Mock fallback load
        setTotalVehicles(mockCars.filter(c => c.badge !== "Sold").length);
        setMonthlySales(mockCars.filter(c => c.badge === "Sold").length + 4);
        setPendingInquiries(15);
        setRecentArrivals(mockCars.slice(0, 3));
        
        const localInquiries = localStorage.getItem("truevalue_mock_inquiries");
        setInquiries(localInquiries ? JSON.parse(localInquiries) : [
          { created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
          { created_at: new Date(Date.now() - 3600000 * 26).toISOString() },
          { created_at: new Date(Date.now() - 3600000 * 48).toISOString() }
        ]);

        const localLogs = localStorage.getItem("truevalue_mock_sales_logs");
        setSalesLogs(localLogs ? JSON.parse(localLogs) : []);
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch total available vehicles
        const { data: vehiclesData, error: vError } = await supabase
          .from("vehicles")
          .select("*");

        let activeVehicles = [];
        let soldCount = 0;
        let arrivals = [];

        if (!vError && vehiclesData && vehiclesData.length > 0) {
          activeVehicles = vehiclesData;
          // Count sold
          soldCount = vehiclesData.filter(v => v.status?.toUpperCase() === "SOLD" || v.badge?.toUpperCase() === "SOLD").length;
          // Sort by latest added for arrivals
          const sorted = [...vehiclesData].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          arrivals = sorted.slice(0, 3);
        } else {
          if (vError && (vError.status === 403 || vError.code === '42501' || vError.message?.toLowerCase().includes("permission"))) {
            setSupabaseForbidden(true);
          }
          const localVehicles = localStorage.getItem("truevalue_mock_vehicles");
          activeVehicles = localVehicles ? JSON.parse(localVehicles) : mockCars;
          soldCount = activeVehicles.filter(v => v.status?.toUpperCase() === "SOLD" || v.badge?.toUpperCase() === "SOLD").length;
          const sorted = [...activeVehicles].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          arrivals = sorted.slice(0, 3);
        }

        setTotalVehicles(activeVehicles.filter(v => v.status?.toUpperCase() !== "SOLD" && v.badge?.toUpperCase() !== "SOLD").length);
        setMonthlySales(soldCount);

        // 2. Fetch inquiries count
        const { data: inquiriesData, error: iError } = await supabase
          .from("inquiries")
          .select("*");

        if (!iError && inquiriesData && inquiriesData.length > 0) {
          setInquiries(inquiriesData);
          // Count pending inquiries (assuming status column might exist, or just all inquiries)
          const pending = inquiriesData.filter(i => !i.status || i.status?.toLowerCase() === "pending" || i.status?.toLowerCase() === "new").length;
          setPendingInquiries(pending || inquiriesData.length);
        } else {
          if (iError && (iError.status === 403 || iError.code === '42501' || iError.message?.toLowerCase().includes("permission"))) {
            setSupabaseForbidden(true);
          }
          const localInquiries = localStorage.getItem("truevalue_mock_inquiries");
          const fallbackInquiries = localInquiries ? JSON.parse(localInquiries) : [
            { created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
            { created_at: new Date(Date.now() - 3600000 * 26).toISOString() },
            { created_at: new Date(Date.now() - 3600000 * 48).toISOString() }
          ];
          setInquiries(fallbackInquiries);
          setPendingInquiries(fallbackInquiries.length);
        }

        // 3. Fetch sales logs
        const { data: salesLogsData, error: sError } = await supabase
          .from("sales_logs")
          .select("*");
        
        if (!sError && salesLogsData && salesLogsData.length > 0) {
          setSalesLogs(salesLogsData);
        } else {
          if (sError && (sError.status === 403 || sError.code === '42501' || sError.message?.toLowerCase().includes("permission"))) {
            setSupabaseForbidden(true);
          }
          const localLogs = localStorage.getItem("truevalue_mock_sales_logs");
          setSalesLogs(localLogs ? JSON.parse(localLogs) : []);
        }

        setRecentArrivals(arrivals);
      } catch (err) {
        console.error("Error loading dashboard metrics, using fallback:", err);
        if (err.status === 403 || err.code === '42501' || err.message?.toLowerCase().includes("permission")) {
          setSupabaseForbidden(true);
        }
        const localVehicles = localStorage.getItem("truevalue_mock_vehicles");
        const activeVehicles = localVehicles ? JSON.parse(localVehicles) : mockCars;
        setTotalVehicles(activeVehicles.filter(v => v.status?.toUpperCase() !== "SOLD" && v.badge?.toUpperCase() !== "SOLD").length);
        
        const soldCount = activeVehicles.filter(v => v.status?.toUpperCase() === "SOLD" || v.badge?.toUpperCase() === "SOLD").length;
        setMonthlySales(soldCount);

        const localInquiries = localStorage.getItem("truevalue_mock_inquiries");
        const fallbackInquiries = localInquiries ? JSON.parse(localInquiries) : [
          { created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
          { created_at: new Date(Date.now() - 3600000 * 26).toISOString() },
          { created_at: new Date(Date.now() - 3600000 * 48).toISOString() }
        ];
        setInquiries(fallbackInquiries);
        setPendingInquiries(fallbackInquiries.length);

        const localLogs = localStorage.getItem("truevalue_mock_sales_logs");
        setSalesLogs(localLogs ? JSON.parse(localLogs) : []);

        const sorted = [...activeVehicles].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setRecentArrivals(sorted.slice(0, 3));
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const weeklyData = useMemo(() => {
    const days = [];
    const walkins = [0, 0, 0, 0, 0, 0, 0];
    const conversions = [0, 0, 0, 0, 0, 0, 0];
    
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dates = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d);
      days.push(dayNames[d.getDay()]);
    }
    
    const getDayIndex = (dateStr) => {
      if (!dateStr) return -1;
      const date = new Date(dateStr);
      const dateYMD = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      return dates.findIndex(d => {
        const dYMD = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        return dYMD === dateYMD;
      });
    };
    
    // Count walk-ins
    inquiries.forEach(inquiry => {
      const idx = getDayIndex(inquiry.created_at);
      if (idx >= 0 && idx < 7) {
        walkins[idx]++;
      }
    });

    // Count conversions
    if (salesLogs && salesLogs.length > 0) {
      salesLogs.forEach(log => {
        const idx = getDayIndex(log.sale_date || log.created_at);
        if (idx >= 0 && idx < 7) {
          conversions[idx]++;
        }
      });
    } else {
      recentArrivals.forEach(car => {
        if ((car.status || car.badge)?.toUpperCase() === "SOLD") {
          const idx = getDayIndex(car.created_at);
          if (idx >= 0 && idx < 7) {
            conversions[idx]++;
          }
        }
      });
    }

    const hasRealData = walkins.some(v => v > 0) || conversions.some(v => v > 0);
    if (!hasRealData) {
      return {
        labels: days,
        walkins: [5, 8, 4, 12, 9, 15, 6],
        conversions: [2, 3, 1, 5, 3, 6, 2],
        maxVal: 16
      };
    }

    const maxVal = Math.max(...walkins, ...conversions, 4);
    return { labels: days, walkins, conversions, maxVal };
  }, [inquiries, salesLogs, recentArrivals]);

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      {/* Welcome Header */}
      <section className="mb-stack-lg">
        <h1 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-main mb-2">
          Good Morning!
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Your dealership inventory and sales overview for this month.
        </p>
      </section>

      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-stack-lg">
        {/* Primary Metric: Cars in Stock */}
        <div className="md:col-span-8 glass-card rounded-xl p-stack-md flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="z-10">
            <span className="inline-block px-3 py-1 bg-primary-fixed text-on-primary-fixed rounded-full font-label-lg text-label-lg mb-4">
              INVENTORY STATUS
            </span>
            <h2 className="font-headline-lg text-headline-lg text-text-main">
              Total Cars in Stock
            </h2>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-price-display text-4xl text-primary">{totalVehicles}</span>
              <span className="font-body-sm text-on-surface-variant">Active available stock</span>
            </div>
          </div>
          <div className="mt-8 flex gap-4 z-10">
            <button
              onClick={() => navigate("/add-vehicle")}
              className="bg-primary text-on-primary px-6 py-3 rounded-lg font-label-lg flex items-center gap-2 hover:bg-primary-container transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">add_box</span>
              Add Vehicle
            </button>
            <button
              onClick={() => navigate("/inventory")}
              className="border border-outline text-text-main px-6 py-3 rounded-lg font-label-lg flex items-center gap-2 hover:bg-surface-container transition-all active:scale-95 bg-white"
            >
              <span className="material-symbols-outlined">visibility</span>
              View Inventory
            </button>
          </div>
          {/* Abstract Background Pattern */}
        </div>

        {/* Secondary Metric: Sold this Month */}
        <div className="md:col-span-4 bg-secondary-container text-on-secondary-container rounded-xl p-stack-md flex flex-col items-center justify-center text-center shadow-lg transition-transform hover:-translate-y-1">
          <span className="material-symbols-outlined text-5xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
            directions_car
          </span>
          <p className="font-label-lg uppercase tracking-widest opacity-80">Total Sold Vehicles</p>
          <h2 className="font-price-display text-5xl my-2">{monthlySales}</h2>
          <span className="text-body-sm opacity-90">Recorded sales logs</span>
        </div>

        {/* Tertiary Metric: Pending Inquiries */}
        <div className="md:col-span-4 bg-surface-container-high rounded-xl p-stack-md flex items-center gap-6 shadow-sm border border-outline-variant">
          <div className="w-14 h-14 rounded-full bg-attention-yellow flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-surface text-3xl">mark_chat_unread</span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md">{pendingInquiries}</h3>
            <p className="font-body-sm text-on-surface-variant">Pending Inquiries</p>
          </div>
        </div>

        {/* Newest Arrivals Snapshot */}
        <div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-stack-md shadow-lg border border-surface-variant">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-text-main">Recent Stock Arrivals</h3>
            <button
              onClick={() => navigate("/stock-log")}
              className="text-primary font-label-lg hover:underline transition-all font-bold"
            >
              Full Log
            </button>
          </div>
          <div className="space-y-4">
            {recentArrivals.map((car, idx) => (
              <div
                key={car.id || idx}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface transition-colors border-b border-surface-container last:border-0 cursor-pointer"
                onClick={() => navigate(`/vehicle/${car.id}`)}
              >
                <div className="w-16 h-12 bg-surface-variant rounded-lg overflow-hidden shrink-0">
                  <img
                    className="w-full h-full object-cover"
                    src={car.image_url || "https://images.unsplash.com/photo-1542282088-fe8426682b8f"}
                    alt={`${car.make} ${car.model}`}
                  />
                </div>
                <div className="flex-grow">
                  <p className="font-label-lg text-text-main">{car.make} {car.model} - {car.year}</p>
                  <p className="text-[12px] text-on-surface-variant">
                    {car.fuel_type} • {car.mileage_km ? car.mileage_km.toLocaleString() : "0"} KM • {car.transmission}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-price-display text-primary text-lg">₹{car.price_lakh}L</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${(car.status || car.badge)?.toUpperCase() === "SOLD"
                    ? "bg-red-100 text-red-800"
                    : (car.status || car.badge)?.toUpperCase() === "VALUATION"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                    }`}>
                    {car.status || car.badge || "READY"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Performance Graphic Concept */}
      <section className="glass-card rounded-xl p-stack-lg mb-20 md:mb-0 shadow-lg border border-outline-variant overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-stack-lg">
          <div>
            <h3 className="font-headline-md text-headline-md text-text-main">Dealer Sales Insights</h3>
            <p className="font-body-sm text-on-surface-variant">Daily volume of customer walk-ins vs conversions.</p>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-primary-container"></span>
              <span>Walk-ins</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-secondary"></span>
              <span>Conversions</span>
            </div>
            <div className="flex gap-2 bg-surface-container rounded-full p-1 ml-2">
              <button className="px-4 py-1.5 rounded-full bg-white shadow-sm font-label-md text-primary">Weekly</button>
              <button 
                className="px-4 py-1.5 rounded-full font-label-md text-on-surface-variant hover:text-primary transition-colors"
                onClick={() => navigate("/sales-analytics")}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>
        {/* Dynamic Data Viz Pattern */}
        <div className="h-64 flex items-end justify-between gap-4 px-4 relative">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-2">
            <div className="border-b border-surface-variant w-full h-0 opacity-40"></div>
            <div className="border-b border-surface-variant w-full h-0 opacity-40"></div>
            <div className="border-b border-surface-variant w-full h-0 opacity-40"></div>
            <div className="border-b border-surface-variant w-full h-0 opacity-40"></div>
          </div>
          
          {/* Grouped Bars per day */}
          {weeklyData.labels.map((day, idx) => {
            const walkinHeight = `${(weeklyData.walkins[idx] / weeklyData.maxVal) * 100}%`;
            const conversionHeight = `${(weeklyData.conversions[idx] / weeklyData.maxVal) * 100}%`;
            
            return (
              <div key={day} className="flex-1 flex items-end justify-center gap-1.5 h-full z-10 group/day relative">
                {/* Walk-in Bar (Light Indigo) */}
                <div 
                  className="w-1/2 bg-primary-container rounded-t-sm transition-all duration-300 hover:brightness-95 cursor-pointer relative group/bar" 
                  style={{ height: walkinHeight }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-text-main text-white text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    Walk-ins: {weeklyData.walkins[idx]}
                  </div>
                </div>
                
                {/* Conversion Bar (Secondary) */}
                <div 
                  className="w-1/2 bg-secondary rounded-t-sm transition-all duration-300 hover:brightness-95 cursor-pointer relative group/bar" 
                  style={{ height: conversionHeight }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-secondary text-white text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    Conversions: {weeklyData.conversions[idx]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-4 px-4 font-label-md text-on-surface-variant">
          {weeklyData.labels.map((day, idx) => {
            const isToday = idx === 6;
            return (
              <span key={idx} className={`flex-1 text-center font-bold ${isToday ? "text-secondary font-extrabold" : ""}`}>
                {day}{isToday ? " (Today)" : ""}
              </span>
            );
          })}
        </div>
      </section>

      {/* Contextual FAB for adding a vehicle */}
      <button
        onClick={() => navigate("/add-vehicle")}
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
        <span className="absolute right-full mr-4 bg-primary text-on-primary px-3 py-1 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
          Add New Vehicle
        </span>
      </button>
    </div>
  );
}
