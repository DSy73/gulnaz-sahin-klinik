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
  const diff = day === 0 ? -6 : 1 - day; // Pazartesi başlangıç
  start.setDate(start.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    week.push(d);
  }
  return week;
};
// ---------------- PHONE MASK HELPER ----------------
const formatPhone = (value) => {
  if (!value) return "+90 ";

  // Rakamları temizle
  let digits = value.replace(/\D/g, "");

  // +90 yoksa ekle
  if (!digits.startsWith("90")) {
    digits = "90" + digits;
  }

  // En fazla 12 hane (90 + 10 digit)
  digits = digits.slice(0, 12);

  // Format: +90 532 336 82 04
  let formatted = "+";
  if (digits.length > 0) formatted += digits.slice(0, 2);
  if (digits.length > 2) formatted += " " + digits.slice(2, 5);
  if (digits.length > 5) formatted += " " + digits.slice(5, 8);
  if (digits.length > 8) formatted += " " + digits.slice(8, 10);
  if (digits.length > 10) formatted += " " + digits.slice(10, 12);

  return formatted;
};


// --------------------------- STATUS CONFIG -----------------------------

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
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

const appointmentTypes = [
  {
    value: "Kontrol",
    color: "bg-blue-50 border-blue-400 hover:bg-blue-100",
    duration: 30,
    icon: "🩺",
  },
  {
    value: "Ultrason",
    color: "bg-purple-50 border-purple-400 hover:bg-purple-100",
    duration: 45,
    icon: "📊",
  },
  {
    value: "İlk Muayene",
    color: "bg-green-50 border-green-400 hover:bg-green-100",
    duration: 45,
    icon: "🥼",
  },
  {
    value: "Acil",
    color: "bg-red-50 border-red-400 hover:bg-red-100",
    duration: 30,
    icon: "🚨",
  },
];

