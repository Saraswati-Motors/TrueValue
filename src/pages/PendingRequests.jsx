import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

export default function PendingRequests() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ newToday: 0, inProgress: 0, urgent: 0 });

  // Load inquiries
  const loadInquiries = async () => {
    setLoading(true);
    if (!supabase) {
      // Mock Fallback
      let localInquiries = localStorage.getItem("truevalue_mock_inquiries");
      if (!localInquiries) {
        const mockInquiriesList = [
          {
            id: "1",
            full_name: "Arjun Mehta",
            vehicle_name: "2022 Maruti Suzuki Ciaz",
            phone_number: "+91 98765 43210",
            email_address: "arjun.mehta@email.com",
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
            status: "New"
          },
          {
            id: "2",
            full_name: "Priya Sharma",
            vehicle_name: "2023 Maruti Suzuki Vitara",
            phone_number: "+91 91234 56789",
            email_address: "priya.s@designstudio.com",
            created_at: new Date(Date.now() - 3600000 * 26).toISOString(), // 26 hours ago (urgent)
            status: "In Progress"
          },
          {
            id: "3",
            full_name: "Rajesh Kumar",
            vehicle_name: "2021 Maruti Suzuki Swift",
            phone_number: "+91 90000 11111",
            email_address: "kumar.rajesh@corp.in",
            created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
            status: "New"
          }
        ];
        localStorage.setItem("truevalue_mock_inquiries", JSON.stringify(mockInquiriesList));
        localInquiries = JSON.stringify(mockInquiriesList);
      }
      const parsed = JSON.parse(localInquiries);
      setInquiries(parsed);
      calculateStats(parsed);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setInquiries(data);
        calculateStats(data);
      } else {
        // Fallback
        setInquiries([]);
        setStats({ newToday: 0, inProgress: 0, urgent: 0 });
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

    const inProgress = data.filter(i => i.status === "In Progress").length;

    // Urgent if pending (New or In Progress) and older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const urgent = data.filter(i => {
      const date = new Date(i.created_at);
      return date < oneDayAgo && (i.status === "New" || i.status === "In Progress" || !i.status);
    }).length;

    setStats({ newToday, inProgress, urgent });
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (!supabase) {
      // Mock update
      const local = localStorage.getItem("truevalue_mock_inquiries");
      if (local) {
        const parsed = JSON.parse(local);
        const updated = parsed.map(i => {
          if (String(i.id) === String(id)) {
            return { ...i, status: newStatus };
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
      const { error } = await supabase
        .from("inquiries")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      await loadInquiries();
    } catch (err) {
      console.error("Failed to update inquiry status:", err.message);
      alert("Error updating status in database. Updating local state.");
      const updated = inquiries.map(i => {
        if (i.id === id) {
          return { ...i, status: newStatus };
        }
        return i;
      });
      setInquiries(updated);
      calculateStats(updated);
    }
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter(i => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const name = (i.full_name || "").toLowerCase();
      const vehicle = (i.vehicle_name || "").toLowerCase();
      const phone = (i.phone_number || "").toLowerCase();
      const email = (i.email_address || "").toLowerCase();
      return name.includes(query) || vehicle.includes(query) || phone.includes(query) || email.includes(query);
    });
  }, [inquiries, searchQuery]);

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h3 className="font-headline-lg text-headline-lg text-text-main">Pending Requests</h3>
          <p className="text-on-surface-variant font-body-md mt-1">Review and manage incoming customer inquiries.</p>
        </div>
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input 
            className="w-full h-12 pl-10 pr-4 bg-white border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-body-md" 
            placeholder="Filter by name or vehicle..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Bento-style Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-primary text-on-primary p-6 rounded-xl shadow-sm flex flex-col justify-between h-32">
          <span className="font-label-lg text-label-lg opacity-85 uppercase tracking-widest">New Today</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold font-headline-xl">{stats.newToday}</span>
            <span className="text-sm opacity-90">Open leads today</span>
          </div>
        </div>
        <div className="bg-white border border-outline-variant p-6 rounded-xl shadow-sm flex flex-col justify-between h-32 card-shadow">
          <span className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-widest">In Progress</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold font-headline-xl text-text-main">{stats.inProgress}</span>
            <span className="text-sm text-outline">Total active followups</span>
          </div>
        </div>
        <div className="bg-surface-cream p-6 rounded-xl border border-attention-yellow shadow-sm flex flex-col justify-between h-32">
          <span className="font-label-lg text-label-lg text-secondary uppercase tracking-widest">Urgent Follow-ups</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold font-headline-xl text-secondary">{stats.urgent}</span>
            <span className="text-sm text-secondary/80">Pending &gt; 24hrs</span>
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
            <div className="col-span-4">Customer &amp; Vehicle</div>
            <div className="col-span-3">Contact Info</div>
            <div className="col-span-2">Date &amp; Time</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-outline-variant">
            {filteredInquiries.map((inquiry, idx) => {
              const status = inquiry.status || "New";
              const isUrgent = status !== "Resolved" && (new Date() - new Date(inquiry.created_at)) > 24 * 3600 * 1000;
              return (
                <div 
                  key={inquiry.id || idx}
                  className="grid grid-cols-1 md:grid-cols-12 p-6 items-center gap-4 hover:bg-surface-container-low transition-colors duration-150"
                >
                  {/* Identity Column */}
                  <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-fixed-dim flex items-center justify-center text-primary font-bold text-lg">
                      {inquiry.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-headline-md text-body-lg font-bold text-text-main leading-tight">
                        {inquiry.full_name}
                      </h4>
                      <p className="text-sm text-on-surface-variant">Interested in: {inquiry.vehicle_name}</p>
                    </div>
                  </div>

                  {/* Contact Column */}
                  <div className="col-span-1 md:col-span-3">
                    <div className="flex flex-col">
                      <a href={`tel:${inquiry.phone_number}`} className="flex items-center gap-2 text-sm text-text-main hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px] text-primary">call</span>
                        {inquiry.phone_number}
                      </a>
                      <a href={`mailto:${inquiry.email_address}`} className="flex items-center gap-2 text-sm text-on-surface-variant mt-1 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        {inquiry.email_address}
                      </a>
                    </div>
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
                      status === "Resolved"
                        ? "bg-green-100 text-green-800"
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
                      onChange={(e) => handleUpdateStatus(inquiry.id, e.target.value)}
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
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
