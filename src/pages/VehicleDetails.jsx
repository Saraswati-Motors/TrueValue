import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { mockCars } from "../lib/mockData";

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadVehicleDetails() {
      setLoading(true);
      if (!supabase) {
        // Mock fallback load
        const localVehicles = localStorage.getItem("truevalue_mock_vehicles");
        const carsList = localVehicles ? JSON.parse(localVehicles) : mockCars;
        const found = carsList.find(c => String(c.vehicle_id || c.id) === String(id));
        setCar(found || null);
        if (found) {
          setActiveImage(found.images?.[0] || found.image_url);
        }
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .eq("vehicle_id", id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setCar(data);
          setActiveImage(data.images?.[0] || data.image_url);
        } else {
          // Check local storage mock if database doesn't have it
          const localVehicles = localStorage.getItem("truevalue_mock_vehicles");
          const carsList = localVehicles ? JSON.parse(localVehicles) : mockCars;
          const found = carsList.find(c => String(c.vehicle_id || c.id) === String(id));
          setCar(found || null);
          if (found) {
            setActiveImage(found.images?.[0] || found.image_url);
          }
        }
      } catch (err) {
        console.error("Error loading vehicle details, falling back to mock:", err);
        const localVehicles = localStorage.getItem("truevalue_mock_vehicles");
        const carsList = localVehicles ? JSON.parse(localVehicles) : mockCars;
        const found = carsList.find(c => String(c.vehicle_id || c.id) === String(id));
        setCar(found || null);
        if (found) {
          setActiveImage(found.images?.[0] || found.image_url);
        }
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadVehicleDetails();
    }
  }, [id]);

  const handleMarkAsSold = async () => {
    if (!car) return;
    setSubmitting(true);

    if (!supabase) {
      // Local Mock Update
      const localVehicles = localStorage.getItem("truevalue_mock_vehicles");
      if (localVehicles) {
        const parsed = JSON.parse(localVehicles);
        const updated = parsed.map(v => {
          if (String(v.vehicle_id || v.id) === String(car.vehicle_id || car.id)) {
            return { ...v, status: "Sold" };
          }
          return v;
        });
        localStorage.setItem("truevalue_mock_vehicles", JSON.stringify(updated));
        
        // Also log to local sales_logs
        let localLogs = localStorage.getItem("truevalue_mock_sales_logs");
        const logItem = {
          sale_id: Math.random().toString(36).substring(2, 9),
          vehicle_id: car.vehicle_id || car.id,
          sale_date: new Date().toISOString(),
          sold_price: car.price || car.price_lakh || 0
        };
        const currentLogs = localLogs ? JSON.parse(localLogs) : [];
        localStorage.setItem("truevalue_mock_sales_logs", JSON.stringify([logItem, ...currentLogs]));

        setCar({ ...car, status: "Sold" });
      }
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ status: "Sold" })
        .eq("vehicle_id", car.vehicle_id);

      if (error) throw error;

      // Log to sales_logs
      await supabase
        .from("sales_logs")
        .insert([{
          vehicle_id: car.vehicle_id,
          sold_price: car.price,
          sale_date: new Date().toISOString()
        }]);

      setCar({ ...car, status: "Sold" });
    } catch (err) {
      console.error("Failed to mark sold:", err.message);
      alert("Error updating database. Updating locally.");
      setCar({ ...car, status: "Sold" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full text-center py-24 text-gray-500 font-bold">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        Loading vehicle details...
      </div>
    );
  }

  if (!car) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <span className="material-symbols-outlined text-[64px] text-outline">directions_car</span>
        <h2 className="text-2xl font-bold text-text-main">Vehicle Not Found</h2>
        <p className="text-on-surface-variant">The requested vehicle record could not be found or has been removed.</p>
        <Link to="/inventory" className="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold">
          Back to Inventory
        </Link>
      </div>
    );
  }

  const isSold = (car.status || "").toUpperCase() === "SOLD";
  const imagesList = car.images && car.images.length > 0 ? car.images : [car.image_url].filter(Boolean);

  const getMetadata = (key, fallback) => {
    if (car.history_points && typeof car.history_points === "object" && !Array.isArray(car.history_points)) {
      return car.history_points[key] !== undefined ? car.history_points[key] : fallback;
    }
    return car[key] !== undefined ? car[key] : fallback;
  };

  const engine = getMetadata("engine", "1197 cc");
  const seatingCapacity = getMetadata("seating_capacity", "5 Seater");
  const ownership = getMetadata("ownership", "First Owner");
  const insurance = getMetadata("insurance", "Comprehensive");
  const location = getMetadata("location", "Jhunsi, Prayagraj");
  const description = getMetadata("description", car.description || "This certified vehicle is in excellent condition and has been fully vetted by our Maruti Suzuki True Value workshop.");

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-outline uppercase tracking-wider">
        <Link className="hover:text-primary transition-colors" to="/inventory">Inventory</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-outline">{car.make}</span>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-text-main font-extrabold">{car.model} {car.year}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column: Media & Specs */}
        <div className="lg:col-span-8 space-y-8">
          {/* Gallery */}
          <section className="bg-white border border-outline-variant p-4 rounded-xl card-shadow">
            <div className="relative aspect-[16/9] mb-4 bg-surface-container-highest rounded-lg overflow-hidden border border-outline-variant">
              <img 
                alt={`${car.make} ${car.model} Main`} 
                className="w-full h-full object-cover" 
                src={activeImage}
              />
              {isSold && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-secondary-container text-on-secondary text-2xl font-bold px-6 py-3 rounded-xl tracking-wider uppercase">
                    SOLD
                  </span>
                </div>
              )}
            </div>
            
            {/* Thumbnails strip */}
            {imagesList.length > 1 && (
              <div className="grid grid-cols-4 gap-4 overflow-x-auto hide-scrollbar">
                {imagesList.map((img, idx) => (
                  <img 
                    key={idx} 
                    className={`cursor-pointer hover:opacity-85 transition-opacity rounded-lg border aspect-video object-cover ${activeImage === img ? "border-primary ring-2 ring-primary-container" : "border-outline-variant"}`}
                    onClick={() => setActiveImage(img)}
                    src={img} 
                    alt={`Thumbnail ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Bento Highlights */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-outline-variant flex flex-col items-center text-center card-shadow">
              <span className="material-symbols-outlined text-primary text-3xl mb-2">speed</span>
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Driven</span>
              <span className="font-bold text-lg text-text-main mt-1">
                {car.kilometers_driven ? car.kilometers_driven.toLocaleString() : "0"} km
              </span>
            </div>

            <div className="bg-white p-6 rounded-xl border border-outline-variant flex flex-col items-center text-center card-shadow">
              <span className="material-symbols-outlined text-primary text-3xl mb-2">local_gas_station</span>
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Fuel Type</span>
              <span className="font-bold text-lg text-text-main mt-1">{car.fuel_type}</span>
            </div>

            <div className="bg-white p-6 rounded-xl border border-outline-variant flex flex-col items-center text-center card-shadow">
              <span className="material-symbols-outlined text-primary text-3xl mb-2">settings</span>
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Transmission</span>
              <span className="font-bold text-lg text-text-main mt-1">{car.transmission}</span>
            </div>

            <div className="bg-white p-6 rounded-xl border border-outline-variant flex flex-col items-center text-center card-shadow">
              <span className="material-symbols-outlined text-primary text-3xl mb-2">calendar_today</span>
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Year</span>
              <span className="font-bold text-lg text-text-main mt-1">{car.year}</span>
            </div>
          </section>

          {/* Specs List */}
          <section className="bg-white border border-outline-variant p-6 rounded-xl card-shadow">
            <h2 className="text-xl font-bold text-text-main mb-6 border-l-4 border-primary pl-4">
              Vehicle Specifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
              <div className="flex justify-between items-center py-4 border-b border-outline-variant">
                <span className="text-xs font-bold text-outline uppercase">Engine</span>
                <span className="font-semibold text-text-main">{engine}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-outline-variant">
                <span className="text-xs font-bold text-outline uppercase">Seating Capacity</span>
                <span className="font-semibold text-text-main">{seatingCapacity}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-outline-variant">
                <span className="text-xs font-bold text-outline uppercase">Ownership</span>
                <span className="font-semibold text-text-main">{ownership}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-outline-variant">
                <span className="text-xs font-bold text-outline uppercase">Insurance</span>
                <span className="font-semibold text-text-main">{insurance}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-outline-variant">
                <span className="text-xs font-bold text-outline uppercase">Location</span>
                <span className="font-semibold text-text-main truncate max-w-[60%]">{location}</span>
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="bg-white border border-outline-variant p-6 rounded-xl card-shadow">
            <h2 className="text-xl font-bold text-text-main mb-4 border-l-4 border-primary pl-4">
              Seller's Description
            </h2>
            <p className="text-on-surface-variant leading-relaxed text-body-md whitespace-pre-line">
              {description}
            </p>
          </section>
        </div>

        {/* Right Column: Price & Lead Actions */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#e2e7ff] p-8 rounded-xl border border-outline-variant sticky top-24 space-y-6 card-shadow">
            <div>
              <span className="inline-block px-3 py-1 bg-primary-container text-on-primary-container rounded-full text-label-md font-bold uppercase mb-2">
                {car.status || "Available"}
              </span>
              <h1 className="text-2xl font-extrabold text-text-main leading-tight">
                {car.make} {car.model}
              </h1>
              <p className="text-on-surface-variant text-xs font-semibold mt-1">{car.variant} | {car.year}</p>
            </div>

            <div>
              <span className="text-xs font-bold text-outline uppercase block mb-1">True Value Price</span>
              <span className="text-3xl font-black text-primary">₹{car.price || car.price_lakh} Lakh</span>
            </div>

            <div className="space-y-3 text-sm font-semibold text-on-surface-variant pt-2 border-t border-outline-variant">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">verified</span>
                <span>True Value Certified (376 Points Checked)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <span className="truncate">{location}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-4 border-t border-outline-variant">
              {!isSold ? (
                <button 
                  onClick={handleMarkAsSold}
                  disabled={submitting}
                  className="w-full bg-primary text-on-primary py-4 rounded-lg font-bold hover:bg-primary-container transition-transform active:scale-95 shadow-md text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "MARK AS SOLD"}
                  <span className="material-symbols-outlined">sell</span>
                </button>
              ) : (
                <div className="w-full text-center py-4 border border-outline-variant rounded-lg font-bold bg-white text-on-surface-variant flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-secondary">check_circle</span>
                  SOLD &amp; LOGGED
                </div>
              )}
              
              <button 
                onClick={() => navigate("/inventory")}
                className="w-full bg-white border border-outline text-text-main py-4 rounded-lg font-bold hover:bg-surface-container transition-transform active:scale-95 shadow-sm text-sm"
              >
                Back to Inventory
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