const getTypeColor = (type) =>
  appointmentTypes.find((t) => t.value === type)?.color ||
  "bg-gray-50 border-gray-400";

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
    const sorted = [...records].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const last = sorted[sorted.length - 1];
    const lastDate = new Date(last.date);
    const daysSinceLast =
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLast > 365) score += 40;
    else if (daysSinceLast > 180) score += 25;
    else if (daysSinceLast > 90) score += 10;

    const noShows = records.filter((a) => a.status === "no_show").length;
    score += noShows * 15;

    const completed = records.filter((a) => a.status === "completed").length;
    if (completed >= 5) score -= 10;
  }

  const hasOperation = records.some((a) =>
    a.type?.toLowerCase().includes("operasyon")
  );
  if (hasOperation) score += 15;

  const flaggedNotes = records.some((a) =>
    a.notes?.toLowerCase().includes("yüksek risk")
  );
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
  if (level === "Yüksek") {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (level === "Orta") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

function RiskBadge({ history, patient }) {
  const { score, level } = calculateRiskFromHistory(history || [], patient);
  const badgeClass = getRiskBadgeClasses(level);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${badgeClass}`}
    >
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
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    notes: "",
    kvkk_approved: false,
  });
  const [patientFormLoading, setPatientFormLoading] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientHistory, setShowPatientHistory] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

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
    return appointments.filter(
      (apt) => getDateString(apt.date) === dateStr
    );
  };

  // ----------------------- STATS -----------------------

  const stats = useMemo(() => {
    const todayCount = getTodayAppointments(currentDate).length;

    const weekCount = appointments.filter((apt) =>
      weekDates.some(
        (d) => getDateString(d) === getDateString(apt.date)
      )
    ).length;

    return {
      today: todayCount,
      week: weekCount,
    };
  }, [appointments, currentDate, weekDates]);
  
  // const matchingPatients = React.useMemo(
  // () =>
  //    newAppointment.patientName
  //       ? patients.filter((p) =>
  //           p.name
  //             ?.toLowerCase()
  //             .includes(newAppointment.patientName.toLowerCase())
  //         )
  //       : [],
  //   [newAppointment.patientName, patients]
  // );

  // ----------------------- PATIENT HELPERS -----------------------

  const getPatientHistory = (patientName) =>
    appointments
      .filter((apt) => apt.patient_name === patientName)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  const patientsWithStats = useMemo(() => {
    const today = new Date();
    return patients
      .map((p) => {
        const history = appointments.filter(
          (apt) => apt.patient_name === p.name
        );
        const lastVisit = history.length
          ? history
              .map((apt) => apt.date)
              .sort((a, b) => new Date(b) - new Date(a))[0]
          : null;

        const upcomingAppointments = history.filter(
          (apt) => !apt.completed && new Date(apt.date) >= today
        ).length;

        return {
          ...p,
          lastVisit,
          totalVisits: history.length,
          upcomingAppointments,
        };
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
    // Handle both object format { date, time, duration } and legacy (time, date) format
    let slot;
    if (typeof slotOrTime === 'object' && slotOrTime !== null) {
      // New format: object with date, time, duration
      slot = slotOrTime;
    } else {
      // Legacy format: (time, date) as separate parameters
      slot = { time: slotOrTime, date };
    }

    if (slot.time && slot.date && !isSlotAvailable(slot.time, slot.date)) {
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
        .update({
          status,
          completed: status === "completed",
        })
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
    // 1) Validasyon: hasta randevusunda hasta adı zorunlu
    if (form.isPatientAppointment) {
      if (!form.patientName) {
        showToast("Hasta adı zorunlu.", "error");
        return;
      }
    } else {
      // Hasta randevusu DEĞİLSE en azından bir başlık olsun
      if (!form.title) {
        showToast("Lütfen randevu için bir ad girin.", "error");
        return;
      }
    }
  
    // 2) Tarih & saat
    const appointmentDate =
      form.date ||
      (selectedSlot?.date
        ? getDateString(selectedSlot.date)
        : getDateString(new Date()));
  
    const appointmentTime =
      form.time ||
      (selectedSlot?.time ? normalizeTime(selectedSlot.time) : "09:00");
  
    // 3) Aynı anda başka randevu var mı?
    if (!isSlotAvailable(appointmentTime, appointmentDate)) {
      showToast("Bu tarih ve saatte zaten bir randevu var.", "error");
      return;
    }
  
    // 4) Ekranda görünecek isim:
    //    - Hasta randevusu ise: hasta adı
    //    - Değilse: randevu başlığı (TV programı vb.)
    const displayName = form.isPatientAppointment
      ? form.patientName.trim()
      : (form.title?.trim() || null);
  
    try {
      const appointmentData = {
        date: appointmentDate,                       // YYYY-MM-DD
        time: normalizeTime(appointmentTime),
        patient_name: displayName,                  // kartta görünen isim
        phone: form.isPatientAppointment ? (form.phone || null) : null,
        type: form.type || "Kontrol",
        duration: form.duration || 60,
        notes: form.notes || null,
        completed: false,
        status: "planned",
      };
  
      const { data, error } = await supabase
        .from("appointments")
        .insert([appointmentData])
        .select()
        .single();
  
      if (error) {
        console.error("Supabase error details:", error);
        console.error("Appointment data being sent:", appointmentData);
        throw error;
      }
  
      const insertedAppointment = data;
  
      // 5) Sadece HASTA RANDEVUSUNDA hasta tablosuna ekle
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
      }
      setAppointments((prev) => [...prev, insertedAppointment]);
      setShowAddModal(false);
      setSelectedSlot(null);
      showToast("Randevu başarıyla kaydedildi.");
      // 6) Eğer randevuda not varsa, hasta profiline tarihli not olarak ekle
      if (form.notes && form.notes.trim()) {
        try {
          // Önce mevcut profili çek
          const { data: existingProfile } = await supabase
            .from("patient_profiles")
            .select("timeline_notes")
            .eq("patient_name", trimmedName)
            .maybeSingle();

          const currentNotes = existingProfile?.timeline_notes || [];
          
          // Yeni notu ekle
          const newNoteEntry = {
            id: Date.now(),
            date: new Date().toISOString(),
            note: `${form.type} randevusu: ${form.notes.trim()}`,
          };

          const updatedNotes = [newNoteEntry, ...currentNotes];

          // Profili güncelle veya oluştur
          await supabase
            .from("patient_profiles")
            .upsert(
              {
                patient_name: trimmedName,
                timeline_notes: updatedNotes,
              },
              { onConflict: "patient_name" }
            );
        } catch (noteError) {
          console.error("Tarihli not eklenirken hata:", noteError);
          // Not eklenemese bile randevu oluşturulmuş olur
        }
      }
    
    } catch (error) {
      console.error("Randevu eklenirken hata:", error);
      const errorMessage = error?.message || error?.details || "Bilinmeyen hata";
      showToast(`Randevu eklenemedi: ${errorMessage}`, "error");
    }
    
  };
  
  

  // 🔹 Hasta + ilgili kayıtları sil
  const handleDeletePatient = async (patient) => {
    if (!patient) return;

    const confirmed = window.confirm(
      `"${patient.name}" adlı hastayı ve ona ait randevuları silmek istediğinize emin misiniz?`
    );
    if (!confirmed) return;

    try {
      // 1) Hasta profilini sil (varsa)
      await supabase
        .from('patient_profiles')
        .delete()
        .eq('patient_name', patient.name);

      // 2) Randevuları sil (isim üzerinden)
      await supabase
        .from('appointments')
        .delete()
        .eq('patient_name', patient.name);

      // 3) Hastayı sil
      if (patient.id) {
        await supabase
          .from('patients')
          .delete()
          .eq('id', patient.id);
      } else {
        await supabase
          .from('patients')
          .delete()
          .eq('name', patient.name);
      }

      // 4) React state’lerini güncelle
      setPatients((prev) => prev.filter((p) => p.name !== patient.name));
      setAppointments((prev) =>
        prev.filter((a) => a.patient_name !== patient.name)
      );

      // 5) Eğer hasta profili açıksa kapat
      if (selectedPatient === patient.name) {
        setSelectedPatient(null);
        setShowPatientHistory(false);
      }

      setToast({
        show: true,
        message: 'Hasta ve randevuları silindi.',
        type: 'success',
      });
      setTimeout(() => setToast((t) => ({ ...t, show: false })), 2500);
    } catch (err) {
      console.error('Hasta silinirken hata:', err);
      alert('Hasta silinemedi: ' + err.message);
    }
  };
  const handleDeleteAppointment = async (appointmentId) => {
    const confirmed = window.confirm(
      'Bu randevuyu silmek istediğinize emin misiniz?'
    );
    if (!confirmed) return;
  
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);
  
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
  // ----------------------- PATIENT SAVE -----------------------

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
        kvkk_approved_at: patientForm.kvkk_approved
          ? new Date().toISOString()
          : null,
      };

      const { data, error } = await supabase
        .from("patients")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setPatients((prev) => [...prev, data]);
      setShowPatientForm(false);
      setPatientForm({
        name: "",
        phone: "",
        email: "",
        dateOfBirth: "",
        notes: "",
        kvkk_approved: false,
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
          <div className="text-2xl font-bold text-gray-800">
            Kontrol ediliyor...
          </div>
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

  const todaysAppointments = getTodayAppointments(currentDate);

  // ----------------------- RENDER -----------------------

  return (
    <>
      {/* ----------- TOAST ------------ */}
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
      /* ---------------- RESPONSIVE HEADER ---------------- */
      <div className="bg-[#fff5f7] border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Mobile Layout (< 768px) */}
          <div className="md:hidden space-y-3">
            {/* Logo + Başlık */}
            <div className="flex items-center gap-2">
              <img
                src={logoGulnaz}
                className="w-16 h-auto object-contain"
                alt="Doç. Dr. Gülnaz Şahin"
              />
              <div className="flex-1">
                <div className="text-base font-semibold text-[#b46b7a] leading-tight">
                  Doç. Dr. Gülnaz Şahin
                </div>
                <div className="text-[9px] tracking-wide text-[#c697a3] uppercase">
                  Kadın Hastalıkları • Doğum • İnfertilite
                </div>
              </div>
            </div>

            {/* Rol + Çıkış */}
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

            {/* İstatistik Kutuları */}
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

          {/* Desktop Layout (>= 768px) */}
          <div className="hidden md:flex items-center justify-between h-[120px]">
            {/* Sol Taraf: Logo + Ünvan */}
            <div className="flex items-center gap-3">
              <img
                src={logoGulnaz}
                className="w-[105px] h-auto object-contain"
                alt="Doç. Dr. Gülnaz Şahin"
              />

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

            {/* Sağ Taraf: Başlık + İstatistikler */}
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
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setView("day")}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                    view === "day"
                      ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Günlük
                </button>
                <button
                  onClick={() => setView("week")}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                    view === "week"
                      ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Haftalık
                </button>
                <button
                  onClick={() => setView("patients")}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                    view === "patients"
                      ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Hastalar
                </button>
              </div>

              {view !== "patients" && (
                <>
                  <div className="flex items-center gap-4 mt-0 -mb-1">
                    <button
                      onClick={() => changeDate(view === "day" ? -1 : -7)}
                      className="p-2.5 hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center min-w-[300px]">
                      <div className="font-bold text-gray-800 text-lg">
                        {view === "day"
                          ? formatDate(currentDate)
                          : (() => {
                              const start = weekDates[0];
                              const end = weekDates[weekDates.length - 1];
                              const options = {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              };
                              return (
                                start.toLocaleDateString("tr-TR", options) +
                                " - " +
                                end.toLocaleDateString("tr-TR", options)
                              );
                            })()}
                      </div>
                    </div>
                    <button
                      onClick={() => changeDate(view === "day" ? 1 : 7)}
                      className="p-2.5 hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium shadow-lg transition-all"
                  >
                    Bugün
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ---------------- MAIN VIEWS ---------------- */}
          {view === "day" && (
            <DayView
              workingHours={workingHours}
              appointments={todaysAppointments}
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
              currentDate={currentDate}
              appointments={appointments}
              openAddModal={openAddModal}
              getTypeIcon={getTypeIcon}
              onDeleteAppointment={handleDeleteAppointment}
            />
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
            />
          )}
        </div>

       {/* ---------------- ADD PATIENT MODAL ---------------- */}
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
                {/* Ad Soyad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    value={patientForm.name}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Örn: Ayşe Yılmaz"
                  />
                </div>

                {/* Telefon (maskeli) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formatPhone(patientForm.phone || "")}
                    onChange={(e) =>
                      setPatientForm((prev) => ({
                        ...prev,
                        phone: formatPhone(e.target.value),
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="+90 5xx xxx xx xx"
                  />
                </div>

                {/* E-posta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={patientForm.email}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="ornek@mail.com"
                  />
                </div>

                {/* Doğum Tarihi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doğum Tarihi
                  </label>
                  <input
                    type="date"
                    value={patientForm.dateOfBirth}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        dateOfBirth: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                {/* Notlar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notlar
                  </label>
                  <textarea
                    value={patientForm.notes}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, notes: e.target.value })
                    }
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Genel sağlık bilgileri, önemli notlar..."
                  />
                </div>

                {/* KVKK */}
                <div className="pt-2">
                  <label className="inline-flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={patientForm.kvkk_approved}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          kvkk_approved: e.target.checked,
                        })
                      }
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <span>
                      Hastaya{" "}
                      <span className="font-semibold">KVKK Aydınlatma Metni</span>{" "}
                      sözlü/yazılı olarak iletilmiştir.
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

        {/* ---------------- ADD APPOINTMENT MODAL ---------------- */}
        {showAddModal && (
          <AddAppointmentModal
            selectedSlot={selectedSlot}
            onClose={closeAddModal}
            onSave={handleSaveAppointment}
            patients={patients}   // mevcut hasta listesi
          />
        )}

        {/* ---------------- PATIENT HISTORY MODAL ---------------- */}
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
                    ? {
                        ...p,
                        kvkk_approved: updated.kvkk_approved,
                        kvkk_approved_at: updated.kvkk_approved_at,
                      }
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

// =========================== DAY VIEW (OUTLOOK, 1 SAAT SLOT) =========================== //

function DayView({
  workingHours,          // artık kullanılmıyor ama imzada kalsın
  appointments,
  currentDate,
  openAddModal,
  getTypeIcon,
  handleUpdateStatus,    // şimdilik kullanılmıyor
  openPatientHistory,    // şimdilik kullanılmıyor
  onDeleteAppointment,
}) {
  const date = currentDate ? new Date(currentDate) : new Date();
  const dateKey = date.toISOString().slice(0, 10);

  // 07:00–23:00 arası 1 saatlik grid
  const timeSlots = [];
  for (let h = 7; h < 23; h++) {
    timeSlots.push(`${String(h).padStart(2, "0")}:00`);
  }

  const dayAppointments = (appointments || []).filter(
    (apt) => apt.date === dateKey
  );

  const handleEmptyClick = (time) => {
    if (!openAddModal) return;

    openAddModal({
      date,         // Date objesi
      time,         // "11:00"
      duration: 60, // varsayılan 1 saat (modalda değişebilir)
    });
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

  const dayLabel = date.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full">
      {/* HEADER */}
      <div className="p-2 sm:p-3 border-t-2 border-t-gray-200 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-pink-600" />
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800">
              Günlük Takvim
            </h3>
            <div className="text-xs sm:text-sm text-gray-600">
              {dayLabel}
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-auto text-xs sm:text-sm">
        {/* Saat sütunu */}
        <div className="w-16 border-r border-t-2 border-gray-100 bg-gray-50">
          {timeSlots.map((slot) => (
            <div
              key={slot}
              className="h-10 border-b border-gray-100 px-1 pt-[2px] text-[10px] sm:text-xs text-gray-500 text-right"
            >
              {slot}
            </div>
          ))}
        </div>

        {/* Gün kolonu */}
        <div className="flex-1 relative border-t-2 border-gray-100">
          {/* Grid */}
          {timeSlots.map((slot) => (
            <div
              key={slot}
              className="h-10 border-b border-gray-100 cursor-pointer hover:bg-green-50 transition-colors"
              onClick={() => handleEmptyClick(slot)}
            />
          ))}

          {/* Randevular */}
          {dayAppointments.map((apt) => {
            const minutesFromStart =
              timeStringToMinutes(apt.time || "07:00") - 7 * 60;
            const topPx =
              (minutesFromStart / 60) * SLOT_HEIGHT_PX;

            const duration = apt.duration || 60;
            const heightPx =
              Math.max(duration / 60, 0.5) * SLOT_HEIGHT_PX;

            return (
              <div
                key={apt.id}
                className="absolute left-1 right-1 sm:left-1.5 sm:right-1.5 rounded-md bg-green-300/90 hover:bg-green-400 text-[10px] sm:text-xs text-gray-800 shadow-md px-1.5 py-1 cursor-pointer overflow-hidden flex flex-col"
                style={{
                  top: topPx,
                  height: heightPx,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAppointmentClick(apt);
                }}
              >
                <div className="flex items-start justify-between gap-1 flex-1">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1">
                      {getTypeIcon ? (
                        <span className="shrink-0">
                          {getTypeIcon(apt.type)}
                        </span>
                      ) : null}
                      <span className="truncate">
                        {apt.patient_name || apt.patientName || "Randevu"}
                      </span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-gray-700 truncate">
                      {apt.time} • {apt.type}
                    </div>
                  </div>
                  {onDeleteAppointment && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
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

// *------------------------------- Day View --------------------------------*


// ------------------------------- Week View --------------------------------

// Yardımcı: haftanın başlangıcı (Pazartesi)
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0: Pazar, 1: Pazartesi...
  const diff = (day === 0 ? -6 : 1 - day); // Pazartesiye çek
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Yardımcı: günleri üret (7 gün)
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

// Yardımcı: 07:00–23:00 arası 30 dk'lık slotlar
function getTimeSlots() {
  const slots = [];
  const startMinutes = 7 * 60;   // 07:00
  const endMinutes = 23 * 60;    // 23:00
  for (let m = startMinutes; m < endMinutes; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(
      `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
    );
  }
  return slots;
}

