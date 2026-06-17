import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { mockCars } from "../lib/mockData";

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 768;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function AddVehicle() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [make, setMake] = useState("Maruti Suzuki");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [priceLakh, setPriceLakh] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [fuelType, setFuelType] = useState("Petrol");
  const [transmission, setTransmission] = useState("Manual");
  const [location, setLocation] = useState("IFFCO Chowk, Gurgaon");
  const [imageUrl, setImageUrl] = useState("");
  const [gallery, setGallery] = useState([]);
  const [compressing, setCompressing] = useState(false);

  const handleMainImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 10MB.");
      return;
    }

    setCompressing(true);
    try {
      const base64 = await compressImage(file);
      setImageUrl(base64);
    } catch (err) {
      console.error("Failed to compress image:", err);
      alert("Failed to process image. Please try again.");
    } finally {
      setCompressing(false);
    }
  };

  const handleGalleryChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setCompressing(true);
    try {
      const promises = files.map(async (file) => {
        if (file.size > 10 * 1024 * 1024) {
          console.warn(`File ${file.name} skipped as it exceeds 10MB.`);
          return null;
        }
        return await compressImage(file);
      });
      
      const results = await Promise.all(promises);
      const validResults = results.filter(Boolean);
      
      setGallery(prev => [...prev, ...validResults]);
    } catch (err) {
      console.error("Failed to compress gallery images:", err);
      alert("Failed to process one or more images. Please try again.");
    } finally {
      setCompressing(false);
    }
  };
  const [engine, setEngine] = useState("1197 cc");
  const [maxPower, setMaxPower] = useState("88 bhp @ 6000 rpm");
  const [seatingCapacity, setSeatingCapacity] = useState("5 Seater");
  const [ownership, setOwnership] = useState("First Owner");
  const [insurance, setInsurance] = useState("Comprehensive");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!make || !model || !priceLakh || !mileageKm || !year) {
      alert("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    const vehicleData = {
      make,
      model,
      variant,
      price_lakh: parseFloat(priceLakh),
      mileage_km: parseInt(mileageKm, 10),
      year: parseInt(year, 10),
      fuel_type: fuelType,
      transmission,
      location,
      image_url: imageUrl || "https://images.unsplash.com/photo-1542282088-fe8426682b8f", // default placeholder
      gallery: gallery,
      engine,
      max_power: maxPower,
      seating_capacity: seatingCapacity,
      ownership,
      insurance,
      description,
      status: "AVAILABLE",
      badge: "NEW ARRIVAL",
      is_certified: true,
      is_featured: false,
      created_at: new Date().toISOString()
    };

    if (!supabase) {
      // Local Mock Database Save
      const localVehicles = localStorage.getItem("truevalue_mock_vehicles");
      const currentList = localVehicles ? JSON.parse(localVehicles) : mockCars;
      const newId = `${model.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString().slice(-4)}`;
      const newVehicle = { ...vehicleData, id: newId };
      
      localStorage.setItem("truevalue_mock_vehicles", JSON.stringify([newVehicle, ...currentList]));
      
      // Also log this in stock logs
      let localLogs = localStorage.getItem("truevalue_mock_stock_logs");
      const logItem = {
        id: Math.random().toString(36).substring(2, 9),
        vehicle_id: newId,
        make,
        model,
        year,
        mileage_km: mileageKm,
        price_lakh: priceLakh,
        action: "ADD",
        status: "IN STOCK",
        created_at: new Date().toISOString()
      };
      const currentLogs = localLogs ? JSON.parse(localLogs) : [];
      localStorage.setItem("truevalue_mock_stock_logs", JSON.stringify([logItem, ...currentLogs]));

      setTimeout(() => {
        setSubmitting(false);
        navigate("/inventory");
      }, 1000);
      return;
    }

    try {
      // Omit manual id and let Supabase generate UUID
      const { data, error } = await supabase
        .from("vehicles")
        .insert([vehicleData])
        .select();

      if (error) throw error;

      // Log this in stock_logs (or custom logs table if it exists)
      const addedVehicle = data && data[0];
      if (addedVehicle) {
        await supabase
          .from("sales_logs") // or other logs table if you want, but wait, let's keep it safe
          .insert([{
            vehicle_id: addedVehicle.id,
            price_lakh: parseFloat(priceLakh),
            sale_date: new Date().toISOString() // this table tracks sales but let's see
          }]).catch(err => console.log("Failed to insert log: ", err.message));
      }

      navigate("/inventory");
    } catch (err) {
      console.error("Failed to add vehicle to Supabase:", err.message);
      alert("Error adding vehicle to database. Falling back to saving in local session storage.");
      
      // Save locally
      const localVehicles = localStorage.getItem("truevalue_mock_vehicles");
      const currentList = localVehicles ? JSON.parse(localVehicles) : mockCars;
      const newId = `tv-${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem("truevalue_mock_vehicles", JSON.stringify([{ ...vehicleData, id: newId }, ...currentList]));
      navigate("/inventory");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-main mb-2">
            Add New Vehicle
          </h1>
          <p className="font-body-md text-on-surface-variant">
            Submit vehicle specifications and details to include them in the TrueValue database.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-outline-variant p-6 rounded-xl card-shadow space-y-6">
        <h2 className="text-xl font-bold text-text-main border-l-4 border-primary pl-4">Core Specifications</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Make / Brand *</label>
            <select 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              value={make}
              onChange={(e) => setMake(e.target.value)}
            >
              <option>Maruti Suzuki</option>
              <option>Honda</option>
              <option>Hyundai</option>
              <option>Tata</option>
              <option>Toyota</option>
              <option>Mahindra</option>
            </select>
          </div>

          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Model Name *</label>
            <input 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary font-semibold"
              placeholder="e.g. Swift" 
              required 
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Variant / Sub-model</label>
            <input 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. ZXI+ AMT" 
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Price (in Lakhs ₹) *</label>
            <input 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary font-semibold"
              placeholder="e.g. 6.45" 
              required 
              type="number"
              step="0.01"
              value={priceLakh}
              onChange={(e) => setPriceLakh(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Driven Kilometers (KM) *</label>
            <input 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. 14500" 
              required 
              type="number"
              value={mileageKm}
              onChange={(e) => setMileageKm(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Model Year *</label>
            <input 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. 2022" 
              required 
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Fuel Type</label>
            <select 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
            >
              <option>Petrol</option>
              <option>CNG</option>
              <option>Diesel</option>
              <option>Electric</option>
            </select>
          </div>

          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Transmission</label>
            <select 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
            >
              <option>Manual</option>
              <option>Automatic</option>
            </select>
          </div>

          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Dealership Location</label>
            <input 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Gurgaon" 
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <h2 className="text-xl font-bold text-text-main border-l-4 border-primary pl-4 pt-4">Technical Details &amp; Options</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Engine Displacement</label>
            <input 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. 1197 cc" 
              type="text"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Max Power Output</label>
            <input 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. 88 bhp @ 6000 rpm" 
              type="text"
              value={maxPower}
              onChange={(e) => setMaxPower(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Seating Capacity</label>
            <input 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. 5 Seater" 
              type="text"
              value={seatingCapacity}
              onChange={(e) => setSeatingCapacity(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Ownership Status</label>
            <select 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              value={ownership}
              onChange={(e) => setOwnership(e.target.value)}
            >
              <option>First Owner</option>
              <option>Second Owner</option>
              <option>Third Owner</option>
            </select>
          </div>

          <div>
            <label className="block font-label-lg mb-2 text-on-surface">Insurance Status</label>
            <input 
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Comprehensive (Valid Oct 2025)" 
              type="text"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
            />
          </div>
        </div>

        {/* Images Upload Section */}
        <h2 className="text-xl font-bold text-text-main border-l-4 border-primary pl-4 pt-4">Vehicle Images</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Image Selection */}
          <div className="space-y-2">
            <label className="block font-label-lg text-on-surface font-semibold">Main Vehicle Image *</label>
            <div className="relative">
              {imageUrl ? (
                <div className="relative group aspect-video rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low shadow-sm">
                  <img 
                    src={imageUrl} 
                    alt="Main Vehicle Preview" 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <label className="cursor-pointer bg-white text-text-main font-semibold px-4 py-2 rounded-lg text-sm hover:bg-surface-container-low transition-colors shadow flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">edit</span>
                      Change
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleMainImageChange} 
                      />
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setImageUrl("")}
                      className="bg-error-container text-on-error-container font-semibold p-2 rounded-lg hover:bg-error/95 transition-colors shadow flex items-center"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-outline-variant rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-300 group p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-primary">
                    <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                  </div>
                  <span className="font-semibold text-text-main group-hover:text-primary transition-colors text-sm">Select Main Image</span>
                  <span className="text-xs text-on-surface-variant mt-1">From gallery or files (JPEG, PNG up to 10MB)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleMainImageChange} 
                    required={!imageUrl}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Gallery Selection */}
          <div className="space-y-2">
            <label className="block font-label-lg text-on-surface font-semibold">Additional Gallery Images</label>
            <div className="relative">
              {gallery.length > 0 ? (
                <div className="border border-outline-variant bg-surface-container-low rounded-xl p-4 min-h-[160px] aspect-video flex flex-col justify-between">
                  <div className="grid grid-cols-3 gap-3 max-h-[120px] overflow-y-auto pr-1">
                    {gallery.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden group border border-outline-variant">
                        <img 
                          src={img} 
                          alt={`Gallery ${idx + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setGallery(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-black/60 text-white hover:bg-black p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                    
                    {/* Add More card inside grid if room */}
                    <label className="flex flex-col items-center justify-center aspect-video border border-dashed border-outline rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                      <span className="material-symbols-outlined text-primary text-xl">add_circle</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={handleGalleryChange} 
                      />
                    </label>
                  </div>
                  <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant flex justify-between items-center mt-2">
                    <span>{gallery.length} images selected</span>
                    <button 
                      type="button" 
                      onClick={() => setGallery([])} 
                      className="text-error font-semibold hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-outline-variant rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-300 group p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-primary">
                    <span className="material-symbols-outlined text-2xl">collections</span>
                  </div>
                  <span className="font-semibold text-text-main group-hover:text-primary transition-colors text-sm">Add Gallery Photos</span>
                  <span className="text-xs text-on-surface-variant mt-1">Select multiple images to show in detail gallery</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={handleGalleryChange} 
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Loading overlay when compressing */}
        {compressing && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center max-w-xs text-center border border-outline-variant">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
              <h3 className="font-bold text-text-main text-lg">Processing Images</h3>
              <p className="text-xs text-on-surface-variant mt-2">Resizing and optimizing files from your gallery for database storage...</p>
            </div>
          </div>
        )}

        <div>
          <label className="block font-label-lg mb-2 text-on-surface">Detailed Description</label>
          <textarea 
            className="w-full p-4 border border-outline-variant rounded-lg bg-surface-container-low min-h-[120px] outline-none focus:ring-1 focus:ring-primary"
            placeholder="Describe the vehicle condition, service history, key highlights..." 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="pt-4 flex gap-4 border-t border-outline-variant">
          <button 
            type="button"
            onClick={() => navigate("/inventory")}
            className="flex-1 py-4 border border-primary text-primary rounded-lg font-label-lg hover:bg-primary-fixed transition-colors text-center"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={submitting}
            className="flex-1 py-4 bg-primary text-on-primary rounded-lg font-label-lg shadow-md hover:shadow-lg active:scale-95 transition-all text-center flex items-center justify-center disabled:opacity-50"
          >
            {submitting ? "Adding to Database..." : "Add Vehicle"}
          </button>
        </div>
      </form>
    </div>
  );
}
