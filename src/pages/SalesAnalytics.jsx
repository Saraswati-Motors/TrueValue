import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getMonthlySalesData = (salesLogsList, vehiclesList) => {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const thisYearSales = Array(12).fill(0);
  const lastYearSales = Array(12).fill(0);

  if (salesLogsList && salesLogsList.length > 0) {
    salesLogsList.forEach(log => {
      const date = new Date(log.sale_date || log.created_at);
      const year = date.getFullYear();
      const month = date.getMonth();

      if (year === currentYear) {
        thisYearSales[month]++;
      } else if (year === lastYear) {
        lastYearSales[month]++;
      }
    });
  } else {
    vehiclesList.forEach(car => {
      if (car.status?.toUpperCase() === "SOLD" || car.history_points?.badge?.toUpperCase() === "SOLD" || car.badge?.toUpperCase() === "SOLD") {
        const date = car.created_at ? new Date(car.created_at) : new Date();
        const year = date.getFullYear();
        const month = date.getMonth();

        if (year === currentYear) {
          thisYearSales[month]++;
        } else if (year === lastYear) {
          lastYearSales[month]++;
        }
      }
    });
  }

  const finalThisYear = [...thisYearSales];
  const finalLastYear = [...lastYearSales];

  const maxVal = Math.max(...finalThisYear, ...finalLastYear, 5);

  const getCoordinates = (salesArray) => {
    return salesArray.map((val, idx) => {
      const x = Math.round(idx * (1000 / 11));
      const y = Math.round(180 - (val / maxVal) * 150);
      return { x, y, val };
    });
  };

  const thisYearCoords = getCoordinates(finalThisYear);
  const lastYearCoords = getCoordinates(finalLastYear);

  const getPathD = (coords) => {
    return coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  };

  return {
    thisYear: finalThisYear,
    lastYear: finalLastYear,
    thisYearCoords,
    lastYearCoords,
    thisYearPath: getPathD(thisYearCoords),
    lastYearPath: getPathD(lastYearCoords),
    maxVal
  };
};