// "2025-12-16" ile Date'i karşılaştırmak için
function formatDateKey(d) {
  return d.toISOString().slice(0, 10);
}

// "HH:MM" -> dakika
function timeStringToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// =========================== WEEK VIEW (OUTLOOK, 1 SAAT SLOT) =========================== //

// "HH:MM" -> dakika
function weekViewTimeStringToMinutes(t) {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + m;
}

// WeekView component'ini bulun ve şöyle güncelleyin:

function WeekView({
  currentDate,
  appointments,
  openAddModal,
  openEditModal,
  getTypeIcon,
  onDeleteAppointment,
}) {
  const weekDays = getWeekDays(currentDate || new Date());

  // 07:00–23:00 arası 1 saatlik grid
  const timeSlots = [];
  for (let h = 7; h < 23; h++) {
    timeSlots.push(`${String(h).padStart(2, "0")}:00`);
  }

  const handleEmptyCellClick = (dayDate, time) => {
    if (!openAddModal) return;

    openAddModal({
      date: dayDate,
      time,
      duration: 60,
    });
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

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full">
      {/* HEADER */}
      <div className="flex border-t-2 border-t-gray-200 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="w-16 border-r px-8 py-6 text-sm font-semibold text-gray-700">
          Saat
        </div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="flex-1 border-r px-2 py-3 text-center text-xs sm:text-sm font-semibold text-gray-700"
          >
            <div>
              {day.toLocaleDateString("tr-TR", {
                weekday: "short",
              })}
            </div>
            <div className="text-gray-500">
              {day.toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </div>
          </div>
        ))}
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-auto text-xs sm:text-sm">
        {/* Saat sütunu */}
        <div className="w-16 border-r border-t-2 border-gray-100 bg-gray-50">
          {timeSlots.map((slot) => (
            <div
              key={slot}
              className="h-10 border-b border-gray-100 px-1 pt-[2px] text-[10px] sm:text-xs text-gray-500 text-right"
            >
              {slot}
            </div>
          ))}
        </div>

        {/* Gün sütunları */}
        {weekDays.map((day) => {
          const dayKey = formatDateKey(day);

          console.log('📅 WeekView Day:', dayKey); // DEBUG

            const dayAppointments = (appointments || []).filter((apt) => {
            const aptDate = formatDateKey(apt.date);
            console.log('🔍 Comparing:', aptDate, '===', dayKey, '?', aptDate === dayKey); // DEBUG
            return aptDate === dayKey;
          });

          console.log('📋 Day Appointments for', dayKey, ':', dayAppointments.length); // DEBUG

          return (
            <div
              key={day.toISOString()}
              className="flex-1 border-r border-t-2 border-gray-100 relative"
            >
              {/* Grid */}
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  className="h-10 border-b border-gray-100 cursor-pointer hover:bg-green-50 transition-colors"
                  onClick={() => handleEmptyCellClick(day, slot)}
                />
              ))}

              {/* Randevular */}
              {dayAppointments.map((apt) => {
                const minutesFromStart =
                  weekViewTimeStringToMinutes(apt.time || "07:00") - 7 * 60;

                const topPx = (minutesFromStart / 60) * SLOT_HEIGHT_PX;

                const duration = apt.duration || 60;
                const heightPx = Math.max(duration / 60, 0.5) * SLOT_HEIGHT_PX;

                return (
                  <div
                    key={apt.id}
                    className="absolute left-1 right-1 sm:left-1.5 sm:right-1.5 rounded-md bg-green-300/90 hover:bg-green-400 text-[10px] sm:text-xs text-gray-800 shadow-md px-1.5 py-1 cursor-pointer overflow-hidden flex flex-col"
                    style={{
                      top: topPx,
                      height: heightPx,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAppointmentClick(apt);
                    }}
                  >
                    <div className="flex items-start justify-between gap-1 flex-1">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate flex items-center gap-1">
                          {getTypeIcon ? (
                            <span className="shrink-0">
                              {getTypeIcon(apt.type)}
                            </span>
                          ) : null}
                          <span className="truncate">
                            {apt.patient_name || apt.patientName || "Randevu"}
                          </span>
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-gray-700 truncate">
                          {apt.time} • {apt.type}
                        </div>
                      </div>
                      {onDeleteAppointment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                "Bu randevuyu silmek istediğinize emin misiniz?"
                              )
                            ) {
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
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- Week View -------------------------------- */
// ----------------------------- Patients View -----------------------------
function PatientsView({
  patients,
  appointments,
  getPatientHistory,
  openPatientHistory,
  onAddPatient,
  onDeletePatient,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg">
      {/* HEADER */}
      <div className="p-6 border-t-2 border-t-gray-200 border-b bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-600" />
            Tüm Hastalar
          </h3>
          <div className="mt-1 space-y-2">
            <p className="text-sm text-gray-600">
              Toplam {patients.length} hasta
            </p>
            {/* ✅ SADECE HASTA VARSA GÖSTER */}
            {patients.length > 0 && (
              <div className="mt-2">
                <RiskBadge history={appointments} />
              </div>
            )}
          </div>
        </div>
          <button
            onClick={onAddPatient}
            className="px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 flex items-center gap-2 shadow"
          >
            <Plus className="w-4 h-4" />
            Yeni Hasta
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="p-6">
        {patients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Henüz hasta kaydı yok</p>
            <p className="text-sm mt-2">
              Sağ üstten &quot;Yeni Hasta&quot; ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {patients.map((patient) => {
              const patientHistory = getPatientHistory
                ? getPatientHistory(patient.name)
                : [];

              return (
                <div
                  key={patient.id ?? patient.name}
                  className="relative"
                >
                  {/* 🗑 HASTAYI SİL BUTONU */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // karta tıklamayı tetiklemesin
                        onDeletePatient(patient);
                      }}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      Hastayı Sil
                    </button>
                  </div>

                  {/* HASTA KARTI */}
                  <button
                    onClick={() => openPatientHistory(patient.name)}
                    className="w-full bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 rounded-xl p-6 hover:shadow-lg transition-all text-left border-2 border-transparent hover:border-pink-300 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-3 rounded-xl">
                            <User className="w-6 h-6 text-white" />
                          </div>

                          <div>
                            <div className="font-bold text-gray-800 text-xl group-hover:text-pink-600 transition-colors">
                              {patient.name}
                            </div>

                            {patient.phone && (
                              <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                <Phone className="w-3 h-3" />
                                {patient.phone}
                              </div>
                            )}

                            <div className="mt-2 space-y-2">
                              {/* Kişiye özel risk etiketi */}
                              <RiskBadge
                                history={patientHistory}
                                patient={patient}
                              />

                              {/* KVKK Etiketi */}
                              {patient.kvkk_approved ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  KVKK Formu: Var
                                  {patient.kvkk_approved_at  && (
                                    <span className="ml-2 text-[10px] opacity-70">
                                      (
                                      {new Date(
                                        patient.kvkk_approved_at
                                      ).toLocaleDateString('tr-TR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                      )
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  KVKK Formu: Eksik
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {patient.lastVisit && (
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Son ziyaret:{' '}
                            {new Date(
                              patient.lastVisit
                            ).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </div>
                        )}
                      </div>

                      {/* Sayaç kutuları */}
                      <div className="flex gap-3">
                        <div className="text-center bg-white rounded-xl px-4 py-3 border-2 border-pink-200 shadow-sm">
                          <div className="text-2xl font-bold text-pink-600">
                            {patient.totalVisits}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Ziyaret
                          </div>
                        </div>

                        {patient.upcomingAppointments > 0 && (
                          <div className="text-center bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl px-4 py-3 shadow-lg">
                            <div className="text-2xl font-bold">
                              {patient.upcomingAppointments}
                            </div>
                            <div className="text-xs mt-1">Yaklaşan</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
/* ----------------------------- Patients View ----------------------------- */

// =========================== ADD APPOINTMENT MODAL =========================== //

function AddAppointmentModal({ selectedSlot, onClose, onSave, patients = [] }) {
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

  const defaultDate =
    selectedSlot?.date ? new Date(selectedSlot.date) : new Date();

  const defaultStartTime =
    selectedSlot?.time && typeof selectedSlot.time === "string"
      ? selectedSlot.time
      : "09:00";

  const defaultEndTime = (() => {
    const base =
      timeToMinutes(defaultStartTime) + (selectedSlot?.duration || 60);
    return minutesToTime(base);
  })();

  const [startTime, setStartTime] = React.useState(defaultStartTime);
  const [endTime, setEndTime] = React.useState(defaultEndTime);

  const [form, setForm] = React.useState({
    title: selectedSlot?.title || "",
    isPatientAppointment:
      selectedSlot?.isPatientAppointment ?? true,
    patientName: selectedSlot?.patientName || "",
    phone: selectedSlot?.phone || "",
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

    const matches = patients.filter((p) =>
      p.name?.toLowerCase().includes(query)
    );

    setMatchingPatients(matches);
    setShowSuggestions(matches.length > 0);
  }, [form.patientName, form.isPatientAppointment, patients]);

  const handleChangeType = (value) => {
    setForm((prev) => ({
      ...prev,
      type: value,
    }));
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
      patientName: form.isPatientAppointment ? form.patientName : null,
      phone: form.isPatientAppointment ? form.phone : null,
      date: defaultDate.toISOString().slice(0, 10),
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
          <h2 className="text-lg font-bold text-gray-800">Yeni Randevu</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
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
            <div className="text-sm text-gray-700 mb-2">{dateLabel}</div>

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
                    <option key={t} value={t}>
                      {t}
                    </option>
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
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Randevu Adı */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Randevu Adı</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          {/* Hasta randevusu checkbox */}
          <div className="flex items-center gap-2 mt-2">
            <input
              id="isPatient"
              type="checkbox"
              checked={form.isPatientAppointment}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  isPatientAppointment: e.target.checked,
                }))
              }
            />
            <label
              htmlFor="isPatient"
              className="text-xs text-gray-600 select-none"
            >
              Bu bir hasta randevusu
            </label>
          </div>

          {/* Hasta bilgileri */}
          {form.isPatientAppointment && (
            <>
              <div className="space-y-1 relative">
                <label className="text-xs text-gray-500">Hasta Adı</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  value={form.patientName || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      patientName: e.target.value,
                    }))
                  }
                  onFocus={() => {
                    if (matchingPatients.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                />

                {showSuggestions &&
                  matchingPatients &&
                  matchingPatients.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {matchingPatients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              patientName: p.name,
                              phone: p.phone || "",
                            }));
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-pink-50 flex flex-col"
                        >
                          <span className="font-medium text-gray-800">
                            {p.name}
                          </span>
                          {p.phone && (
                            <span className="text-xs text-gray-500">
                              {p.phone}
                            </span>
                          )}
                        </button>
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
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        phone: formatPhone(e.target.value),
                      }))
                    }
                  />
              </div>
            </>
          )}

          {/* Tür */}
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

          {/* Notlar */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Notlar</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
              rows={3}
              value={form.notes || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
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
            Randevuyu Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- ADD APPOINTMENT MODAL ----------------------------- */

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
    // Reset the loaded flag when selectedPatient changes
    hasLoadedRef.current = false;
  }, [selectedPatient]);

  useEffect(() => {
    // Only load once per selectedPatient to prevent overwriting user changes
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
  
        const lastPhone =
          history && history.length > 0 ? history[0].phone || "" : "";
  
        // Use patient prop for initial kvkk_approved value
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
            kvkk_approved_at: profile.kvkk_approved
              ? profile.kvkk_approved_at
              : null,
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
      onClose(); // ✅ Kaydedince modalı kapat
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
    if (history.some((h) => h.type === "Yüksek Riskli Gebelik"))
      return "Yüksek Risk";
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
            <p className="text-gray-600 mt-1 font-medium">
              {selectedPatient}
            </p>
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

            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-xl transition-all"
            >
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
                  <div className="font-semibold text-gray-800">
                    {selectedPatient}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Hasta temel bilgileri • Kişisel dosya
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-600">
                      Klinik Risk:
                    </span>
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
              {/* Telefon */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formatPhone(profile.phone)}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      phone: formatPhone(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                />

              </div>

              {/* Tanı / Özet */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tanı / Özet
                </label>
                <input
                  type="text"
                  value={profile.diagnosis}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      diagnosis: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                  placeholder="Örn: İnfertilite, 8. gebelik haftası, myom takibi..."
                />
              </div>
            </div>

            {/* Uzun not alanı */}
            <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
                Genel Klinik Öykü (Sürekli Bilgiler)
            </label>
              <textarea
                rows={2}
                value={profile.notes}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent resize-none"
                placeholder="Alerjiler, kronik hastalıklar, geçmiş operasyonlar, gebelik süreci..."
              />
              {loadingProfile && (
                <div className="text-xs text-gray-400 mt-1">
                  Profil yükleniyor...
                </div>
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
                console.log("Checkbox değişti:", checked);

                setProfile((prev) => ({
                  ...prev,
                  kvkk_approved: checked,
                  // İşaretlenirse BUGÜNÜ yaz, kaldırılırsa tamamen sıfırla
                  kvkk_approved_at: checked ? new Date().toISOString() : null,
                }));
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="mt-0.5 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />

            <label 
              htmlFor="kvkk-checkbox"
              className="flex flex-col cursor-pointer flex-1"
            >
              <span className="text-sm font-medium text-gray-700">
                KVKK Aydınlatma Metni ve Açık Rıza Formu Hastadan Alındı
              </span>

              {!profile.kvkk_approved && (
                <span className="text-[11px] text-gray-400 mt-0.5">
                  Henüz KVKK formu alınmadı.
                </span>
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
          {/* 📌 Tarihli Klinik Notlar Bölümü */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <label className="text-base font-bold text-gray-800">
                📋 Tarihli Muayene Notları
              </label>
            </div>

            {/* Yeni Not Ekle */}
            <div className="mb-4 bg-white rounded-lg border-2 border-blue-300 p-4 shadow-sm">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                ✏️ Yeni Not Ekle
              </label>

              <textarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                placeholder="Bugünkü muayene notunu buraya yazın..."
              />

              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-500">
                  📅 {new Date().toLocaleDateString("tr-TR", {
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
                      timeline_notes: [
                        noteEntry,
                        ...(prev.timeline_notes || []),
                      ],
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
                          <div className="text-sm text-gray-800 leading-relaxed">
                            {entry.note}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setProfile((prev) => ({
                              ...prev,
                              timeline_notes: prev.timeline_notes.filter(
                                (n) => n.id !== entry.id
                              ),
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
                className={`${getTypeColor(
                  apt.type
                )} rounded-xl p-5 border-l-4 shadow-sm hover:shadow-md transition-all`}
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

        {/* FOOTER – küçük özet kutuları */}
        <div className="p-6 border-t bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl font-bold text-pink-600">
                {history.length}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Toplam Randevu
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl font-bold text-green-600">
                {history.filter((a) => a.completed).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">Tamamlanan</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl font-bold text-blue-600">
                {
                  history.filter(
                    (a) => !a.completed && new Date(a.date) >= new Date()
                  ).length
                }
              </div>
              <div className="text-xs text-gray-600 mt-1">Yaklaşan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
