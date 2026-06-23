import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getVehiclePrice } from "../utils/price";

export default function StockLog() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, IN STOCK, VALUATION, SOLD

  useEffect(() => {
    async function fetchStockHistory() {
      setLoading(true);
      if (!supabase) {
        setVehicles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setVehicles(data);
        } else {
          setVehicles([]);
        }
      } catch (err) {
        console.error("Error fetching stock history:", err.message);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }

    fetchStockHistory();
  }, []);

  // Filter lists
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // Status filter mapping
      const status = (v.status || v.history_points?.badge || v.badge || "AVAILABLE").toUpperCase();
      if (statusFilter !== "ALL") {
        if (statusFilter === "IN STOCK" && (status === "SOLD" || status === "RESERVED" || status === "VALUATION" || status === "UNDER VALUATION")) return false;
        if (statusFilter === "SOLD" && status !== "SOLD") return false;
        if (statusFilter === "VALUATION" && (status !== "VALUATION" && status !== "UNDER VALUATION" && status !== "RESERVED")) return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const make = (v.make || "").toLowerCase();
        const model = (v.model || "").toLowerCase();
        const variant = (v.variant || "").toLowerCase();
        return make.includes(query) || model.includes(query) || variant.includes(query);
      }

      return true;
    });
  }, [vehicles, statusFilter, searchQuery]);

  // Export CSV mock handler
  const handleExportCSV = () => {
    const csvContent = [
      ["ID", "Make", "Model", "Variant", "Year", "Mileage (KM)", "Fuel Type", "Transmission", "Price (Lakh)", "Status", "Date Added"],
      ...filteredVehicles.map(v => {
        const carId = v.vehicle_id || v.id;
        const km = v.kilometers_driven || v.mileage_km || 0;
        const price = getVehiclePrice(v);
        const badge = v.history_points?.badge || v.badge || "Available";
        return [
          carId, v.make, v.model, v.variant, v.year, km, v.fuel_type, v.transmission, price, v.status || badge, v.created_at || "N/A"
        ];
      })
    ]
      .map(e => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `truevalue_stock_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      {/* Header Section */}
      <section className="mb-stack-lg">
        <div className="flex flex-col gap-2">
          <h2 className="font-headline-lg text-headline-lg text-text-main">Stock Arrivals Log</h2>
          <p className="font-body-md text-on-surface-variant">Comprehensive history of recent inventory additions and valuations.</p>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="mb-stack-lg sticky top-[72px] z-40 bg-surface/90 backdrop-blur-md py-stack-sm border-b border-surface-variant">
        <div className="flex flex-col md:flex-row gap-stack-md">
          <div className="relative flex-grow">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input 
              className="w-full h-12 pl-12 pr-4 bg-white border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md outline-none" 
              placeholder="Search vehicle, model or ID..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-stack-sm overflow-x-auto scrollbar-hide pb-2 md:pb-0">
            <select 
              className="h-12 px-4 bg-white border border-outline-variant rounded-lg font-label-lg outline-none focus:ring-1 focus:ring-primary cursor-pointer text-on-surface-variant"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="IN STOCK">In Stock</option>
              <option value="VALUATION">Under Valuation</option>
              <option value="SOLD">Sold</option>
            </select>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 h-12 px-4 bg-secondary text-on-secondary rounded-lg font-label-lg whitespace-nowrap hover:bg-heritage-red transition-colors active:scale-95"
            >
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* Inventory List */}
      {loading ? (
        <div className="w-full text-center py-24 text-gray-500 font-bold">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          Loading arrivals logs...
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-white border border-outline-variant rounded-xl p-12 text-center text-on-surface-variant card-shadow">
          <span className="material-symbols-outlined text-[48px] text-outline mb-4">history</span>
          <h3 className="font-headline-md text-text-main mb-2">No Records Found</h3>
          <p className="font-body-md">There are no log entries matching your criteria.</p>
        </div>
      ) : (
        <section className="flex flex-col gap-stack-md">
          {filteredVehicles.map((car, index) => {
            const carId = car.vehicle_id || car.id;
            const status = (car.status || car.history_points?.badge || car.badge || "AVAILABLE").toUpperCase();
            const isSold = status === "SOLD";
            const isValuation = status === "VALUATION" || status === "UNDER VALUATION" || status === "RESERVED";
            const carImg = car.image_url || car.images?.[0] || "/placeholder.webp";
            const km = car.kilometers_driven || car.mileage_km || 0;
            const price = getVehiclePrice(car);
            return (
              <div 
                key={carId || index}
                className="arrival-card bg-white border border-outline-variant p-stack-md rounded-xl shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center gap-stack-md transition-all cursor-pointer"
                onClick={() => navigate(`/vehicle/${carId}`)}
              >
                <div className={`w-full md:w-48 h-32 rounded-lg overflow-hidden shrink-0 ${isSold ? "grayscale" : ""}`}>
                  <img 
                    alt={`${car.make} ${car.model}`} 
                    className="w-full h-full object-cover" 
                    src={carImg}
                  />
                </div>
                <div className="flex-grow flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-label-md text-primary uppercase tracking-wider">{car.make}</span>
                      <h3 className="font-headline-md text-headline-md text-text-main">{car.model} {car.variant}</h3>
                    </div>
                    <span className={`px-3 py-1 text-label-md font-semibold rounded-full uppercase ${
                      isSold 
                        ? "bg-gray-100 text-gray-800" 
                        : isValuation 
                        ? "bg-yellow-100 text-yellow-800" 
                        : "bg-green-100 text-green-800"
                    }`}>
                      {status === "AVAILABLE" ? "In Stock" : status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-gutter gap-y-1 mt-2 text-on-surface-variant font-body-sm">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                      {car.year} Model
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">history</span>
                      Added {car.created_at ? new Date(car.created_at).toLocaleDateString() : "Recently"}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">speed</span>
                      {km ? km.toLocaleString() : "0"} KM
                    </div>
                  </div>
                </div>
                <div className="md:text-right flex md:flex-col justify-between items-center md:items-end gap-2 border-t md:border-t-0 border-surface-variant pt-stack-md md:pt-0">
                  {isValuation ? (
                    <span className="font-price-display text-price-display text-on-surface-variant italic">Valuation Pending</span>
                  ) : (
                    <span className="font-price-display text-price-display text-secondary">₹{price.toFixed(2)} Lakh</span>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/vehicle/${carId}`);
                    }}
                    className="px-6 py-2 bg-primary text-white font-label-lg rounded hover:bg-primary-container transition-colors active:scale-95"
                  >
                    {isValuation ? "Set Price" : "View Info"}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => navigate("/add-vehicle")}
        className="fixed right-6 bottom-24 md:bottom-10 z-40 w-14 h-14 bg-secondary text-white rounded-full shadow-xl flex items-center justify-center hover:bg-heritage-red transition-all duration-300 active:scale-90"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>
    </div>
  );
}
