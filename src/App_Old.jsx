// --------------------------- IMPORTS -----------------------------

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import {
  Plus,
  Calendar,
  Users,
  Clock,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  History,
  FileText,
  Phone,
  AlertCircle,
  CheckCircle,
  User,
  Trash2,
} from "lucide-react";
import logoGulnaz from "./assets/GS-KD-Logo.png";

console.log('🚀🚀🚀 APP.JSX YÜKLENDI 🚀🚀🚀');

// --------------------------- HELPERS -----------------------------

const getDateString = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const normalizeTime = (t) => {
  if (!t) return "";
  const [h = "00", m = "00"] = t.toString().split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
};

const getWeekDates = (baseDate) => {
  const week = [];
  const start = new Date(baseDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    week.push(d);
  }
  return week;
};

const formatPhone = (value) => {
  if (!value) return ""; // "+90 " yerine boş string döndür
  let digits = value.replace(/\D/g, "");
  if (!digits.startsWith("90")) {
    digits = "90" + digits;
  }
  digits = digits.slice(0, 12);
  let formatted = "+";
  if (digits.length > 0) formatted += digits.slice(0, 2);
  if (digits.length > 2) formatted += " " + digits.slice(2, 5);
  if (digits.length > 5) formatted += " " + digits.slice(5, 8);
  if (digits.length > 8) formatted += " " + digits.slice(8, 10);
  if (digits.length > 10) formatted += " " + digits.slice(10, 12);
  return formatted;
};

// --------------------------- STATUS CONFIG -----------------------------
// dummy redeploy for SSL refresh
const STATUS_OPTIONS = [
  { value: "planned", label: "Beklemede" },
  { value: "completed", label: "Tamamlandı" },
  { value: "no_show", label: "Gelmedi" },
  { value: "cancelled", label: "İptal" },
];

const STATUS_CONFIG = {
  planned: {
    label: "Beklemede",
    badgeClass: "bg-yellow-100 text-yellow-800",
    dotClass: "bg-yellow-400",
  },
  completed: {
    label: "Tamamlandı",
    badgeClass: "bg-green-100 text-green-800",
    dotClass: "bg-green-400",
  },
  no_show: {
    label: "Gelmedi",
    badgeClass: "bg-red-100 text-red-800",
    dotClass: "bg-red-400",
  },
  cancelled: {
    label: "İptal",
    badgeClass: "bg-gray-100 text-gray-600",
    dotClass: "bg-gray-400",
  },
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px] font-semibold";
    case "no_show":
      return "bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-semibold";
    case "cancelled":
      return "bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-semibold";
    case "planned":
    default:
      return "bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-[10px] font-semibold";
  }
};

// --------------------------- SCHEDULE CONFIG -----------------------------

const workingHours = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

const appointmentTypes = [
  { value: "Kontrol", color: "bg-blue-50 border-blue-400 hover:bg-blue-100", duration: 30, icon: "🩺" },
  { value: "Ultrason", color: "bg-purple-50 border-purple-400 hover:bg-purple-100", duration: 45, icon: "📊" },
  { value: "İlk Muayene", color: "bg-green-50 border-green-400 hover:bg-green-100", duration: 45, icon: "🥼" },
  { value: "Acil", color: "bg-red-50 border-red-400 hover:bg-red-100", duration: 30, icon: "🚨" },
];

const getTypeColor = (type) =>
  appointmentTypes.find((t) => t.value === type)?.color || "bg-gray-50 border-gray-400";

const getTypeIcon = (type) =>
  appointmentTypes.find((t) => t.value === type)?.icon || "📋";

const getStatusColorClasses = (status) => {
  switch (status) {
    case "completed":
      return "bg-green-50 border-green-200";
    case "no_show":
      return "bg-red-50 border-red-200";
    case "cancelled":
      return "bg-gray-100 border-gray-300";
    case "planned":
    default:
      return "bg-yellow-50 border-yellow-200";
  }
};

// --------------------------- RISK BADGE -----------------------------

function calculateRiskFromHistory(history = [], patient) {
  const records = Array.isArray(history) ? history : [];
  const today = new Date();
  let score = records.length === 0 ? 10 : 20;

  if (records.length > 0) {
    const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
    const last = sorted[sorted.length - 1];
    const lastDate = new Date(last.date);
    const daysSinceLast = (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLast > 365) score += 40;
    else if (daysSinceLast > 180) score += 25;
    else if (daysSinceLast > 90) score += 10;

    const noShows = records.filter((a) => a.status === "no_show").length;
    score += noShows * 15;

    const completed = records.filter((a) => a.status === "completed").length;
    if (completed >= 5) score -= 10;
  }

  const hasOperation = records.some((a) => a.type?.toLowerCase().includes("operasyon"));
  if (hasOperation) score += 15;

  const flaggedNotes = records.some((a) => a.notes?.toLowerCase().includes("yüksek risk"));
  if (flaggedNotes) score += 10;

  if (records.length >= 5) score += 5;
  if (patient?.age && patient.age >= 40) score += 5;

  score = Math.max(0, Math.min(100, score));

  let level;
  if (score >= 70) level = "Yüksek";
  else if (score >= 40) level = "Orta";
  else level = "Düşük";

  return { score, level };
}

