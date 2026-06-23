import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getVehiclePrice } from "../utils/price";

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

  const hasAutoDownloaded = React.useRef(false);

  // Auto-backup when inquiries hit or exceed 500
  useEffect(() => {
    if (inquiries.length >= 500 && !hasAutoDownloaded.current) {
      handleExportCSV();
      hasAutoDownloaded.current = true;
    }
  }, [inquiries]);

  const handleExportCSV = () => {
    if (inquiries.length === 0) return;
    const csvContent = [
      ["Inquiry ID", "Customer Name", "Phone Number", "Email", "Vehicle Interest", "Location", "Status", "Date Added"],
      ...inquiries.map(i => {
        const vehicleName = i.vehicles
          ? `${i.vehicles.make} ${i.vehicles.model} ${i.vehicles.variant || ""}`.trim()
          : i.vehicle_name || "General Inquiry";
        const customerName = i.customer_name || i.full_name || "Valued Customer";
        const customerEmail = i.email || i.email_address || "";
        const status = i.status === "Contacted" ? "In Progress" : i.status === "Closed" ? "Resolved" : (i.status || "New");
        const location = i.location || i.vehicles?.location || i.vehicles?.history_points?.location || "Jhunsi, Prayagraj";
        return [
          i.inquiry_id || i.id,
          customerName,
          i.phone_number,
          customerEmail,
          vehicleName,
          location,
          status,
          i.created_at || "N/A"
        ];
      })
    ]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `truevalue_inquiries_backup_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearInquiries = async () => {
    if (!window.confirm("Are you sure you want to clear all inquiries? This action cannot be undone. Please ensure you have exported a CSV backup first.")) {
      return;
    }

    if (!supabase) {
      localStorage.setItem("truevalue_mock_inquiries", JSON.stringify([]));
      setInquiries([]);
      setPendingInquiries(0);
      alert("Mock inquiries database cleared.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("inquiries")
        .delete()
        .neq("inquiry_id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;
      setInquiries([]);
      setPendingInquiries(0);
      alert("Inquiries database cleared successfully.");
    } catch (err) {
      console.error("Error clearing inquiries:", err);
      alert("Failed to clear inquiries: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load User Email
    if (supabase) {
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
      if (!supabase) {
        setTotalVehicles(0);
        setMonthlySales(0);
        setRecentArrivals([]);
        setInquiries([]);
        setPendingInquiries(0);
        setSalesLogs([]);
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
          soldCount = vehiclesData.filter(v => v.status?.toUpperCase() === "SOLD" || v.history_points?.badge?.toUpperCase() === "SOLD").length;
          const sorted = [...vehiclesData].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          arrivals = sorted.slice(0, 3);
        }

        setTotalVehicles(activeVehicles.filter(v => v.status?.toUpperCase() !== "SOLD" && v.history_points?.badge?.toUpperCase() !== "SOLD").length);
        setMonthlySales(soldCount);
        setRecentArrivals(arrivals);
      } catch (err) {
        console.error("Error loading vehicles:", err);
        setTotalVehicles(0);
        setMonthlySales(0);
        setRecentArrivals([]);
      }

      try {
        // 2. Fetch inquiries count
        const { data: inquiriesData, error: iError } = await supabase
          .from("inquiries")
          .select("*, vehicles(make, model, variant, location)");

        if (!iError && inquiriesData) {
          setInquiries(inquiriesData);
          const pending = inquiriesData.filter(i => !i.status || i.status?.toLowerCase() === "contacted" || i.status?.toLowerCase() === "in progress" || i.status?.toLowerCase() === "new").length;
          setPendingInquiries(pending);
        } else {
          setInquiries([]);
          setPendingInquiries(0);
        }
      } catch (err) {
        console.error("Error loading inquiries:", err);
        setInquiries([]);
        setPendingInquiries(0);
      }

      try {
        // 3. Fetch sales logs
        const { data: salesLogsData, error: sError } = await supabase
          .from("sales_logs")
          .select("*");
        
        if (!sError && salesLogsData && salesLogsData.length > 0) {
          setSalesLogs(salesLogsData);
        } else {
          setSalesLogs([]);
        }
      } catch (err) {
        console.error("Error loading sales logs:", err);
        setSalesLogs([]);
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

    const maxVal = Math.max(...walkins, ...conversions, 4);
    return { labels: days, walkins, conversions, maxVal };
  }, [inquiries, salesLogs, recentArrivals]);

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      {/* Capacity Alert Banner */}
      {inquiries.length >= 490 && inquiries.length < 500 && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-yellow-600 mt-0.5">warning</span>
            <div>
              <h4 className="font-bold text-yellow-800">Database Limit Warning ({inquiries.length}/500)</h4>
              <p className="text-sm text-yellow-700 font-body-md">
                The customer inquiries database is approaching its 500 limit. Please export a backup and clear old queries to avoid disruption.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export Backup
            </button>
            <button
              onClick={handleClearInquiries}
              className="px-4 py-2 border border-yellow-600 text-yellow-700 hover:bg-yellow-100 rounded text-sm font-semibold transition-colors flex items-center gap-1.5 bg-white"
            >
              <span className="material-symbols-outlined text-sm">delete_sweep</span>
              Clear Database
            </button>
          </div>
        </div>
      )}

      {inquiries.length >= 500 && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600 mt-0.5">error_outline</span>
            <div>
              <h4 className="font-bold text-red-800">Database Capacity Exceeded ({inquiries.length}/500)</h4>
              <p className="text-sm text-red-700 font-body-md">
                The database has reached the maximum capacity of 500. Further customer inquiries are blocked until the database is cleared.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export Backup
            </button>
            <button
              onClick={handleClearInquiries}
              className="px-4 py-2 border border-red-600 text-red-700 hover:bg-red-100 rounded text-sm font-semibold transition-colors flex items-center gap-1.5 bg-white"
            >
              <span className="material-symbols-outlined text-sm">delete_sweep</span>
              Clear Database
            </button>
          </div>
        </div>
      )}

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
            {recentArrivals.map((car, idx) => {
              const carId = car.vehicle_id || car.id;
              const carImg = car.images?.[0] || car.image_url || "https://images.unsplash.com/photo-1542282088-fe8426682b8f";
              const km = car.kilometers_driven || car.mileage_km || 0;
              const price = getVehiclePrice(car);
              const badge = car.history_points?.badge || car.badge || "READY";
              return (
                <div
                  key={carId || idx}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface transition-colors border-b border-surface-container last:border-0 cursor-pointer"
                  onClick={() => navigate(`/vehicle/${carId}`)}
                >
                  <div className="w-16 h-12 bg-surface-variant rounded-lg overflow-hidden shrink-0">
                    <img
                      className="w-full h-full object-cover"
                      src={carImg}
                      alt={`${car.make} ${car.model}`}
                    />
                  </div>
                  <div className="flex-grow">
                    <p className="font-label-lg text-text-main">{car.make} {car.model} - {car.year}</p>
                    <p className="text-[12px] text-on-surface-variant">
                      {car.fuel_type} • {km ? km.toLocaleString() : "0"} KM • {car.transmission}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-price-display text-primary text-lg">₹{price.toFixed(2)}L</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${(car.status || badge)?.toUpperCase() === "SOLD"
                      ? "bg-red-100 text-red-800"
                      : (car.status || badge)?.toUpperCase() === "VALUATION" || (car.status || badge)?.toUpperCase() === "RESERVED"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                      }`}>
                      {car.status || badge}
                    </span>
                  </div>
                </div>
              );
            })}
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