export default function SalesAnalytics() {
  const [vehicles, setVehicles] = useState([]);
  const [salesLogs, setSalesLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalyticsData() {
      setLoading(true);
      if (!supabase) {
        setVehicles([]);
        setSalesLogs([]);
        setLoading(false);
        return;
      }

      try {
        const { data: vData, error: vError } = await supabase.from("vehicles").select("*");
        if (vError || !vData) {
          setVehicles([]);
        } else {
          setVehicles(vData);
        }

        const { data: lData, error: lError } = await supabase.from("sales_logs").select("*");
        if (lError || !lData) {
          setSalesLogs([]);
        } else {
          setSalesLogs(lData);
        }
      } catch (err) {
        console.error("Error loading analytics data:", err);
        setVehicles([]);
        setSalesLogs([]);
      } finally {
        setLoading(false);
      }
    }

    loadAnalyticsData();
  }, []);

  const chartData = useMemo(() => {
    return getMonthlySalesData(salesLogs, vehicles);
  }, [salesLogs, vehicles]);

  // Compute stats
  const metrics = useMemo(() => {
    const total = vehicles.length;
    const sold = vehicles.filter(v => v.status?.toUpperCase() === "SOLD" || v.history_points?.badge?.toUpperCase() === "SOLD" || v.badge?.toUpperCase() === "SOLD").length;
    const available = total - sold;

    // Inventory Health = Available / Total
    const healthPercent = total > 0 ? Math.round((available / total) * 100) : 100;

    // Categorization
    const categories = {
      SUVs: 0,
      Sedans: 0,
      Hatchbacks: 0,
      MUVs: 0,
      Vans: 0
    };

    vehicles.forEach(v => {
      let cat = (v.category || "").trim().toUpperCase();

      if (!cat) {
        // Fallback: Infer category from model/make if not present (e.g. for mockCars)
        const model = (v.model || "").toUpperCase();
        if (model.includes("XL6") || model.includes("MUV")) {
          cat = "MUV";
        } else if (model.includes("VITARA") || model.includes("BREZZA") || model.includes("NEXON") || model.includes("CAYENNE") || model.includes("Q8") || model.includes("SUV")) {
          cat = "SUV";
        } else if (model.includes("CIAZ") || model.includes("CITY") || model.includes("SEDAN") || model.includes("DZIRE")) {
          cat = "SEDAN";
        } else if (model.includes("SWIFT") || model.includes("BALENO") || model.includes("ALTO") || model.includes("WAGON") || model.includes("HATCHBACK")) {
          cat = "HATCHBACK";
        } else if (model.includes("VAN") || model.includes("EECO")) {
          cat = "VAN";
        } else {
          cat = "HATCHBACK"; // Default fallback
        }
      }

      if (cat === "SUV" || cat === "SUVS") {
        categories.SUVs++;
      } else if (cat === "SEDAN" || cat === "SEDANS") {
        categories.Sedans++;
      } else if (cat === "HATCHBACK" || cat === "HATCHBACKS") {
        categories.Hatchbacks++;
      } else if (cat === "MUV" || cat === "MUVS") {
        categories.MUVs++;
      } else if (cat === "VAN" || cat === "VANS") {
        categories.Vans++;
      } else {
        categories.Hatchbacks++;
      }
    });

    // Stock Aging (Mock calculation based on creation dates)
    const aging = {
      thirtyDays: 0,
      sixtyDays: 0,
      ninetyDays: 0,
      ninetyPlus: 0
    };

    vehicles.forEach(v => {
      const addedDate = v.created_at ? new Date(v.created_at) : new Date(Date.now() - 3600000 * 24 * 10); // fallback 10 days ago
      const diffTime = Math.abs(new Date() - addedDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) aging.thirtyDays++;
      else if (diffDays <= 60) aging.sixtyDays++;
      else if (diffDays <= 90) aging.ninetyDays++;
      else aging.ninetyPlus++;
    });

    return {
      total,
      sold,
      available,
      healthPercent,
      categories,
      aging
    };
  }, [vehicles]);

  // Download Report
  const handleDownloadReport = () => {
    const reportContent = [
      ["TrueValue Dealership Sales & Inventory Report"],
      [`Generated At: ${new Date().toLocaleString()}`],
      [],
      ["Inventory Metrics", "Value"],
      ["Total Vehicles in DB", metrics.total],
      ["Available Units", metrics.available],
      ["Sold Units", metrics.sold],
      ["Inventory Health", `${metrics.healthPercent}%`],
      [],
      ["Inventory Mix By Category", "Units"],
      ["SUVs", metrics.categories.SUVs],
      ["Sedans", metrics.categories.Sedans],
      ["Hatchbacks", metrics.categories.Hatchbacks],
      ["MUVs", metrics.categories.MUVs],
      ["Vans", metrics.categories.Vans],
      [],
      ["Stock Aging Profile", "Units"],
      ["0-30 Days", metrics.aging.thirtyDays],
      ["31-60 Days", metrics.aging.sixtyDays],
      ["61-90 Days", metrics.aging.ninetyDays],
      ["90+ Days", metrics.aging.ninetyPlus]
    ]
      .map(e => e.join(","))
      .join("\n");

    const blob = new Blob([reportContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `truevalue_sales_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      {/* Header Section */}
      <section className="mb-stack-lg flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <p className="font-label-lg text-primary uppercase tracking-widest">Performance Dashboard</p>
          <h2 className="font-headline-lg text-headline-lg text-text-main">Sales Analytics</h2>
        </div>
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg font-label-lg hover:bg-primary-container transition-colors shadow-sm active:scale-95 h-12"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          <span>Download Report</span>
        </button>
      </section>

      {loading ? (
        <div className="w-full text-center py-24 text-gray-500 font-bold">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          Analyzing data schemas...
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-stack-lg">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md shadow-[0_4px_8px_rgba(43,51,162,0.06)] card-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-on-surface-variant font-label-md">Units Sold</span>
                <span className="material-symbols-outlined text-secondary">directions_car</span>
              </div>
              <div className="font-price-display text-price-display text-text-main">{metrics.sold}</div>
              <div className="mt-2 flex items-center gap-1 text-green-600 font-label-md">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>Dynamic database records</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md shadow-[0_4px_8px_rgba(43,51,162,0.06)] card-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-on-surface-variant font-label-md">Inventory Health (Available Ratio)</span>
                <span className="material-symbols-outlined text-attention-yellow">inventory_2</span>
              </div>
              <div className="font-price-display text-price-display text-text-main">{metrics.healthPercent}%</div>
              <div className="mt-2 flex items-center gap-1 text-on-surface-variant font-label-md">
                <span className="material-symbols-outlined text-[16px]">update</span>
                <span>Active stock turnover</span>
              </div>
            </div>
          </section>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Monthly Sales Volume */}
            <div className="lg:col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md shadow-[0_4px_8px_rgba(43,51,162,0.06)] card-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-stack-lg gap-4">
                <h3 className="font-headline-md text-text-main">Monthly Sales Volume</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary"></span>
                    <span className="font-label-md text-on-surface-variant">This Year</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-outline-variant"></span>
                    <span className="font-label-md text-on-surface-variant">Last Year</span>
                  </div>
                </div>
              </div>
              <div className="relative h-72 w-full">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 220">
                  {/* Last Year Path (Grey) */}
                  <path className="line-chart-path transition-all duration-500" d={chartData.lastYearPath} fill="none" stroke="#c6c5d5" strokeWidth="2" strokeDasharray="5,5"></path>
                  {/* This Year Path (Indigo) */}
                  <path className="line-chart-path animate-draw transition-all duration-500" d={chartData.thisYearPath} fill="none" stroke="#0e158d" strokeWidth="3" strokeLinecap="round"></path>

                  {/* Data Points */}
                  {chartData.thisYearCoords.map((pt, idx) => (
                    <g key={`this-${idx}`} className="group/point">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        fill="#0e158d"
                        r="4"
                        className="transition-all duration-200 hover:r-6 cursor-pointer"
                      ></circle>
                      <title>{months[idx]} (This Year): {pt.val} units sold</title>
                    </g>
                  ))}

                  {chartData.lastYearCoords.map((pt, idx) => (
                    <g key={`last-${idx}`} className="group/point">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        fill="#c6c5d5"
                        r="3"
                        className="transition-all duration-200 hover:r-5 cursor-pointer"
                      ></circle>
                      <title>{months[idx]} (Last Year): {pt.val} units sold</title>
                    </g>
                  ))}
                </svg>
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 pb-6">
                  <div className="border-t border-outline w-full"></div>
                  <div className="border-t border-outline w-full"></div>
                  <div className="border-t border-outline w-full"></div>
                  <div className="border-t border-outline w-full"></div>
                </div>
                <div className="flex justify-between mt-4 font-label-md text-on-surface-variant">
                  {months.map(m => <span key={m}>{m}</span>)}
                </div>
              </div>
            </div>

            {/* Inventory Aging */}
            <div className="lg:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md shadow-[0_4px_8px_rgba(43,51,162,0.06)] card-shadow">
              <h3 className="font-headline-md text-text-main mb-stack-lg">Inventory Stock Aging</h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-label-md text-on-surface-variant">
                    <span>0-30 Days</span>
                    <span>{metrics.aging.thirtyDays} Units</span>
                  </div>
                  <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${metrics.total > 0 ? (metrics.aging.thirtyDays / metrics.total) * 100 : 0}%` }}></div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-label-md text-on-surface-variant">
                    <span>31-60 Days</span>
                    <span>{metrics.aging.sixtyDays} Units</span>
                  </div>
                  <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-attention-yellow rounded-full" style={{ width: `${metrics.total > 0 ? (metrics.aging.sixtyDays / metrics.total) * 100 : 0}%` }}></div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-label-md text-on-surface-variant">
                    <span>61-90 Days</span>
                    <span>{metrics.aging.ninetyDays} Units</span>
                  </div>
                  <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${metrics.total > 0 ? (metrics.aging.ninetyDays / metrics.total) * 100 : 0}%` }}></div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-label-md text-on-surface-variant">
                    <span>90+ Days</span>
                    <span>{metrics.aging.ninetyPlus} Units</span>
                  </div>
                  <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${metrics.total > 0 ? (metrics.aging.ninetyPlus / metrics.total) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Mix */}
            <div className="lg:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md shadow-[0_4px_8px_rgba(43,51,162,0.06)] card-shadow">
              <h3 className="font-headline-md text-text-main mb-stack-lg">Current Inventory Mix</h3>
              <div className="flex flex-col gap-stack-md">
                {/* SUVs */}
                <div className="flex items-center gap-4">
                  <div className="w-24 font-label-md text-text-main">SUVs</div>
                  <div className="flex-1 h-8 bg-surface-container rounded-lg overflow-hidden relative">
                    <div className="h-full bg-primary-container" style={{ width: `${metrics.total > 0 ? (metrics.categories.SUVs / metrics.total) * 100 : 0}%` }}></div>
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-on-primary">
                      {metrics.total > 0 ? Math.round((metrics.categories.SUVs / metrics.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-12 text-right font-label-md text-on-surface-variant">{metrics.categories.SUVs} u</div>
                </div>
                {/* Sedans */}
                <div className="flex items-center gap-4">
                  <div className="w-24 font-label-md text-text-main">Sedans</div>
                  <div className="flex-1 h-8 bg-surface-container rounded-lg overflow-hidden relative">
                    <div className="h-full bg-secondary-container" style={{ width: `${metrics.total > 0 ? (metrics.categories.Sedans / metrics.total) * 100 : 0}%` }}></div>
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-on-secondary">
                      {metrics.total > 0 ? Math.round((metrics.categories.Sedans / metrics.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-12 text-right font-label-md text-on-surface-variant">{metrics.categories.Sedans} u</div>
                </div>
                {/* Hatchbacks */}
                <div className="flex items-center gap-4">
                  <div className="w-24 font-label-md text-text-main">Hatchbacks</div>
                  <div className="flex-1 h-8 bg-surface-container rounded-lg overflow-hidden relative">
                    <div className="h-full bg-tertiary-container" style={{ width: `${metrics.total > 0 ? (metrics.categories.Hatchbacks / metrics.total) * 100 : 0}%` }}></div>
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-on-tertiary-container">
                      {metrics.total > 0 ? Math.round((metrics.categories.Hatchbacks / metrics.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-12 text-right font-label-md text-on-surface-variant">{metrics.categories.Hatchbacks} u</div>
                </div>
                {/* MUVs */}
                <div className="flex items-center gap-4">
                  <div className="w-24 font-label-md text-text-main">MUVs</div>
                  <div className="flex-1 h-8 bg-surface-container rounded-lg overflow-hidden relative">
                    <div className="h-full bg-surface-container-highest" style={{ width: `${metrics.total > 0 ? (metrics.categories.MUVs / metrics.total) * 100 : 0}%` }}></div>
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-on-surface-variant">
                      {metrics.total > 0 ? Math.round((metrics.categories.MUVs / metrics.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-12 text-right font-label-md text-on-surface-variant">{metrics.categories.MUVs} u</div>
                </div>
                {/* Vans */}
                <div className="flex items-center gap-4">
                  <div className="w-24 font-label-md text-text-main">Vans</div>
                  <div className="flex-1 h-8 bg-surface-container rounded-lg overflow-hidden relative">
                    <div className="h-full bg-outline-variant" style={{ width: `${metrics.total > 0 ? (metrics.categories.Vans / metrics.total) * 100 : 0}%` }}></div>
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-on-surface-variant">
                      {metrics.total > 0 ? Math.round((metrics.categories.Vans / metrics.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-12 text-right font-label-md text-on-surface-variant">{metrics.categories.Vans} u</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
