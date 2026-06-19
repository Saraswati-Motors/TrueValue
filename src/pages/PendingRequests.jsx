import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

export default function PendingRequests() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ total: 0, newToday: 0, inProgress: 0, resolved: 0, urgent: 0 });

  // Load inquiries
  const loadInquiries = async () => {
    setLoading(true);
    if (!supabase) {
      // Mock Fallback
      let localInquiries = localStorage.getItem("truevalue_mock_inquiries");
      let parsed = localInquiries ? JSON.parse(localInquiries) : [];
      if (parsed.length < 10) {
        const mockInquiriesList = [];
        for (let i = 1; i <= 495; i++) {
          mockInquiriesList.push({
            inquiry_id: String(i),
            customer_name: i === 1 ? "Arjun Mehta" : i === 2 ? "Priya Sharma" : i === 3 ? "Rajesh Kumar" : `Customer ${i}`,
            vehicle_name: i % 3 === 0 ? "2021 Maruti Suzuki Swift" : i % 2 === 0 ? "2023 Maruti Suzuki Vitara" : "2022 Maruti Suzuki Ciaz",
            phone_number: `+91 98765 ${String(10000 + i).slice(1)}`,
            email: `customer${i}@example.com`,
            created_at: new Date(Date.now() - 3600000 * (i % 72)).toISOString(),
            status: i % 15 === 0 ? "Booked" : i % 25 === 0 ? "Lost" : i % 5 === 0 ? "Contacted" : "New",
            lost_reason: i % 25 === 0 ? "Price too high" : undefined,
            location: i % 3 === 0 ? "Phaphamau, Prayagraj" : i % 2 === 0 ? "Civil Lines, Prayagraj" : "Jhunsi, Prayagraj"
          });
        }
        localStorage.setItem("truevalue_mock_inquiries", JSON.stringify(mockInquiriesList));
        parsed = mockInquiriesList;
      }
      setInquiries(parsed);
      calculateStats(parsed);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*, vehicles(make, model, variant, location)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setInquiries(data);
        calculateStats(data);
      } else {
        // Fallback
        setInquiries([]);
        setStats({ total: 0, newToday: 0, inProgress: 0, resolved: 0, urgent: 0 });
      }
    } catch (err) {
      console.error("Failed to load inquiries:", err.message);
      // Load local mock fallback
      let localInquiries = localStorage.getItem("truevalue_mock_inquiries");
      if (localInquiries) {
        const parsed = JSON.parse(localInquiries);
        setInquiries(parsed);
        calculateStats(parsed);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  const calculateStats = (data) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const newToday = data.filter(i => {
      const date = new Date(i.created_at);
      return date >= startOfToday && (i.status === "New" || !i.status);
    }).length;

    const inProgress = data.filter(i => i.status === "Contacted" || i.status === "In Progress").length;
    const booked = data.filter(i => i.status === "Booked").length;
    const lost = data.filter(i => i.status === "Lost").length;

    // Urgent if pending (New or In Progress) and older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const urgent = data.filter(i => {
      const date = new Date(i.created_at);
      const isPending = !i.status || i.status === "New" || i.status === "Contacted" || i.status === "In Progress";
      return date < oneDayAgo && isPending;
    }).length;

    setStats({ total: data.length, newToday, inProgress, booked, lost, urgent });
  };

  const handleClearInquiries = async () => {
    if (!window.confirm("Are you sure you want to clear all inquiries? This action cannot be undone. Please ensure you have exported a CSV backup first.")) {
      return;
    }

    if (!supabase) {
      localStorage.setItem("truevalue_mock_inquiries", JSON.stringify([]));
      setInquiries([]);
      setStats({ total: 0, newToday: 0, inProgress: 0, booked: 0, lost: 0, urgent: 0 });
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
      setStats({ total: 0, newToday: 0, inProgress: 0, booked: 0, lost: 0, urgent: 0 });
      alert("Inquiries database cleared successfully.");
    } catch (err) {
      console.error("Error clearing inquiries:", err);
      alert("Failed to clear inquiries: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (inquiryId, newStatus) => {
    let reason = "";
    if (newStatus === "Lost") {
      let promptReason = "";
      while (!promptReason || !promptReason.trim()) {
        const userInput = window.prompt("Reason for losing this query is MANDATORY. Please enter the reason:");
        if (userInput === null) {
          // User clicked Cancel, abort status change
          alert("Status change cancelled. Query status was not changed to Lost.");
          return;
        }
        promptReason = userInput;
      }
      reason = promptReason.trim();
    }

    if (!supabase) {
      // Mock update
      const local = localStorage.getItem("truevalue_mock_inquiries");
      if (local) {
        const parsed = JSON.parse(local);
        const updated = parsed.map(i => {
          if (String(i.inquiry_id) === String(inquiryId)) {
            return { ...i, status: newStatus, lost_reason: newStatus === "Lost" ? reason : undefined };
          }
          return i;
        });
        localStorage.setItem("truevalue_mock_inquiries", JSON.stringify(updated));
        setInquiries(updated);
        calculateStats(updated);
      }
      return;
    }

    try {
      const updateData = { status: newStatus };
      if (newStatus === "Lost") {
        updateData.lost_reason = reason;
      } else {
        updateData.lost_reason = null;
      }

      const { error } = await supabase
        .from("inquiries")
        .update(updateData)
        .eq("inquiry_id", inquiryId);

      if (error) throw error;
      await loadInquiries();
    } catch (err) {
      console.error("Failed to update inquiry status:", err.message);
      alert("Error updating status in database. Updating local state.");
      const updated = inquiries.map(i => {
        if (i.inquiry_id === inquiryId) {
          return { ...i, status: newStatus, lost_reason: newStatus === "Lost" ? reason : undefined };
        }
        return i;
      });
      setInquiries(updated);
      calculateStats(updated);
    }
  };

  const handleSaveLostReason = async (inquiryId, newReason) => {
    if (!supabase) {
      const local = localStorage.getItem("truevalue_mock_inquiries");
      if (local) {
        const parsed = JSON.parse(local);
        const updated = parsed.map(i => {
          if (String(i.inquiry_id) === String(inquiryId)) {
            return { ...i, lost_reason: newReason };
          }
          return i;
        });
        localStorage.setItem("truevalue_mock_inquiries", JSON.stringify(updated));
        setInquiries(updated);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from("inquiries")
        .update({ lost_reason: newReason })
        .eq("inquiry_id", inquiryId);

      if (error) throw error;
      await loadInquiries();
    } catch (err) {
      console.error("Failed to save lost reason:", err.message);
      alert("Failed to update lost reason in database.");
    }
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter(i => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const name = (i.customer_name || i.full_name || "").toLowerCase();
      const vehicle = i.vehicles
        ? `${i.vehicles.make} ${i.vehicles.model} ${i.vehicles.variant || ""}`.toLowerCase()
        : (i.vehicle_name || "").toLowerCase();
      const phone = (i.phone_number || "").toLowerCase();
      const email = (i.email || i.email_address || "").toLowerCase();
      const location = (i.location || i.vehicles?.location || i.vehicles?.history_points?.location || "Jhunsi, Prayagraj").toLowerCase();
      return name.includes(query) || vehicle.includes(query) || phone.includes(query) || email.includes(query) || location.includes(query);
    });
  }, [inquiries, searchQuery]);

  const handleExportCSV = () => {
    const csvContent = [
      ["Inquiry ID", "Customer Name", "Phone Number", "Email", "Vehicle Interest", "Location", "Status", "Date Added"],
      ...filteredInquiries.map(i => {
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
    link.setAttribute("download", `truevalue_inquiries_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h3 className="font-headline-lg text-headline-lg text-text-main">Pending Requests</h3>
          <p className="text-on-surface-variant font-body-md mt-1">Review and manage incoming customer inquiries.</p>
        </div>
        {/* Search & Export Panel */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              className="w-full h-12 pl-10 pr-4 bg-white border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-body-md"
              placeholder="Filter by name or vehicle..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 h-12 px-4 bg-primary text-on-primary rounded-lg font-label-lg whitespace-nowrap hover:bg-primary-container transition-colors active:scale-95 w-full sm:w-auto justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Bento-style Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {/* Card 1: Total Queries & Capacity */}
        <div className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm flex flex-col justify-between h-36 card-shadow relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Total Queries</span>
            {stats.total >= 490 && (
              <button
                onClick={handleClearInquiries}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-all flex items-center justify-center bg-white border border-red-100 shadow-sm"
                title="Clear Database"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">delete_forever</span>
              </button>
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-extrabold font-headline-xl ${stats.total >= 490 ? "text-red-600" : stats.total >= 450 ? "text-yellow-600" : "text-text-main"}`}>
                {stats.total}/500
              </span>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  stats.total >= 490 ? "bg-red-600" : stats.total >= 450 ? "bg-yellow-500" : "bg-primary"
                }`}
                style={{ width: `${Math.min((stats.total / 500) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-outline mt-1 font-medium">
              {stats.total >= 490 ? "Critical limit reached!" : stats.total >= 450 ? "Approaching limit" : "Capacity status"}
            </p>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm flex flex-col justify-between h-36 card-shadow">
          <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">In Progress</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-headline-xl text-text-main">{stats.inProgress}</span>
            <span className="text-xs text-outline">Active followups</span>
          </div>
        </div>

        {/* Card 3: Booked */}
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl shadow-sm flex flex-col justify-between h-36">
          <span className="font-label-md text-label-md text-emerald-800 uppercase tracking-wider font-semibold">Booked</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-headline-xl text-emerald-700">{stats.booked}</span>
            <span className="text-xs text-emerald-600/80">Successful bookings</span>
          </div>
        </div>

        {/* Card 4: Lost */}
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl shadow-sm flex flex-col justify-between h-36">
          <span className="font-label-md text-label-md text-rose-800 uppercase tracking-wider font-semibold">Lost</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-headline-xl text-rose-700">{stats.lost}</span>
            <span className="text-xs text-rose-600/80">Lost inquiries</span>
          </div>
        </div>

        {/* Card 5: Urgent Follow-ups */}
        <div className="bg-surface-cream p-5 rounded-xl border border-attention-yellow shadow-sm flex flex-col justify-between h-36">
          <span className="font-label-md text-label-md text-secondary uppercase tracking-wider font-semibold">Urgent Leads</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-headline-xl text-secondary">{stats.urgent}</span>
            <span className="text-xs text-secondary/80">Pending &gt; 24hrs</span>
          </div>
        </div>
      </div>

      {/* Request Table/List */}
      {loading ? (
        <div className="w-full text-center py-24 text-gray-500 font-bold">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          Loading inquiries database...
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="bg-white border border-outline-variant rounded-xl p-12 text-center text-on-surface-variant card-shadow">
          <span className="material-symbols-outlined text-[48px] text-outline mb-4">contact_mail</span>
          <h3 className="font-headline-md text-text-main mb-2">No Requests Found</h3>
          <p className="font-body-md">There are no pending requests to show.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-lg overflow-hidden">
          {/* List Header (Desktop Only) */}
          <div className="hidden md:grid grid-cols-12 px-6 py-4 bg-surface-container text-on-surface-variant font-label-lg text-label-lg border-b border-outline-variant">
            <div className="col-span-3">Customer &amp; Vehicle</div>
            <div className="col-span-2">Contact Info</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-2">Date &amp; Time</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-outline-variant">
            {filteredInquiries.map((inquiry, idx) => {
              const dbStatus = inquiry.status || "New";
              const status = dbStatus === "Contacted" ? "In Progress" : dbStatus;
              const isUrgent = (status === "New" || status === "In Progress") && (new Date() - new Date(inquiry.created_at)) > 24 * 3600 * 1000;
              const customerName = inquiry.customer_name || inquiry.full_name || "Valued Customer";
              const customerEmail = inquiry.email || inquiry.email_address || "";
              const vehicleName = inquiry.vehicles
                ? `${inquiry.vehicles.make} ${inquiry.vehicles.model} ${inquiry.vehicles.variant || ""}`.trim()
                : inquiry.vehicle_name || "General Inquiry";
              const location = inquiry.location || inquiry.vehicles?.location || inquiry.vehicles?.history_points?.location || "Jhunsi, Prayagraj";
              return (
                <div
                  key={inquiry.inquiry_id || idx}
                  className="grid grid-cols-1 md:grid-cols-12 p-6 items-center gap-4 hover:bg-surface-container-low transition-colors duration-150"
                >
                  {/* Identity Column */}
                  <div className="col-span-1 md:col-span-3 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-fixed-dim flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-headline-md text-body-lg font-bold text-text-main leading-tight truncate">
                        {customerName}
                      </h4>
                      <p className="text-sm text-on-surface-variant truncate">Interested in: {vehicleName}</p>
                      {status === "Lost" && (
                        <div className="mt-2 text-xs bg-red-50 text-red-800 p-2 rounded-lg border border-red-100 flex items-center justify-between gap-2 max-w-sm">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="font-bold shrink-0 text-[10px] uppercase">Reason:</span>
                            <span className="italic truncate">{inquiry.lost_reason || "None specified"}</span>
                          </div>
                          <button
                            onClick={() => {
                              let newReason = "";
                              while (!newReason || !newReason.trim()) {
                                const userInput = window.prompt("Reason is mandatory. Please update reason for lost query:", inquiry.lost_reason || "");
                                if (userInput === null) return; // User clicked cancel
                                newReason = userInput;
                              }
                              handleSaveLostReason(inquiry.inquiry_id, newReason.trim());
                            }}
                            className="text-red-700 hover:text-red-900 font-bold hover:underline shrink-0 text-[10px]"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Column */}
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex flex-col">
                      <a href={`tel:${inquiry.phone_number}`} className="flex items-center gap-2 text-sm text-text-main hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px] text-primary">call</span>
                        {inquiry.phone_number}
                      </a>
                      <a href={`mailto:${customerEmail}`} className="flex items-center gap-2 text-sm text-on-surface-variant mt-1 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        {customerEmail}
                      </a>
                    </div>
                  </div>

                  {/* Location Column */}
                  <div className="col-span-1 md:col-span-2 flex items-center gap-2 text-sm text-text-main font-medium">
                    <span className="material-symbols-outlined text-[18px] text-outline">location_on</span>
                    <span className="truncate">{location}</span>
                  </div>

                  {/* Date Column */}
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-sm text-text-main font-medium">
                      {new Date(inquiry.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-outline">
                      {new Date(inquiry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Status Column */}
                  <div className="col-span-1 md:col-span-1 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      status === "Booked"
                        ? "bg-green-100 text-green-800"
                        : status === "Lost"
                          ? "bg-rose-100 text-rose-800"
                          : status === "In Progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                    }`}>
                      {status}
                    </span>
                    {isUrgent && (
                      <span className="block text-[9px] text-red-600 font-extrabold uppercase mt-1">
                        &gt; 24h Delayed
                      </span>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-2">
                    <select
                      className="px-2 py-1.5 border border-outline-variant bg-surface rounded text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      value={status}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateStatus(inquiry.inquiry_id, val);
                      }}
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Booked">Booked</option>
                      <option value="Lost">Lost</option>
                    </select>
                    <a
                      href={`https://wa.me/${inquiry.phone_number.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-outline hover:text-green-600 hover:bg-green-50 rounded transition-all"
                      title="Chat via WhatsApp"
                    >
                      <span className="material-symbols-outlined text-[20px]">chat</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