const getRiskBadgeClasses = (level) => {
  if (level === "Yüksek") return "bg-red-50 text-red-700 border-red-200";
  if (level === "Orta") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

function RiskBadge({ history, patient }) {
  const { score, level } = calculateRiskFromHistory(history || [], patient);
  const badgeClass = getRiskBadgeClasses(level);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${badgeClass}`}>
      <span>Risk: {level}</span>
      <span className="text-[10px] opacity-70">({score}/100)</span>
    </div>
  );
}

// ------------------------ MAIN COMPONENT --------------------------

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("day");

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientForm, setPatientForm] = useState({
    name: "", phone: "", email: "", dateOfBirth: "", notes: "", kvkk_approved: false,
  });
  const [patientFormLoading, setPatientFormLoading] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientHistory, setShowPatientHistory] = useState(false);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type }), 2500);
  };

  // ---------------------- AUTH CONTROL ---------------------

  const checkUserRole = async (email) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("email", email)
        .single();

      if (error) {
        console.error("Rol kontrolü hatası:", error);
        setUserRole("assistant");
        return;
      }

      setUserRole(data?.role || "assistant");
    } catch (error) {
      console.error("Rol kontrolü hatası:", error);
      setUserRole("assistant");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.email);
      }
      setCheckingAuth(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.email);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // ---------------------- FETCH DATA -----------------------

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Randevular yüklenirken hata:", error);
      showToast("Randevular yüklenemedi!", "error");
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Hastalar yüklenirken hata:", error);
      showToast("Hastalar yüklenemedi!", "error");
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      await Promise.all([fetchAppointments(), fetchPatients()]);
      setLoading(false);
    })();
  }, [user]);

  // ----------------------- DATE HELPERS -----------------------

  const formatDate = (date) =>
    date.toLocaleDateString("tr-TR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const changeDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(d);
  };

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const getTodayAppointments = (date) => {
    const dateStr = getDateString(date);
    return appointments.filter((apt) => getDateString(apt.date) === dateStr);
  };

  // ----------------------- STATS -----------------------

  const stats = useMemo(() => {
    const todayCount = getTodayAppointments(currentDate).length;
    const weekCount = appointments.filter((apt) =>
      weekDates.some((d) => getDateString(d) === getDateString(apt.date))
    ).length;

    return { today: todayCount, week: weekCount };
  }, [appointments, currentDate, weekDates]);

  // ----------------------- PATIENT HELPERS -----------------------

  const getPatientHistory = (patientName) =>
    appointments
      .filter((apt) => apt.patient_name === patientName)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  const patientsWithStats = useMemo(() => {
    const today = new Date();
    return patients
      .map((p) => {
        const history = appointments.filter((apt) => apt.patient_name === p.name);
        const lastVisit = history.length
          ? history.map((apt) => apt.date).sort((a, b) => new Date(b) - new Date(a))[0]
          : null;

        const upcomingAppointments = history.filter(
          (apt) => !apt.completed && new Date(apt.date) >= today
        ).length;

        return { ...p, lastVisit, totalVisits: history.length, upcomingAppointments };
      })
      .sort((a, b) => {
        if (!a.lastVisit && !b.lastVisit) return a.name.localeCompare(b.name);
        if (!a.lastVisit) return 1;
        if (!b.lastVisit) return -1;
        return new Date(b.lastVisit) - new Date(a.lastVisit);
      });
  }, [patients, appointments]);

  const selectedPatientData = useMemo(
    () => patients.find((p) => p.name === selectedPatient) || null,
    [patients, selectedPatient]
  );

  // ----------------------- SLOT & APPOINTMENTS -----------------------

  const isSlotAvailable = (time, date) => {
    const dateStr = getDateString(date);
    return !appointments.some(
      (apt) =>
        getDateString(apt.date) === dateStr &&
        normalizeTime(apt.time) === normalizeTime(time)
    );
  };

  const openAddModal = (slotOrTime, date) => {
    let slot;
    if (typeof slotOrTime === 'object' && slotOrTime !== null) {
      slot = slotOrTime;
    } else {
      slot = { time: slotOrTime, date };
    }
  
    // Edit modu kontrolü - eğer randevunun ID'si varsa edit modudur
    const isEditMode = slot.id ? true : false;
  
    // Edit modunda değilse slot kontrolü yap
    if (!isEditMode && slot.time && slot.date && !isSlotAvailable(slot.time, slot.date)) {
      showToast("Bu saat dolu.", "error");
      return;
    }
    
    setSelectedSlot(slot);
    setShowAddModal(true);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status, completed: status === "completed" })
        .eq("id", id);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === id ? { ...apt, status, completed: status === "completed" } : apt
        )
      );
      showToast("Randevu durumu güncellendi.");
    } catch (error) {
      console.error("Durum güncellenirken hata:", error);
      showToast("Durum güncellenemedi!", "error");
    }
  };

  const handleSaveAppointment = async (form) => {
    // Edit modu kontrolü
    const isEditMode = !!form.id;
  
    if (form.isPatientAppointment) {
      if (!form.patientName) {
        showToast("Hasta adı zorunlu.", "error");
        return;
      }
    } else {
      if (!form.title) {
        showToast("Lütfen randevu için bir ad girin.", "error");
        return;
      }
    }
  
    const appointmentDate = form.date || getDateString(new Date());
    const appointmentTime = form.time || "09:00";
  
    // Edit modunda değilse slot kontrolü yap
    if (!isEditMode && !isSlotAvailable(appointmentTime, appointmentDate)) {
      showToast("Bu tarih ve saatte zaten bir randevu var.", "error");
      return;
    }
  
    const displayName = form.isPatientAppointment
      ? form.patientName.trim()
      : (form.title?.trim() || "Randevu"); 
  
    try {
      const appointmentData = {
        date: appointmentDate,
        time: normalizeTime(appointmentTime),
        patient_name: displayName,
        phone: form.isPatientAppointment ? (form.phone || null) : null,
        type: form.type || "Kontrol",
        duration: form.duration || 60,
        notes: form.notes || null,
        completed: false,
        status: "planned",
        is_patient_appointment: form.isPatientAppointment,
      };
  
      if (isEditMode) {
        // GÜNCELLEME
        const { data, error } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", form.id)
          .select()
          .single();
  
        if (error) throw error;
  
        setAppointments((prev) =>
          prev.map((apt) => (apt.id === form.id ? data : apt))
        );
        showToast("Randevu güncellendi.");
      } else {
        // YENİ EKLEME
        const { data, error } = await supabase
          .from("appointments")
          .insert([appointmentData])
          .select()
          .single();
  
        if (error) throw error;
  
        const insertedAppointment = data;
  
        if (form.isPatientAppointment) {
          const trimmedName = form.patientName.trim();
          const existingPatient = patients.find(
            (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
          );
  
          if (!existingPatient) {
            const { data: newPatient, error: patientError } = await supabase
              .from("patients")
              .insert([
                {
                  name: trimmedName,
                  phone: form.phone || null,
                  email: null,
                  date_of_birth: null,
                  notes: null,
                  kvkk_approved: false,
                  kvkk_approved_at: null,
                },
              ])
              .select()
              .single();
  
            if (patientError) {
              console.error("Hasta kaydı oluşturulurken hata:", patientError);
            } else if (newPatient) {
              setPatients((prev) => [...prev, newPatient]);
            }
          }
  
          if (form.notes && form.notes.trim()) {
            try {
              const { data: existingProfile } = await supabase
                .from("patient_profiles")
                .select("timeline_notes")
                .eq("patient_name", trimmedName)
                .maybeSingle();
  
              const currentNotes = existingProfile?.timeline_notes || [];
              const newNoteEntry = {
                id: Date.now(),
                date: new Date().toISOString(),
                note: `${form.type} randevusu: ${form.notes.trim()}`,
              };
  
              const updatedNotes = [newNoteEntry, ...currentNotes];
  
              await supabase
                .from("patient_profiles")
                .upsert(
                  { patient_name: trimmedName, timeline_notes: updatedNotes },
                  { onConflict: "patient_name" }
                );
            } catch (noteError) {
              console.error("Tarihli not eklenirken hata:", noteError);
            }
          }
        }
  
        setAppointments((prev) => [...prev, insertedAppointment]);
        showToast("Randevu başarıyla kaydedildi.");
      }
  
      setShowAddModal(false);
      setSelectedSlot(null);
    } catch (error) {
      console.error("Randevu işlenirken hata:", error);
      const errorMessage = error?.message || error?.details || "Bilinmeyen hata";
      showToast(`İşlem başarısız: ${errorMessage}`, "error");
    }
  };

  const handleDeletePatient = async (patient) => {
    if (!patient) return;

    const confirmed = window.confirm(
      `"${patient.name}" adlı hastayı ve ona ait randevuları silmek istediğinize emin misiniz?`
    );
    if (!confirmed) return;

    try {
      await supabase.from('patient_profiles').delete().eq('patient_name', patient.name);
      await supabase.from('appointments').delete().eq('patient_name', patient.name);

      if (patient.id) {
        await supabase.from('patients').delete().eq('id', patient.id);
      } else {
        await supabase.from('patients').delete().eq('name', patient.name);
      }

      setPatients((prev) => prev.filter((p) => p.name !== patient.name));
      setAppointments((prev) => prev.filter((a) => a.patient_name !== patient.name));

      if (selectedPatient === patient.name) {
        setSelectedPatient(null);
        setShowPatientHistory(false);
      }

      showToast('Hasta ve randevuları silindi.', 'success');
    } catch (err) {
      console.error('Hasta silinirken hata:', err);
      alert('Hasta silinemedi: ' + err.message);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    const confirmed = window.confirm('Bu randevuyu silmek istediğinize emin misiniz?');
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
      if (error) throw error;
      setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
      showToast('Randevu silindi.');
    } catch (error) {
      console.error('Randevu silinirken hata:', error);
      showToast('Randevu silinemedi!', 'error');
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedSlot(null);
  };

  const handleSavePatient = async () => {
    if (!patientForm.name) return;

    try {
      setPatientFormLoading(true);

      const payload = {
        name: patientForm.name.trim(),
        phone: patientForm.phone || null,
        email: patientForm.email || null,
        date_of_birth: patientForm.dateOfBirth || null,
        notes: patientForm.notes || null,
        kvkk_approved: !!patientForm.kvkk_approved,
        kvkk_approved_at: patientForm.kvkk_approved ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase.from("patients").insert([payload]).select().single();
      if (error) throw error;

      setPatients((prev) => [...prev, data]);
      setShowPatientForm(false);
      setPatientForm({
        name: "", phone: "", email: "", dateOfBirth: "", notes: "", kvkk_approved: false,
      });
      showToast("Hasta kaydedildi.");
    } catch (error) {
      console.error("Hasta kaydedilirken hata:", error);
      showToast("Hasta kaydedilemedi!", "error");
    } finally {
      setPatientFormLoading(false);
    }
  };

  // ----------------------- AUTH GUARDS -----------------------

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-transparent mb-4" />
          <div className="text-2xl font-bold text-gray-800">Kontrol ediliyor...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-transparent mb-4" />
          <div className="text-2xl font-bold text-gray-800">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  // ----------------------- RENDER -----------------------

  return (
    <>
      {toast.show && (
        <div
          className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        {/* ---------------- RESPONSIVE HEADER ---------------- */}
        <div className="bg-[#fff5f7] border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            {/* Mobile Layout */}
            <div className="md:hidden space-y-3">
              <div className="flex items-center gap-2">
                <img src={logoGulnaz} className="w-16 h-auto object-contain" alt="Doç. Dr. Gülnaz Şahin" />
                <div className="flex-1">
                  <div className="text-base font-semibold text-[#b46b7a] leading-tight">
                    Doç. Dr. Gülnaz Şahin
                  </div>
                  <div className="text-[9px] tracking-wide text-[#c697a3] uppercase">
                    Kadın Hastalıkları • Doğum • İnfertilite
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[10px] px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                  {userRole === "doctor" ? "👩‍⚕️ Doktor" : "👤 Asistan"}
                </div>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setUser(null);
                    setUserRole(null);
                  }}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg"
                >
                  Çıkış
                </button>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 bg-gradient-to-br from-pink-500 to-pink-600 text-white px-3 py-2 rounded-lg shadow text-center">
                  <div className="text-[9px] opacity-90">Bugün</div>
                  <div className="text-lg font-bold">{stats.today}</div>
                </div>
                <div className="flex-1 bg-gradient-to-br from-purple-500 to-purple-600 text-white px-3 py-2 rounded-lg shadow text-center">
                  <div className="text-[9px] opacity-90">Bu Hafta</div>
                  <div className="text-lg font-bold">{stats.week}</div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex items-center justify-between h-[120px]">
              <div className="flex items-center gap-3">
                <img src={logoGulnaz} className="w-[105px] h-auto object-contain" alt="Doç. Dr. Gülnaz Şahin" />
                <div className="flex flex-col leading-tight ml-2">
                  <div className="text-[22px] font-semibold text-[#b46b7a]">
                    Doç. Dr. Gülnaz Şahin
                  </div>
                  <div className="text-xs tracking-wide text-[#c697a3] uppercase">
                    Kadın Hastalıkları • Doğum • İnfertilite
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-[10px] px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full inline-block">
                      {userRole === "doctor" ? "👩‍⚕️ Doktor" : "👤 Asistan"}
                    </div>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setUser(null);
                        setUserRole(null);
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg shadow transition-all"
                    >
                      Çıkış
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end justify-center h-full">
                <div className="text-[24px] font-medium text-[#d14b84] mb-1">
                  Randevu Yönetim Sistemi
                </div>
                <div className="flex gap-2 mt-2 -mb-4">
                  <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white px-3 py-1.5 rounded-lg shadow text-center">
                    <div className="text-[10px] opacity-90 leading-none">Bugün</div>
                    <div className="text-xl font-bold leading-none">{stats.today}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white px-3 py-1.5 rounded-lg shadow text-center">
                    <div className="text-[10px] opacity-90 leading-none">Bu Hafta</div>
                    <div className="text-xl font-bold leading-none">{stats.week}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- CONTROLS + VIEW SWITCH ---------------- */}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-5 mb-4 sm:mb-6">
            <div className="flex gap-2 flex-wrap items-center justify-between">
              {/* Sol taraf - View butonları */}
              <div className="flex gap-2">
              <button
                onClick={() => setView("day")}
                className={`flex-1 sm:flex-initial sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all text-xs sm:text-base flex flex-col sm:flex-row items-center gap-1 sm:gap-2 ${
                  view === "day"
                    ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Günlük</span>
              </button>
              <button
                onClick={() => setView("week")}
                className={`flex-1 sm:flex-initial sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all text-xs sm:text-base flex flex-col sm:flex-row items-center gap-1 sm:gap-2 ${
                  view === "week"
                    ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Haftalık</span>
              </button>
              <button
                onClick={() => setView("patients")}
                className={`flex-1 sm:flex-initial sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all text-xs sm:text-base flex flex-col sm:flex-row items-center gap-1 sm:gap-2 ${
                  view === "patients"
                    ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Hastalar</span>
              </button>
              <button
                onClick={() => setView("all")}
                className={`flex-1 sm:flex-initial sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all text-xs sm:text-base flex flex-col sm:flex-row items-center gap-1 sm:gap-2 ${
                  view === "all"
                    ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Tüm Randevular</span>
              </button>

            </div>

              {/* Sağ taraf - Yeni Randevu butonu */}
              <button
                onClick={() => {
                  setSelectedSlot({ 
                    date: currentDate, 
                    time: "09:00", 
                    duration: 60 
                  });
                  setShowAddModal(true);
                }}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 font-medium shadow-lg transition-all text-xs sm:text-base flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Yeni Randevu Ekle</span>
                <span className="sm:hidden">Yeni Randevu</span>
              </button>
            </div>
          </div>

          {(view === "day" || view === "week") && (
            <div className="bg-white rounded-2xl shadow-lg mb-4 sm:mb-6">
              <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50 rounded-t-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-pink-600" />
                    <h3 className="text-base sm:text-lg font-bold text-gray-800">
                      {view === "day" ? "Günlük Takvim" : "Haftalık Takvim"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium shadow transition-all"
                  >
                    Bugün
                  </button>
                </div>

                {/* Tarih Navigasyonu - Oklar tarihin yanında */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => changeDate(view === "day" ? -1 : -7)}
                    className="p-2 hover:bg-white/50 rounded-xl transition-all flex-shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>

                  <div className="text-center px-4">
                    <div className="font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                      {view === "day"
                        ? formatDate(currentDate)
                        : (() => {
                            const start = weekDates[0];
                            const end = weekDates[weekDates.length - 1];
                            return (
                              <>
                                <span className="hidden sm:inline">
                                  {start.toLocaleDateString("tr-TR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                  {" - "}
                                  {end.toLocaleDateString("tr-TR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="sm:hidden">
                                  {start.toLocaleDateString("tr-TR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                  })}
                                  {" - "}
                                  {end.toLocaleDateString("tr-TR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </span>
                              </>
                            );
                          })()}
                    </div>
                  </div>

                  <button
                    onClick={() => changeDate(view === "day" ? 1 : 7)}
                    className="p-2 hover:bg-white/50 rounded-xl transition-all flex-shrink-0"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>

              <div className="p-3 sm:p-4">
                {view === "day" && (
                  <DayView
                    workingHours={workingHours}
                    appointments={getTodayAppointments(currentDate)}
                    currentDate={currentDate}
                    openAddModal={openAddModal}
                    getTypeIcon={getTypeIcon}
                    handleUpdateStatus={handleUpdateStatus}
                    openPatientHistory={(name) => {
                      setSelectedPatient(name);
                      setShowPatientHistory(true);
                    }}
                    onDeleteAppointment={handleDeleteAppointment}
                  />
                )}

                {view === "week" && (
                  <WeekView
                    workingHours={workingHours}
                    appointments={appointments}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    openAddModal={openAddModal}
                    getTypeIcon={getTypeIcon}
                    handleUpdateStatus={handleUpdateStatus}
                    openPatientHistory={(name) => {
                      setSelectedPatient(name);
                      setShowPatientHistory(true);
                    }}
                    onDeleteAppointment={handleDeleteAppointment}
                  />
                )}
               </div>
            </div>
          )}

          {view === "patients" && (
            <PatientsView
              patients={patientsWithStats}
              appointments={appointments}
              getPatientHistory={getPatientHistory}
              openPatientHistory={(name) => {
                setSelectedPatient(name);
                setShowPatientHistory(true);
              }}
              onAddPatient={() => setShowPatientForm(true)}
              onDeletePatient={handleDeletePatient}
              onEditPatient={(p) => {
                // optional: if you have edit modal, wire here; otherwise keep for future
                setPatientForm((prev) => ({ ...prev, ...(p || {}) }));
                setShowPatientForm(true);
              }}
            />
          )}
        </div>
        {view === "all" && (
          <AllAppointmentsView
            appointments={appointments}
            onEditAppointment={(apt) => {
              setSelectedSlot(apt);
              setShowAddModal(true);
            }}
            onDeleteAppointment={handleDeleteAppointment}
            getTypeIcon={getTypeIcon}
          />
        )}
        {/* MODALS */}
        {showPatientForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-pink-50 to-purple-50 rounded-t-2xl">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-pink-600" />
                  Yeni Hasta Kaydı
                </h3>
                <button
                  onClick={() => setShowPatientForm(false)}
                  className="p-2 hover:bg-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad *</label>
                  <input
                    type="text"
                    value={patientForm.name}
                    onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Örn: Ayşe Yılmaz"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={formatPhone(patientForm.phone || "")}
                    onChange={(e) =>
                      setPatientForm((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="+90 5xx xxx xx xx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                  <input
                    type="email"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="ornek@mail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doğum Tarihi</label>
                  <input
                    type="date"
                    value={patientForm.dateOfBirth}
                    onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                  <textarea
                    value={patientForm.notes}
                    onChange={(e) => setPatientForm({ ...patientForm, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Genel sağlık bilgileri, önemli notlar..."
                  />
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={patientForm.kvkk_approved}
                      onChange={(e) =>
                        setPatientForm({ ...patientForm, kvkk_approved: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <span>
                      Hastaya <span className="font-semibold">KVKK Aydınlatma Metni</span> sözlü/yazılı olarak iletilmiştir.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
                <button
                  onClick={() => setShowPatientForm(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={handleSavePatient}
                  disabled={patientFormLoading || !patientForm.name}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl hover:from-pink-600 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed font-medium shadow-lg"
                >
                  {patientFormLoading ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <AddAppointmentModal
            selectedSlot={selectedSlot}
            onClose={closeAddModal}
            onSave={handleSaveAppointment}
            patients={patients}
          />
        )}

        {showPatientHistory && selectedPatient && (
          <PatientHistoryModal
            selectedPatient={selectedPatient}
            patient={selectedPatientData}
            getPatientHistory={getPatientHistory}
            getTypeColor={getTypeColor}
            getTypeIcon={getTypeIcon}
            onClose={() => {
              setShowPatientHistory(false);
              setSelectedPatient(null);
            }}
            onDeletePatient={async (patient) => {
              await handleDeletePatient(patient);
              setShowPatientHistory(false);
              setSelectedPatient(null);
            }}
            onPatientUpdated={(updated) => {
              if (!updated || !updated.id) return;
              setPatients((prev) =>
                prev.map((p) =>
                  p.id === updated.id
                    ? { ...p, kvkk_approved: updated.kvkk_approved, kvkk_approved_at: updated.kvkk_approved_at }
                    : p
                )
              );
            }}
            showToast={showToast}
          />
        )}
      </div>
    </>
  );
}
// =========================== DAY VIEW ===========================

function DayView({
  workingHours,
  appointments,
  currentDate,
  openAddModal,
  getTypeIcon,
  handleUpdateStatus,
  openPatientHistory,
  onDeleteAppointment,
}) {
  const date = currentDate ? new Date(currentDate) : new Date();
  const dateKey = date.toISOString().slice(0, 10);
  const dayAppointments = (appointments || []).filter((apt) => apt.date === dateKey);

  const timeSlots = []; 
  for (let h = 7; h < 23; h++) {
    timeSlots.push(`${String(h).padStart(2, "0")}:00`);
  }

  const handleEmptyClick = (time) => {
    if (!openAddModal) return;
    openAddModal({ date, time, duration: 60 });
  };

  const handleAppointmentClick = (apt) => {
    if (!openAddModal) return;
    openAddModal({ ...apt, isEdit: true });
  };

  const timeStringToMinutes = (t) => {
    const [h, m] = (t || "00:00").split(":").map(Number);
    return h * 60 + m;
  };

  const SLOT_HEIGHT_PX = 40;

  return (
    <div className="bg-white rounded-lg overflow-hidden flex flex-col">
      <div className="flex flex-1 overflow-auto text-xs sm:text-sm">
        <div className="w-16 border-r border-gray-100 bg-gray-50">
          {timeSlots.map((slot) => (
            <div
              key={slot}
              className="h-10 border-b border-gray-100 px-1 pt-[2px] text-[10px] sm:text-xs text-gray-500 text-right"
            >
              {slot}
            </div>
          ))}
        </div>

        <div className="flex-1 relative">
          {timeSlots.map((slot) => (
            <div
              key={slot}
              className="h-10 border-b border-gray-100 cursor-pointer hover:bg-green-50 transition-colors"
              onClick={() => handleEmptyClick(slot)}
            />
          ))}

          {dayAppointments.map((apt) => {
            const minutesFromStart = timeStringToMinutes(apt.time || "07:00") - 7 * 60;
            const topPx = (minutesFromStart / 60) * SLOT_HEIGHT_PX;
            const duration = apt.duration || 60;
            const heightPx = Math.max(duration / 60, 0.5) * SLOT_HEIGHT_PX;

            return (
              <div
                key={apt.id}
                className={`absolute left-1 right-1 sm:left-1.5 sm:right-1.5 rounded-md ${
                  apt.is_patient_appointment
                    ? 'bg-blue-200/90 hover:bg-blue-300 border-l-4 border-blue-500' 
                    : 'bg-purple-200/90 hover:bg-purple-300 border-l-4 border-purple-500'
                } text-[10px] sm:text-xs text-gray-800 shadow-md px-1.5 py-1 cursor-pointer overflow-hidden flex flex-col`}
                style={{ top: topPx, height: heightPx }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAppointmentClick(apt);
                }}
              >
                <div className="flex items-start justify-between gap-1 flex-1">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1">
                      {/* Icon - Hasta randevusuysa steteskop, değilse takvim */}
                      <span className="shrink-0">
                        {apt.is_patient_appointment ? '🩺' : '📅'}
                      </span>
                      <span className="truncate">{apt.patient_name || apt.patientName || "Randevu"}</span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-gray-700 truncate">
                      {/* Sadece hasta randevusunda type göster */}
                      {apt.time} {apt.is_patient_appointment && `• ${apt.type}`}
                    </div>
                  </div>
                  {onDeleteAppointment && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault(); // ← EKLE
                        if (window.confirm("Bu randevuyu silmek istediğinize emin misiniz?")) {
                          onDeleteAppointment(apt.id);
                        }
                      }}
                      className="shrink-0 p-0.5 hover:bg-red-500/20 rounded transition-colors"
                      title="Randevuyu Sil"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// =========================== WEEK VIEW ===========================

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(currentDate) {
  const start = getStartOfWeek(currentDate);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function WeekView({
  currentDate,
  appointments,
  openAddModal,
  openEditModal,
  getTypeIcon,
  onDeleteAppointment,
}) {
  const weekDays = getWeekDays(currentDate || new Date());

  const timeSlots = [];
  for (let h = 7; h < 23; h++) {
    timeSlots.push(`${String(h).padStart(2, "0")}:00`);
  }

  const handleEmptyCellClick = (dayDate, time) => {
    if (!openAddModal) return;
    openAddModal({ date: dayDate, time, duration: 60 });
  };

  const handleAppointmentClick = (apt) => {
    if (openEditModal) {
      openEditModal(apt);
    } else if (openAddModal) {
      openAddModal({ ...apt, isEdit: true });
    }
  };

  const SLOT_HEIGHT_PX = 40;

  const formatDateKey = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const weekViewTimeStringToMinutes = (t) => {
    const [h, m] = (t || "00:00").split(":").map(Number);
    return h * 60 + m;
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden flex flex-col">
      {/* HEADER */}
      <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        <div className="w-12 sm:w-16 border-r border-gray-200 flex items-center justify-center">
          <span className="text-[10px] sm:text-xs font-semibold text-gray-500">Saat</span>
        </div>
        
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="flex-1 border-r border-gray-200 last:border-r-0 px-1 py-2 text-center"
          >
            <div className="text-[10px] sm:text-xs font-semibold text-gray-700">
              {day.toLocaleDateString("tr-TR", { weekday: "short" })}
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">
              {day.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}
            </div>
          </div>
        ))}
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-auto text-xs sm:text-sm">
        <div className="w-12 sm:w-16 border-r border-gray-200 bg-gray-50 flex-shrink-0">
          {timeSlots.map((slot) => (
            <div
              key={slot}
              className="h-10 border-b border-gray-100 px-1 flex items-start justify-end text-[9px] sm:text-[10px] text-gray-500 pt-0.5"
            >
              {slot}
            </div>
          ))}
        </div>

        {weekDays.map((day) => {
          const dayKey = formatDateKey(day);
          const dayAppointments = (appointments || []).filter((apt) => {
            const aptDate = formatDateKey(apt.date);
            return aptDate === dayKey;
          });

          return (
            <div
              key={day.toISOString()}
              className="flex-1 border-r border-gray-200 last:border-r-0 relative"
            >
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  className="h-10 border-b border-gray-100 cursor-pointer hover:bg-green-50 transition-colors"
                  onClick={() => handleEmptyCellClick(day, slot)}
                />
              ))}

              {dayAppointments.map((apt) => {
                const minutesFromStart = weekViewTimeStringToMinutes(apt.time || "07:00") - 7 * 60;
                const topPx = (minutesFromStart / 60) * SLOT_HEIGHT_PX;
                const duration = apt.duration || 60;
                const heightPx = Math.max(duration / 60, 0.5) * SLOT_HEIGHT_PX;

                return (
                  <div
                    key={apt.id}
                    className={`absolute left-0.5 right-0.5 rounded ${
                      apt.is_patient_appointment
                        ? 'bg-blue-200/90 hover:bg-blue-300 border-l-2 border-blue-500' 
                        : 'bg-purple-200/90 hover:bg-purple-300 border-l-2 border-purple-500'
                    } text-[9px] sm:text-[10px] text-gray-800 shadow-sm px-1 py-0.5 cursor-pointer overflow-hidden`}
                    style={{ top: topPx, height: heightPx }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAppointmentClick(apt);
                    }}
                  >
                    <div className="flex items-start justify-between gap-0.5 h-full">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate flex items-center gap-1 text-[9px] leading-tight">
                          {/* Icon - Hasta randevusuysa steteskop, değilse takvim */}
                          <span className="shrink-0">
                            {apt.is_patient_appointment ? '🩺' : '📅'}
                          </span>
                          <span className="truncate">{apt.patient_name || apt.patientName || "Randevu"}</span>
                        </div>
                        <div className="text-[8px] text-gray-700 truncate">
                          {/* Sadece hasta randevusunda type göster */}
                          {apt.time} {apt.is_patient_appointment && apt.type}
                        </div>
                      </div>
                      {onDeleteAppointment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault(); // ← EKLE
                            if (window.confirm("Bu randevuyu silmek istediğinize emin misiniz?")) {
                              onDeleteAppointment(apt.id);
                            }
                          }}
                          className="shrink-0 p-0.5 hover:bg-red-500/20 rounded"
                          title="Randevuyu Sil"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// =========================== PATIENTS VIEW ===========================

function PatientsView({
  patients = [],
  openPatientHistory,
  openAddPatient,
  onDeletePatient,
  onEditPatient,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-t-2 border-t-gray-200 border-b bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-600" />
              Hastalar
            </h3>
            <p className="text-sm text-gray-600 mt-1">Hasta listesi ve özet bilgiler</p>
          </div>

          <div className="flex items-center gap-2">
            {openAddPatient && (
              <button
                type="button"
                onClick={openAddPatient}
                className="px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 shadow-sm"
              >
                + Yeni Hasta
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="p-6">
        {(patients || []).length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Henüz hasta bulunmuyor</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {patients.map((p) => {
              const name = p?.name || "İsimsiz Hasta";
              const phone = p?.phone || "";
              const total = p?.totalVisits ?? p?.visit_count ?? 0;
              const last = p?.lastVisit || p?.last_visit || null;

              return (
                <div key={p.id || name} className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{name}</div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {phone ? <span>{phone}</span> : <span className="text-gray-400">Telefon yok</span>}
                        <span>Toplam: {total}</span>
                        {last ? <span>Son: {new Date(last).toLocaleDateString("tr-TR")}</span> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {openPatientHistory && (
                        <button
                          type="button"
                          onClick={() => openPatientHistory(name)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-pink-100 text-pink-700 hover:bg-pink-200"
                        >
                          Hasta Profili
                        </button>
                      )}
                      {onEditPatient && (
                        <button
                          type="button"
                          onClick={() => onEditPatient(p)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        >
                          Düzenle
                        </button>
                      )}
                      {onDeletePatient && (
                        <button
                          type="button"
                          onClick={() => onDeletePatient(p.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </div>

                  {p?.notes ? (
                    <div className="mt-3 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      {p.notes}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AllAppointmentsView({
  appointments = [],
  patients = [],
  openPatientHistory,
  onUpdateStatus,
  onDeleteAppointment,
}) {
  const [query, setQuery] = React.useState("");
  const [openMap, setOpenMap] = React.useState({});
  const [expandedAptId, setExpandedAptId] = React.useState(null);

  const patientPhoneMap = React.useMemo(() => {
    const map = {};
    (patients || []).forEach((p) => {
      if (p?.name) map[p.name] = p.phone || "";
    });
    return map;
  }, [patients]);

  const patientAppointments = React.useMemo(() => {
    return (appointments || []).filter((a) => !!a.is_patient_appointment);
  }, [appointments]);

  const otherAppointments = React.useMemo(() => {
    return (appointments || []).filter((a) => !a.is_patient_appointment);
  }, [appointments]);

  const statusLabel = (s) => {
    if (s === "completed") return "Tamamlandı";
    if (s === "cancelled") return "İptal";
    return "Beklemede";
  };

  const statusClass = (s) => {
    if (s === "completed") return "bg-green-100 text-green-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const passesQuery = React.useCallback(
    (a, qLower) => {
      if (!qLower) return true;
      const name = (a.patient_name || "").toLowerCase();
      const phone = (a.phone || patientPhoneMap[a.patient_name] || "").toLowerCase();
      const type = (a.type || "").toLowerCase();
      const notes = (a.notes || "").toLowerCase();
      return name.includes(qLower) || phone.includes(qLower) || type.includes(qLower) || notes.includes(qLower);
    },
    [patientPhoneMap]
  );

  const filteredPatient = React.useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return patientAppointments.filter((a) => passesQuery(a, q));
  }, [query, patientAppointments, passesQuery]);

  const filteredOther = React.useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return otherAppointments.filter((a) => passesQuery(a, q));
  }, [query, otherAppointments, passesQuery]);

  const grouped = React.useMemo(() => {
    const map = new Map();
    for (const a of filteredPatient) {
      const key = a.patient_name || "İsimsiz Hasta";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ ...a, status: a.status || "planned" });
    }

    for (const [, list] of map.entries()) {
      list.sort((x, y) => {
        const dx = new Date(`${x.date}T${x.time || "00:00"}`).getTime();
        const dy = new Date(`${y.date}T${y.time || "00:00"}`).getTime();
        return dy - dx;
      });
    }

    const arr = Array.from(map.entries()).map(([patientName, list]) => ({
      patientName,
      list,
      lastTs: new Date(`${list[0]?.date}T${list[0]?.time || "00:00"}`).getTime(),
    }));

    arr.sort((a, b) => b.lastTs - a.lastTs);
    return arr;
  }, [filteredPatient]);

  const sortedOther = React.useMemo(() => {
    const list = (filteredOther || []).map((a) => ({ ...a, status: a.status || "planned" }));
    list.sort((x, y) => {
      const dx = new Date(`${x.date}T${x.time || "00:00"}`).getTime();
      const dy = new Date(`${y.date}T${y.time || "00:00"}`).getTime();
      return dy - dx;
    });
    return list;
  }, [filteredOther]);

  const togglePatient = (name) => {
    setOpenMap((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const formatDateText = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-t-2 border-t-gray-200 border-b bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-pink-600" />
              Tüm Randevular
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Hasta randevuları hasta bazında; diğer etkinlikler ayrı listelenir
            </p>
          </div>

          <div className="w-full sm:w-80">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hasta adı / telefon / tür / not ara..."
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* OTHER EVENTS */}
        {sortedOther.length > 0 && (
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 bg-white border-b flex items-center justify-between">
              <div className="font-semibold text-gray-800">Diğer Etkinlikler</div>
              <div className="text-sm text-gray-500">Toplam: {sortedOther.length}</div>
            </div>

            <div className="divide-y">
              {sortedOther.map((apt) => {
                const dateText = formatDateText(apt.date);
                const title = apt.patient_name || apt.title || apt.type || "Etkinlik";

                return (
                  <div key={apt.id} className="p-4 flex items-start justify-between gap-3 bg-white">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{title}</div>

                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{dateText}</span>
                        <span>• {apt.time || "--:--"}</span>
                        <span className={`px-2 py-1 rounded-lg ${statusClass(apt.status)}`}>{statusLabel(apt.status)}</span>
                      </div>

                      <div className="text-xs text-gray-600 mt-1">
                        Tür: <span className="font-medium">{apt.type || "-"}</span>
                        {apt.duration ? <span> • Süre: {apt.duration} dk</span> : null}
                      </div>

                      {apt.notes ? (
                        <div className="text-xs text-gray-700 mt-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                          {apt.notes}
                        </div>
                      ) : null}
                    </div>

                    {onDeleteAppointment && (
                      <button
                        type="button"
                        onClick={() => onDeleteAppointment(apt.id)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 shrink-0"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PATIENT GROUPS */}
        {grouped.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Gösterilecek randevu bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(({ patientName, list }) => {
              const isOpen = !!openMap[patientName];
              const phone = patientPhoneMap[patientName] || (list[0]?.phone || "");

              return (
                <div key={patientName} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => togglePatient(patientName)}
                    className="w-full flex items-center justify-between gap-4 p-4 bg-white hover:bg-gray-50 transition-all text-left"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{patientName}</div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {phone ? <span>{phone}</span> : <span className="text-gray-400">Telefon yok</span>}
                        <span>Toplam: {list.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {openPatientHistory && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPatientHistory(patientName);
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-pink-100 text-pink-700 hover:bg-pink-200"
                        >
                          Hasta Profili
                        </button>
                      )}
                      <div className="text-gray-400">{isOpen ? "▲" : "▼"}</div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="bg-gray-50 border-t border-gray-200 divide-y divide-gray-200">
                      {list.map((apt) => {
                        const aptTs = new Date(`${apt.date}T${apt.time || "00:00"}`).getTime();
                        const canComplete = aptTs <= Date.now();
                        const dateText = formatDateText(apt.date);
                        const isExpanded = expandedAptId === apt.id;

                        const showRowActions = isExpanded; // Option 2: actions only when expanded

                        return (
                          <div key={apt.id} className="p-4 bg-white">
                            <button
                              type="button"
                              onClick={() => setExpandedAptId((prev) => (prev === apt.id ? null : apt.id))}
                              className="w-full text-left"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-800">{dateText}</span>
                                    <span className="text-sm text-gray-600">• {apt.time || "--:--"}</span>
                                    <span className={`px-2 py-1 text-xs rounded-lg ${statusClass(apt.status)}`}>
                                      {statusLabel(apt.status)}
                                    </span>
                                  </div>

                                  <div className="text-xs text-gray-600 mt-1">
                                    Tür: <span className="font-medium">{apt.type || "-"}</span>
                                    {apt.duration ? <span> • Süre: {apt.duration} dk</span> : null}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {onDeleteAppointment && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteAppointment(apt.id);
                                      }}
                                      className="px-3 py-1.5 text-xs rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    >
                                      Sil
                                    </button>
                                  )}
                                  <div className="text-gray-400 w-8 text-center">{isExpanded ? "▲" : "▼"}</div>
                                </div>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="mt-3">
                                {apt.notes ? (
                                  <div className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    {apt.notes}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400">Not yok</div>
                                )}

                                {showRowActions && (
                                  <div className="mt-3 flex items-center justify-end gap-2">
                                    {onUpdateStatus && apt.status !== "cancelled" && (
                                      <button
                                        type="button"
                                        onClick={() => onUpdateStatus(apt.id, "cancelled")}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                                      >
                                        İptal
                                      </button>
                                    )}

                                    {onUpdateStatus && apt.status !== "completed" && apt.status !== "cancelled" && canComplete && (
                                      <button
                                        type="button"
                                        onClick={() => onUpdateStatus(apt.id, "completed")}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                                      >
                                        Tamamlandı
                                      </button>
                                    )}

                                    {onUpdateStatus && apt.status !== "completed" && apt.status !== "cancelled" && !canComplete && (
                                      <div className="text-xs text-gray-400 px-2">
                                        Randevu saati gelince “Tamamlandı” aktif olur
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================== ADD APPOINTMENT MODAL ===========================

function AddAppointmentModal({ selectedSlot, onClose, onSave, patients = [] }) {
  const isEditMode = selectedSlot?.id ? true : false;
  const buildTimeOptions = () => {
    const opts = [];
    const startMinutes = 7 * 60;
    const endMinutes = 23 * 60;
    for (let m = startMinutes; m <= endMinutes; m += 30) {
      const h = String(Math.floor(m / 60)).padStart(2, "0");
      const min = String(m % 60).padStart(2, "0");
      opts.push(`${h}:${min}`);
    }
    return opts;
  };

  const timeOptions = buildTimeOptions();

  const timeToMinutes = (t) => {
    const [h, m] = (t || "00:00").split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (mins) => {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    return `${h}:${m}`;
  };

  const defaultDate = selectedSlot?.date ? new Date(selectedSlot.date) : new Date();
  
  const [selectedDate, setSelectedDate] = React.useState(defaultDate);

  const defaultStartTime =
    selectedSlot?.time && typeof selectedSlot.time === "string"
      ? selectedSlot.time
      : "09:00";

  const defaultEndTime = (() => {
    const base = timeToMinutes(defaultStartTime) + (selectedSlot?.duration || 60);
    return minutesToTime(base);
  })();

  const [startTime, setStartTime] = React.useState(defaultStartTime);
  const [endTime, setEndTime] = React.useState(defaultEndTime);

  const [form, setForm] = React.useState({
    title: selectedSlot?.patient_name || selectedSlot?.title || "", // Edit modunda patient_name'i title'a yükle
    isPatientAppointment: selectedSlot?.is_patient_appointment !== undefined 
      ? selectedSlot.is_patient_appointment 
      : true, // Database'den gelen değeri kullan, yoksa default true
    patientName: selectedSlot?.patient_name || selectedSlot?.patientName || "",
    phone: formatPhone(selectedSlot?.phone || ""),
    type: selectedSlot?.type || "Kontrol",
    notes: selectedSlot?.notes || "",
  });

  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [matchingPatients, setMatchingPatients] = React.useState([]);

  React.useEffect(() => {
    if (!form.isPatientAppointment) {
      setMatchingPatients([]);
      setShowSuggestions(false);
      return;
    }

    const query = form.patientName?.trim().toLowerCase();
    if (!query || query.length < 2 || !patients || patients.length === 0) {
      setMatchingPatients([]);
      setShowSuggestions(false);
      return;
    }

    const matches = patients.filter((p) => p.name?.toLowerCase().includes(query));
    setMatchingPatients(matches);
    setShowSuggestions(matches.length > 0);
  }, [form.patientName, form.isPatientAppointment, patients]);

  const handleChangeType = (value) => {
    setForm((prev) => ({ ...prev, type: value }));
  };

  const handleSubmit = () => {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (endMin <= startMin) {
    alert("Bitiş saati, başlangıç saatinden büyük olmalı.");
    return;
  }

  const duration = endMin - startMin;

  onSave({
    ...form,
    id: selectedSlot?.id, // Edit modunda ID'yi gönder
    patientName: form.isPatientAppointment ? form.patientName : null,
    phone: form.isPatientAppointment ? form.phone : null,
    date: selectedDate.toISOString().slice(0, 10),
    time: startTime,
    duration,
  });
};

  const dateLabel = defaultDate.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50">
          <h2 className="text-lg font-bold text-gray-800">
            {isEditMode ? "Randevu Düzenle" : "Yeni Randevu"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm">
            Kapat
          </button>
        </div>

        {/* Body */}
          <div className="p-6 space-y-5 overflow-auto">
            {/* Tarih + Saat */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tarih ve Saat
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tarih</label>
                <input
                  type="date"
                  value={selectedDate.toISOString().slice(0, 10)}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setSelectedDate(newDate);
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Başlangıç Saati</label>
                  <select
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    value={startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartTime(newStart);
                      const newStartMin = timeToMinutes(newStart);
                      const endMin = timeToMinutes(endTime);
                      if (endMin <= newStartMin) {
                        setEndTime(minutesToTime(newStartMin + 60));
                      }
                    }}
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Bitiş Saati</label>
                  <select
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Hasta randevusu checkbox - ÖNE ALINDI */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <input
                id="isPatient"
                type="checkbox"
                checked={form.isPatientAppointment}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isPatientAppointment: e.target.checked }))
                }
                className="w-4 h-4"
              />
              <label htmlFor="isPatient" className="text-sm text-gray-700 font-medium select-none cursor-pointer">
                Bu bir hasta randevusu
              </label>
            </div>

            {/* Hasta randevusu İSE */}
            {form.isPatientAppointment ? (
              <>
                <div className="space-y-1 relative">
                  <label className="text-xs text-gray-500">Hasta Adı *</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    value={form.patientName || ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, patientName: e.target.value }))
                    }
                    onFocus={() => {
                      if (!isEditMode && matchingPatients.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder="Hasta adını girin"
                  />

                  {!isEditMode && showSuggestions && matchingPatients && matchingPatients.length > 0 && (
                    <div 
                      className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      onMouseDown={(e) => {
                        // Dropdown içindeki tıklamaların input'un blur eventini tetiklemesini engelle
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      {matchingPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              patientName: p.name,
                              phone: formatPhone(p.phone || ""),
                            }));
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-pink-50 flex flex-col cursor-pointer"
                        >
                          <span className="font-medium text-gray-800">{p.name}</span>
                          {p.phone && <span className="text-xs text-gray-500">{formatPhone(p.phone)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Telefon</label>
                  <input
                    type="tel"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    value={formatPhone(form.phone || "")}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setForm((prev) => ({ ...prev, phone: formatted || "" }));
                    }}
                    placeholder="+90 5xx xxx xx xx"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Randevu Türü</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    value={form.type}
                    onChange={(e) => handleChangeType(e.target.value)}
                  >
                    <option value="Kontrol">Kontrol</option>
                    <option value="İlk Muayene">İlk Muayene</option>
                    <option value="USG">USG</option>
                    <option value="Prosedür">Prosedür</option>
                  </select>
                </div>
              </>
            ) : (
              /* Hasta randevusu DEĞİLSE - sadece Randevu Adı */
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Randevu Adı *</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Örn: TV Programı, Konferans, Toplantı"
                />
              </div>
            )}

            {/* Notlar - Her durumda göster */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Notlar</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
                rows={3}
                value={form.notes || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="İlave notlar..."
              />
            </div>
          </div>

        {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm rounded-lg bg-pink-500 text-white hover:bg-pink-600"
            >
              {isEditMode ? "Güncelle" : "Randevuyu Kaydet"}
            </button>
          </div>
      </div>
    </div>
  );
}
// =========================== PATIENT HISTORY MODAL ===========================

function PatientHistoryModal({
  selectedPatient,
  patient,
  getPatientHistory,
  getTypeColor,
  getTypeIcon,
  onClose,
  onDeletePatient,
  onPatientUpdated,
  showToast,
}) {
  const history = getPatientHistory ? getPatientHistory(selectedPatient) : [];

  const [profile, setProfile] = useState({
    phone: "",
    diagnosis: "",
    notes: "",
    timeline_notes: [],
    kvkk_approved: patient?.kvkk_approved ?? false,
    kvkk_approved_at: patient?.kvkk_approved_at ?? null,
  });

  const [newNote, setNewNote] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [selectedPatient]);

  useEffect(() => {
    if (hasLoadedRef.current) return;

    let isMounted = true;

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("patient_profiles")
          .select("*")
          .eq("patient_name", selectedPatient)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error("Hasta profili yüklenirken hata:", error);
        }

        const lastPhone = history && history.length > 0 ? history[0].phone || "" : "";

        setProfile({
          phone: data?.phone ?? lastPhone,
          diagnosis: data?.diagnosis ?? "",
          notes: data?.notes ?? "",
          timeline_notes: data?.timeline_notes ?? [],
          kvkk_approved: patient?.kvkk_approved ?? false,
          kvkk_approved_at: patient?.kvkk_approved_at ?? null,
        });

        hasLoadedRef.current = true;
      } catch (err) {
        console.error("Hasta profili yüklenirken beklenmeyen hata:", err);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [selectedPatient, patient, history]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      const payload = {
        patient_name: selectedPatient,
        phone: profile.phone || null,
        diagnosis: profile.diagnosis || null,
        notes: profile.notes || null,
        timeline_notes: profile.timeline_notes || [],
      };

      const { error } = await supabase
        .from("patient_profiles")
        .upsert(payload, { onConflict: "patient_name" });

      if (error) {
        console.error("Hasta profili kaydedilirken hata:", error);
        showToast("Hasta profili kaydedilemedi!", "error");
        return;
      }

      if (patient?.id) {
        const { error: kvkkError } = await supabase
          .from("patients")
          .update({
            kvkk_approved: profile.kvkk_approved,
            kvkk_approved_at: profile.kvkk_approved ? profile.kvkk_approved_at : null,
          })
          .eq("id", patient.id);

        if (kvkkError) {
          console.error("KVKK güncellenirken hata:", kvkkError);
          showToast("KVKK bilgisi güncellenemedi!", "error");
          return;
        }

        if (onPatientUpdated) {
          onPatientUpdated({
            id: patient.id,
            kvkk_approved: profile.kvkk_approved,
            kvkk_approved_at: profile.kvkk_approved_at,
          });
        }
      }

      showToast("Hasta profili kaydedildi.");
      onClose();
    } catch (err) {
      console.error("Hasta profili kaydedilirken beklenmeyen hata:", err);
      showToast("Profil kaydedilirken hata oluştu!", "error");
    } finally {
      setSaving(false);
    }
  };

  const riskLabel = (() => {
    if (!patient) return "Bilinmiyor";
    if (patient.highRiskFlag) return "Yüksek Risk";
    if (history.some((h) => h.type === "Yüksek Riskli Gebelik")) return "Yüksek Risk";
    if (history.length > 5) return "Orta Risk";
    return "Düşük Risk";
  })();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-pink-50 to-purple-50">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <History className="w-6 h-6 text-pink-600" />
              Hasta Profili &amp; Geçmişi
            </h3>
            <p className="text-gray-600 mt-1 font-medium">{selectedPatient}</p>
            <div className="mt-2">
              <RiskBadge history={history} patient={patient} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onDeletePatient && patient && (
              <button
                type="button"
                onClick={() => onDeletePatient(patient)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
              >
                Hastayı Sil
              </button>
            )}

            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* HASTA PROFİL KARTI */}
          <div className="bg-pink-50/60 border border-pink-100 rounded-xl p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-semibold text-lg">
                  {selectedPatient
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{selectedPatient}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Hasta temel bilgileri • Kişisel dosya
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-600">Klinik Risk:</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                        riskLabel === "Düşük Risk"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : riskLabel === "Orta Risk"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : riskLabel === "Yüksek Risk"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}
                    >
                      {riskLabel}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow"
              >
                {saving ? "Kaydediliyor..." : "Profili Kaydet"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formatPhone(profile.phone)}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))
                  }
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanı / Özet</label>
                <input
                  type="text"
                  value={profile.diagnosis}
                  onChange={(e) => setProfile((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                  placeholder="Örn: İnfertilite, 8. gebelik haftası, myom takibi..."
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Genel Klinik Öykü (Sürekli Bilgiler)
              </label>
              <textarea
                rows={2}
                value={profile.notes}
                onChange={(e) => setProfile((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent resize-none"
                placeholder="Alerjiler, kronik hastalıklar, geçmiş operasyonlar, gebelik süreci..."
              />
              {loadingProfile && (
                <div className="text-xs text-gray-400 mt-1">Profil yükleniyor...</div>
              )}
            </div>
          </div>

          {/* KVKK Onayı */}
          <div className="mt-4 flex items-start gap-3">
            <input
              id="kvkk-checkbox"
              type="checkbox"
              checked={!!profile.kvkk_approved}
              disabled={loadingProfile}
              onChange={(e) => {
                e.stopPropagation();
                const checked = e.target.checked;
                setProfile((prev) => ({
                  ...prev,
                  kvkk_approved: checked,
                  kvkk_approved_at: checked ? new Date().toISOString() : null,
                }));
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="mt-0.5 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />

            <label htmlFor="kvkk-checkbox" className="flex flex-col cursor-pointer flex-1">
              <span className="text-sm font-medium text-gray-700">
                KVKK Aydınlatma Metni ve Açık Rıza Formu Hastadan Alındı
              </span>

              {!profile.kvkk_approved && (
                <span className="text-[11px] text-gray-400 mt-0.5">Henüz KVKK formu alınmadı.</span>
              )}

              {profile.kvkk_approved && profile.kvkk_approved_at && (
                <span className="text-[11px] text-gray-500 mt-0.5">
                  Alınma tarihi:{" "}
                  {new Date(profile.kvkk_approved_at).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
            </label>
          </div>

          {/* Tarihli Klinik Notlar Bölümü */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <label className="text-base font-bold text-gray-800">📋 Tarihli Muayene Notları</label>
            </div>

            {/* Yeni Not Ekle */}
            <div className="mb-4 bg-white rounded-lg border-2 border-blue-300 p-4 shadow-sm">
              <label className="block text-xs font-semibold text-gray-700 mb-2">✏️ Yeni Not Ekle</label>

              <textarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                placeholder="Bugünkü muayene notunu buraya yazın..."
              />

              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-500">
                  📅{" "}
                  {new Date().toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                <button
                  onClick={() => {
                    if (!newNote.trim()) return;

                    const noteEntry = {
                      id: Date.now(),
                      date: new Date().toISOString(),
                      note: newNote.trim(),
                    };

                    setProfile((prev) => ({
                      ...prev,
                      timeline_notes: [noteEntry, ...(prev.timeline_notes || [])],
                    }));

                    setNewNote("");
                  }}
                  disabled={!newNote.trim()}
                  className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md transition-all"
                >
                  💾 Not Ekle
                </button>
              </div>
            </div>

            {/* Mevcut Notlar */}
            {profile.timeline_notes && profile.timeline_notes.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-gray-600 mb-2">
                  📚 Geçmiş Notlar ({profile.timeline_notes.length})
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {profile.timeline_notes.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white rounded-lg p-4 border-l-4 border-blue-400 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <div className="text-xs text-blue-700 font-semibold">
                              {new Date(entry.date).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <div className="text-sm text-gray-800 leading-relaxed">{entry.note}</div>
                        </div>

                        <button
                          onClick={() => {
                            setProfile((prev) => ({
                              ...prev,
                              timeline_notes: prev.timeline_notes.filter((n) => n.id !== entry.id),
                            }));
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                          title="Notu Sil"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Henüz tarihli not eklenmemiş</p>
                <p className="text-xs mt-1">İlk muayene notunu yukarıdan ekleyebilirsiniz</p>
              </div>
            )}
          </div>

          {/* RANDEVU GEÇMİŞİ LİSTESİ */}
          <div className="space-y-4">
            {history.map((apt) => (
              <div
                key={apt.id}
                className={`${getTypeColor(apt.type)} rounded-xl p-5 border-l-4 shadow-sm hover:shadow-md transition-all`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getTypeIcon(apt.type)}</span>
                    <div>
                      <div className="font-bold text-gray-800 text-lg">
                        {new Date(apt.date).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-gray-600 text-sm flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" />
                        {apt.time}
                      </div>
                    </div>
                  </div>
                  <div>
                    {apt.completed ? (
                      <span className="text-xs bg-green-500 text-white px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Tamamlandı
                      </span>
                    ) : new Date(apt.date) >= new Date() ? (
                      <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Yaklaşan
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="text-sm text-gray-700 flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{apt.type}</span>
                  <span className="text-gray-500">•</span>
                  <span>{apt.duration} dakika</span>
                </div>

                {apt.notes && (
                  <div className="text-sm text-gray-700 mt-3 bg-white bg-opacity-70 p-4 rounded-lg">
                    <div className="font-medium mb-1 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-pink-600" />
                      Notlar:
                    </div>
                    <div className="italic">{apt.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl font-bold text-pink-600">{history.length}</div>
              <div className="text-xs text-gray-600 mt-1">Toplam Randevu</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl font-bold text-green-600">
                {history.filter((a) => a.completed).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">Tamamlanan</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl font-bold text-blue-600">
                {history.filter((a) => !a.completed && new Date(a.date) >= new Date()).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">Yaklaşan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;// Component definitions follow below...