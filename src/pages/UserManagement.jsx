import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";



export default function UserManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Employee");
  const [tempPassword, setTempPassword] = useState("InitialPass2026");
  const [submitting, setSubmitting] = useState(false);
  // Load profiles
  const loadEmployees = async () => {
    setLoading(true);
    if (!supabase) {
      // Local Mock Database Synchronizer
      let localEmployees = localStorage.getItem("truevalue_mock_employees");
      if (!localEmployees) {
        const defaultList = [
          { id: "1", full_name: "Siddharth Mehta", role: "Inventory Manager", email: "s.mehta@truevalue.com", created_at: new Date().toISOString() },
          { id: "2", full_name: "Ananya Kapoor", role: "Senior Sales", email: "a.kapoor@truevalue.com", created_at: new Date().toISOString() },
          { id: "3", full_name: "Rahul Das", role: "Technician", email: "r.das@truevalue.com", created_at: new Date().toISOString() }
        ];
        localStorage.setItem("truevalue_mock_employees", JSON.stringify(defaultList));
        localEmployees = JSON.stringify(defaultList);
      }
      setEmployees(JSON.parse(localEmployees));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");

      if (error) throw error;

      setEmployees(data || []);
    } catch (err) {
      console.error("Failed to load profiles:", err.message);
      alert(`Error loading employees: ${err.message}`);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!fullName || !email) {
      alert("Name and email are required.");
      return;
    }

    setSubmitting(true);

    const newEmpData = {
      full_name: fullName,
      email: email,
      role: role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!supabase) {
      // Local storage mock insert
      const local = localStorage.getItem("truevalue_mock_employees");
      const list = local ? JSON.parse(local) : [];
      const updated = [{ ...newEmpData, id: Math.random().toString(36).substring(2, 9) }, ...list];
      localStorage.setItem("truevalue_mock_employees", JSON.stringify(updated));
      setEmployees(updated);

      setFullName("");
      setEmail("");
      setTempPassword("InitialPass2026");
      setIsModalOpen(false);
      setSubmitting(false);
      return;
    }

    try {
      // Map the frontend role to the strict database enum ('Admin' or 'Employee')
      const dbRole = role === "Admin" ? "Admin" : "Employee";

      // Call the secure database function to register the employee in auth.users & public.profiles
      const { error } = await supabase.rpc('create_employee', {
        p_email: email,
        p_password: tempPassword,
        p_full_name: fullName,
        p_role: dbRole
      });

      if (error) throw error;

      alert(`Successfully created account for ${fullName}!`);
      await loadEmployees();

      setFullName("");
      setEmail("");
      setTempPassword("InitialPass2026");
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to add employee. Full error:", err);
      let errorMsg = err.message || "Unknown error";
      if (err.description) errorMsg = err.description;
      alert(`Error adding employee: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }


  };

  const handleRemoveEmployee = async (id) => {
    if (!confirm("Are you sure you want to remove this employee?")) return;

    if (!supabase) {
      const local = localStorage.getItem("truevalue_mock_employees");
      if (local) {
        const updated = JSON.parse(local).filter(e => String(e.id) !== String(id));
        localStorage.setItem("truevalue_mock_employees", JSON.stringify(updated));
        setEmployees(updated);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadEmployees();
    } catch (err) {
      console.error("Failed to delete employee:", err.message);
      alert(`Error deleting employee: ${err.message}`);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const name = (e.full_name || "").toLowerCase();
      const email = (e.email || "").toLowerCase();
      const role = (e.role || "").toLowerCase();
      return name.includes(query) || email.includes(query) || role.includes(query);
    });
  }, [employees, searchQuery]);

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md mb-stack-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-main mb-2">User Management</h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl">Manage employee access, update roles, and maintain secure credentials for the TrueValue ecosystem.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-on-primary px-6 py-3 rounded-lg font-label-lg flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all w-full md:w-auto justify-center h-12 shrink-0"
        >
          <span className="material-symbols-outlined">person_add</span>
          Add New Employee
        </button>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg w-full">
        <div className="bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant shadow-sm card-shadow">
          <p className="text-body-sm text-on-surface-variant">Total Employees</p>
          <p className="text-headline-md text-primary font-bold">{employees.length}</p>
        </div>
        <div className="bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant shadow-sm card-shadow">
          <p className="text-body-sm text-on-surface-variant">Active Status</p>
          <p className="text-headline-md text-primary font-bold">
            {employees.filter(e => e.status === "Active").length}
          </p>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg overflow-hidden w-full">
        <div className="p-stack-md border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-headline-md text-text-main">Employee Directory</h2>
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-body-md"
              placeholder="Search employees..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="w-full text-center py-24 text-gray-500 font-bold">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            Loading profile records...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] mb-4 text-outline">group</span>
            <h4 className="font-headline-md text-text-main mb-2">No Employees Found</h4>
            <p className="font-body-md">We couldn't find any employees matching your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container text-on-surface-variant font-label-lg border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id || idx} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">
                          {emp.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-label-lg text-text-main font-bold">{emp.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full text-label-md">
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-body-md">{emp.email}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-label-md text-on-primary-fixed-variant">
                        <span className={`w-2 h-2 rounded-full ${emp.status === "Active" ? "bg-green-500" : "bg-outline"}`}></span>
                        {emp.status || "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRemoveEmployee(emp.id)}
                          className="p-2 text-secondary hover:bg-secondary-fixed rounded-lg transition-colors"
                          title="Remove User"
                        >
                          <span className="material-symbols-outlined text-[20px]">person_remove</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-surface w-full max-w-md mx-4 rounded-xl shadow-2xl overflow-hidden transform transition-transform duration-300">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-headline-md text-text-main font-bold">Add New Employee</h3>
              <button
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
                onClick={() => setIsModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div>
                <label className="block font-label-lg mb-1 text-on-surface">Full Name</label>
                <input
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Siddharth Mehta"
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block font-label-lg mb-1 text-on-surface">Official Email</label>
                <input
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
                  placeholder="name@truevalue.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block font-label-lg mb-1 text-on-surface">Role</label>
                <select
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={submitting}
                >
                  <option>Employee</option>
                  <option>Admin</option>
                </select>
              </div>

              <div>
                <label className="block font-label-lg mb-1 text-on-surface">Temporary Credentials / Password</label>
                <div className="relative">
                  <input
                    className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low min-h-[48px] outline-none focus:ring-1 focus:ring-primary font-mono"
                    type="text"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <span
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      alert("Copied temporary credentials to clipboard!");
                    }}
                    className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-primary hover:text-primary-container"
                  >
                    content_copy
                  </span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  className="flex-1 py-3 border border-primary text-primary rounded-lg font-label-lg hover:bg-primary-fixed transition-colors h-12"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-lg shadow-md hover:shadow-lg active:scale-95 transition-all h-12 flex items-center justify-center disabled:opacity-50"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
