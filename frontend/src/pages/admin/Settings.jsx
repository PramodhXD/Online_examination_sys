import { useEffect, useState } from "react";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

const defaults = {
  orgName: "",
  timezone: "UTC+00:00",
  autoSubmitOnTimeout: true,
  strictFaceVerification: true,
  allowRetake: false,
  emailAlerts: true,
  smsAlerts: false,
  maintenanceMode: false,
};

const asBool = (v) => String(v).toLowerCase() === "true";

export default function Settings() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const items = await adminService.getSettings();
      const map = {};
      (items || []).forEach((i) => {
        map[i.key] = i.value;
      });
      setSettings({
        orgName: map.orgName || defaults.orgName,
        timezone: map.timezone || defaults.timezone,
        autoSubmitOnTimeout: map.autoSubmitOnTimeout ? asBool(map.autoSubmitOnTimeout) : defaults.autoSubmitOnTimeout,
        strictFaceVerification: map.strictFaceVerification ? asBool(map.strictFaceVerification) : defaults.strictFaceVerification,
        allowRetake: map.allowRetake ? asBool(map.allowRetake) : defaults.allowRetake,
        emailAlerts: map.emailAlerts ? asBool(map.emailAlerts) : defaults.emailAlerts,
        smsAlerts: map.smsAlerts ? asBool(map.smsAlerts) : defaults.smsAlerts,
        maintenanceMode: map.maintenanceMode ? asBool(map.maintenanceMode) : defaults.maintenanceMode,
      });
    } catch (error) { void error;
      setSettings(defaults);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    try {
      const items = Object.entries(settings).map(([key, value]) => ({
        key,
        value: typeof value === "boolean" ? String(value) : String(value ?? ""),
      }));
      await adminService.updateSettings(items);
      window.alert("Settings saved successfully.");
    } catch (error) { void error;
      window.alert("Failed to save settings.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="settings" isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="settings" toggleSidebar={() => setIsSidebarOpen((p) => !p)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {loading && <section className="bg-white rounded-2xl border border-slate-200 p-6 text-slate-500">Loading settings...</section>}

          {!loading && (
            <>
              <section className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900">General Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Organization Name</span>
                    <input value={settings.orgName} onChange={(e) => update("orgName", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Timezone</span>
                    <select value={settings.timezone} onChange={(e) => update("timezone", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option>UTC+00:00</option>
                      <option>UTC+05:30</option>
                      <option>UTC+08:00</option>
                      <option>UTC-05:00</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900">Exam & Proctoring</h3>
                <div className="space-y-3 mt-4">
                  {[
                    { key: "autoSubmitOnTimeout", label: "Auto submit exam on timeout" },
                    { key: "strictFaceVerification", label: "Enable strict face verification" },
                    { key: "allowRetake", label: "Allow student retake requests" },
                    { key: "maintenanceMode", label: "Enable maintenance mode" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                      <span className="text-sm text-slate-700">{item.label}</span>
                      <input type="checkbox" checked={settings[item.key]} onChange={(e) => update(item.key, e.target.checked)} className="w-4 h-4" />
                    </label>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900">Notifications</h3>
                <div className="space-y-3 mt-4">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <span className="text-sm text-slate-700">Email Alerts</span>
                    <input type="checkbox" checked={settings.emailAlerts} onChange={(e) => update("emailAlerts", e.target.checked)} className="w-4 h-4" />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <span className="text-sm text-slate-700">SMS Alerts</span>
                    <input type="checkbox" checked={settings.smsAlerts} onChange={(e) => update("smsAlerts", e.target.checked)} className="w-4 h-4" />
                  </label>
                </div>
              </section>

              <section className="flex gap-3">
                <button onClick={save} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Save Settings</button>
                <button onClick={loadSettings} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Reset</button>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}


