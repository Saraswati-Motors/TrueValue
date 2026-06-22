import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Inventory() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, AVAILABLE, SOLD, VALUATION

  // Stats
  const [stats, setStats] = useState({ total: 0, available: 0, sold: 0 });

  // Load vehicles
  const loadVehicles = async () => {
    setLoading(true);
    if (!supabase) {
      setVehicles([]);
      calculateStats([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*");

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const normalized = data.map(v => ({
          ...v,
          vehicle_id: v.id || v.vehicle_id,
          kilometers_driven: v.mileage_km !== undefined ? v.mileage_km : v.kilometers_driven
        }));
        setVehicles(normalized);
        calculateStats(normalized);
      } else {
        setVehicles([]);
        calculateStats([]);
      }
    } catch (err) {
      console.error("Failed to load vehicles from Supabase:", err);
      setVehicles([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const calculateStats = (data) => {
    const total = data.length;
    const sold = data.filter(v => (v.status || "").toUpperCase() === "SOLD").length;
    const available = total - sold;
    setStats({ total, available, sold });
  };

  // Mark a vehicle as sold
  const handleMarkAsSold = async (id, e) => {
    e.stopPropagation(); // Stop navigation click
    
    if (!supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ status: "Sold" })
        .eq("id", id);

      if (error) {
        throw error;
      }

      // Log to sales_logs
      const car = vehicles.find(v => v.vehicle_id === id);
      if (car) {
        await supabase
          .from("sales_logs")
          .insert([{
            vehicle_id: id,
            sold_price: car.price,
            sale_date: new Date().toISOString()
          }]);
      }

      // Refresh list
      await loadVehicles();
    } catch (err) {
      console.error("Failed to mark vehicle as sold:", err.message);
      alert("Error updating database.");
    }
  };

  // Filter list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // Match status filter
      const vehicleStatus = (v.status || "").toUpperCase();
      if (statusFilter !== "ALL") {
        if (statusFilter === "AVAILABLE" && vehicleStatus === "SOLD") return false;
        if (statusFilter === "SOLD" && vehicleStatus !== "SOLD") return false;
        if (statusFilter === "VALUATION" && vehicleStatus !== "RESERVED") return false;
      }

      // Match search query (make, model, variant, or locations)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const make = (v.make || "").toLowerCase();
        const model = (v.model || "").toLowerCase();
        const variant = (v.variant || "").toLowerCase();
        const location = (v.history_points?.location || v.location || "").toLowerCase();
        return make.includes(query) || model.includes(query) || variant.includes(query) || location.includes(query);
      }

      return true;
    });
  }, [vehicles, statusFilter, searchQuery]);

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      {/* Dashboard Header & Stats */}
      <div className="flex flex-col gap-stack-lg mb-stack-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-main mb-2">
              Inventory Management
            </h1>
            <p className="text-on-surface-variant font-body-lg">
              Manage and track your vehicle stock in real-time.
            </p>
          </div>
          <button 
            onClick={() => navigate("/add-vehicle")}
            className="bg-primary text-on-primary px-6 py-3 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 h-[48px] justify-center"
          >
            <span className="material-symbols-outlined">add_box</span>
            <span className="font-label-lg">ADD NEW VEHICLE</span>
          </button>
        </div>

        {/* Bento Stats Grid */}
        <div className="grid grid-cols-2 gap-gutter md:grid-cols-3">
          <div className="bg-surface-container-lowest border border-outline-variant p-stack-md rounded-xl card-shadow">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Total Inventory</p>
            <p className="font-headline-lg text-headline-lg text-primary">{stats.total}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-stack-md rounded-xl card-shadow">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Available</p>
            <p className="font-headline-lg text-headline-lg text-tertiary">{stats.available}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-stack-md rounded-xl card-shadow col-span-2 md:col-span-1">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Sold</p>
            <p className="font-headline-lg text-headline-lg text-secondary">{stats.sold}</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-outline-variant rounded-xl p-4 mb-stack-lg card-shadow flex flex-col md:flex-row gap-4 sticky top-20 z-30">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input 
            className="w-full h-12 pl-12 pr-4 rounded-lg border border-outline-variant focus:ring-1 focus:ring-primary focus:border-primary font-body-md bg-surface outline-none" 
            placeholder="Search by make, model, location..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button 
            onClick={() => setStatusFilter("ALL")}
            className={`px-4 h-12 rounded-lg font-label-lg whitespace-nowrap transition-colors ${statusFilter === "ALL" ? "bg-primary-container text-on-primary-container font-bold" : "border border-outline-variant hover:bg-surface-container text-on-surface-variant"}`}
          >
            All Stock
          </button>
          <button 
            onClick={() => setStatusFilter("AVAILABLE")}
            className={`px-4 h-12 rounded-lg font-label-lg whitespace-nowrap transition-colors ${statusFilter === "AVAILABLE" ? "bg-primary-container text-on-primary-container font-bold" : "border border-outline-variant hover:bg-surface-container text-on-surface-variant"}`}
          >
            Available
          </button>
          <button 
            onClick={() => setStatusFilter("SOLD")}
            className={`px-4 h-12 rounded-lg font-label-lg whitespace-nowrap transition-colors ${statusFilter === "SOLD" ? "bg-primary-container text-on-primary-container font-bold" : "border border-outline-variant hover:bg-surface-container text-on-surface-variant"}`}
          >
            Sold
          </button>
          <button 
            onClick={() => setStatusFilter("VALUATION")}
            className={`px-4 h-12 rounded-lg font-label-lg whitespace-nowrap transition-colors ${statusFilter === "VALUATION" ? "bg-primary-container text-on-primary-container font-bold" : "border border-outline-variant hover:bg-surface-container text-on-surface-variant"}`}
          >
            Under Valuation
          </button>
        </div>
      </div>

      {/* Vehicle Grid */}
      {loading ? (
        <div className="w-full text-center py-24 text-gray-500 font-bold">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          Loading inventory database...
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-white border border-outline-variant rounded-xl p-12 text-center text-on-surface-variant card-shadow">
          <span className="material-symbols-outlined text-[48px] text-outline mb-4">no_accounts</span>
          <h3 className="font-headline-md text-text-main mb-2">No Matching Vehicles</h3>
          <p className="font-body-md">We couldn't find any vehicles matching your search criteria or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {filteredVehicles.map((car) => {
            const isSold = (car.status || "").toUpperCase() === "SOLD";
            const isValuation = (car.status || "").toUpperCase() === "RESERVED";
            const carImg = car.images?.[0] || car.image_url || "https://images.unsplash.com/photo-1542282088-fe8426682b8f";
            return (
              <div 
                key={car.vehicle_id} 
                onClick={() => navigate(`/vehicle/${car.vehicle_id}`)}
                className={`bg-white border border-outline-variant rounded-xl overflow-hidden card-shadow flex flex-col group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${isSold ? "opacity-90" : ""}`}
              >
                <div className={`aspect-[16/9] relative bg-surface-container-highest overflow-hidden ${isSold ? "grayscale" : ""}`}>
                  <img 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    src={carImg} 
                    alt={`${car.make} ${car.model}`}
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded tracking-tighter uppercase text-white ${
                      isSold 
                        ? "bg-secondary-container" 
                        : isValuation 
                        ? "bg-attention-yellow text-on-surface" 
                        : "bg-tertiary"
                    }`}>
                      {car.status || "Available"}
                    </span>
                  </div>
                </div>

                <div className="p-stack-md flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-headline-md text-headline-md text-text-main leading-tight max-w-[70%]">
                      {car.make} {car.model}
                    </h3>
                    <span className={`font-price-display text-price-display shrink-0 ${isSold ? "text-on-surface-variant" : "text-primary"}`}>
                      ₹{car.price}L
                    </span>
                  </div>

                  <div className="flex gap-4 mb-stack-md text-on-surface-variant font-body-sm">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">speed</span>
                      <span>{car.kilometers_driven ? car.kilometers_driven.toLocaleString() : "0"} km</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">local_gas_station</span>
                      <span>{car.fuel_type}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-stack-md border-t border-surface-variant flex gap-2">
                    {!isSold ? (
                      <button 
                        className="flex-1 bg-primary text-on-primary py-2.5 rounded font-label-lg hover:bg-primary-container transition-colors active:scale-95 text-xs font-bold"
                        onClick={(e) => handleMarkAsSold(car.vehicle_id, e)}
                      >
                        MARK AS SOLD
                      </button>
                    ) : (
                      <button 
                        className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded font-label-lg hover:bg-surface-container transition-colors text-xs"
                        onClick={(e) => e.stopPropagation()} // Stop navigation
                      >
                        SOLD (ARCHIVED)
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/vehicle/${car.vehicle_id}`);
                      }}
                      className="px-3 border border-outline-variant rounded hover:bg-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
