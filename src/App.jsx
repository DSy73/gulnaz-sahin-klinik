import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
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
} from 'lucide-react';
import logoGulnaz from './assets/GS-KD-Logo.png';

/* -------------------------------- Helpers -------------------------------- */

// Tarihi her yerde aynı formata çevir: "YYYY-MM-DD"
const getDateString = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Saati normalize et: "09:00:00" -> "09:00"
const normalizeTime = (t) => {
  if (!t) return '';
  const parts = t.toString().split(':');
  const h = parts[0] || '00';
  const m = parts[1] || '00';
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
};

/* --------------------------- Status Config & Risk -------------------------- */

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Beklemede' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'no_show', label: 'Gelmedi' },
  { value: 'cancelled', label: 'İptal' },
];

const STATUS_CONFIG = {
  planned: {
    label: 'Beklemede',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    dotClass: 'bg-yellow-400',
  },
  completed: {
    label: 'Tamamlandı',
    badgeClass: 'bg-green-100 text-green-800',
    dotClass: 'bg-green-400',
  },
  no_show: {
    label: 'Gelmedi',
    badgeClass: 'bg-red-100 text-red-800',
    dotClass: 'bg-red-400',
  },
  cancelled: {
    label: 'İptal',
    badgeClass: 'bg-gray-100 text-gray-600',
    dotClass: 'bg-gray-400',
  },
};

const STATUS_LABELS = {
  planned: 'Beklemede',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
  cancelled: 'İptal',
};

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

    const noShows = records.filter((a) => a.status === 'no_show').length;
    score += noShows * 15;

    const completed = records.filter((a) => a.status === 'completed').length;
    if (completed >= 5) score -= 10;
  }

  const hasOperation = records.some((a) =>
    a.type?.toLowerCase().includes('operasyon')
  );
  if (hasOperation) score += 15;

  const flaggedNotes = records.some((a) =>
    a.notes?.toLowerCase().includes('yüksek risk')
  );
  if (flaggedNotes) score += 10;

  if (records.length >= 5) score += 5;

  if (patient?.age && patient.age >= 40) score += 5;

  score = Math.max(0, Math.min(100, score));

  let level;
  if (score >= 70) level = 'Yüksek';
  else if (score >= 40) level = 'Orta';
  else level = 'Düşük';

  return { score, level };
}

function getRiskBadgeClasses(level) {
  if (level === 'Yüksek') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (level === 'Orta') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

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

function getStatusColorClasses(status) {
  switch (status) {
    case 'completed':
      return 'bg-green-50 border-green-200';
    case 'no_show':
      return 'bg-red-50 border-red-200';
    case 'cancelled':
      return 'bg-gray-100 border-gray-300';
    case 'planned':
    default:
      return 'bg-yellow-50 border-yellow-200';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px] font-semibold';
    case 'no_show':
      return 'bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-semibold';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-semibold';
    case 'planned':
    default:
      return 'bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-[10px] font-semibold';
  }
}

/* ---------------------------- Main Component ------------------------------ */

export default function ClinicAppointmentSystem() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'doctor' veya 'assistant'
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('day');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);

  const [newAppointment, setNewAppointment] = useState({
    patientName: '',
    phone: '',
    type: 'Kontrol',
    duration: 30,
    notes: '',
  });

  const [patients, setPatients] = useState([]);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientFormLoading, setPatientFormLoading] = useState(false);
  const [patientForm, setPatientForm] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    notes: '',
  });

  const [suggestedSlot, setSuggestedSlot] = useState(null);

  const workingHours = [
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
  ];

  const appointmentTypes = [
    {
      value: 'Kontrol',
      color: 'bg-blue-50 border-blue-400 hover:bg-blue-100',
      duration: 30,
      icon: '🩺',
    },
    {
      value: 'Ultrason',
      color: 'bg-purple-50 border-purple-400 hover:bg-purple-100',
      duration: 45,
      icon: '📊',
    },
    {
      value: 'İlk Muayene',
      color: 'bg-green-50 border-green-400 hover:bg-green-100',
      duration: 45,
      icon: '🥼',
    },
    {
      value: 'Acil',
      color: 'bg-red-50 border-red-400 hover:bg-red-100',
      duration: 30,
      icon: '🚨',
    },
  ];

  // Kullanıcı rolünü kontrol et
  const checkUserRole = async (email) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single();

      if (error) {
        console.error('Rol kontrolü hatası:', error);
        setUserRole('assistant');
        return;
      }

      setUserRole(data?.role || 'assistant');
    } catch (error) {
      console.error('Rol kontrolü hatası:', error);
      setUserRole('assistant');
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Randevular yüklenirken hata:', error);
      alert('Randevular yüklenemedi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Hastalar yüklenirken hata:', error);
      alert('Hastalar yüklenemedi: ' + error.message);
    }
  };

  useEffect(() => {
    if (!user) return;

    (async () => {
      await Promise.all([fetchAppointments(), fetchPatients()]);
    })();
  }, [user]);

  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const getWeekDates = () => {
    const week = [];
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const getTodayAppointments = (date) => {
    const dateStr = getDateString(date);
    return appointments.filter((apt) => getDateString(apt.date) === dateStr);
  };

  const isSlotAvailable = (time, date) => {
    const dateStr = getDateString(date);
    return !appointments.some(
      (apt) =>
        getDateString(apt.date) === dateStr &&
        normalizeTime(apt.time) === normalizeTime(time)
    );
  };

  const suggestBestSlotForPatient = (patientName) => {
    if (!patientName) {
      setSuggestedSlot(null);
      return;
    }

    const history = appointments.filter(
      (apt) => apt.patient_name === patientName
    );

    const durations = history
      .map((h) => h.duration)
      .filter((d) => typeof d === 'number' && !Number.isNaN(d));

    const avgDuration = durations.length
      ? Math.round(
          durations.reduce((sum, d) => sum + d, 0) / durations.length
        )
      : 30;

    const targetDate = new Date();
    const dateStr = getDateString(targetDate);

    const todaysAppointments = appointments.filter(
      (apt) => getDateString(apt.date) === dateStr
    );

    const freeSlots = workingHours.filter(
      (time) =>
        !todaysAppointments.some(
          (apt) => normalizeTime(apt.time) === normalizeTime(time)
        )
    );

    if (freeSlots.length === 0) {
      setSuggestedSlot(null);
      return;
    }

    const morningCount = history.filter((h) => {
      if (!h.time) return false;
      const hour = parseInt(h.time.toString().split(':')[0] || '0', 10);
      return hour < 13;
    }).length;

    const preferMorning =
      history.length > 0 && morningCount > history.length / 2;

    let candidateSlots = freeSlots;
    if (preferMorning) {
      const morningSlots = freeSlots.filter((t) => {
        const hour = parseInt(t.split(':')[0] || '0', 10);
        return hour < 13;
      });
      if (morningSlots.length) {
        candidateSlots = morningSlots;
      }
    }

    const bestTime = candidateSlots[0];

    setSuggestedSlot({
      date: targetDate,
      dateStr,
      time: bestTime,
      duration: avgDuration,
    });
  };

  const updateAppointmentStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status,
          completed: status === 'completed',
        })
        .eq('id', id);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === id ? { ...apt, status, completed: status === 'completed' } : apt
        )
      );
    } catch (error) {
      console.error('Durum güncellenirken hata:', error);
      alert('Durum güncellenemedi: ' + error.message);
    }
  };

  const getStatusConfig = (status) =>
    STATUS_CONFIG[status] || STATUS_CONFIG.planned;

  const handleSavePatient = async () => {
    if (!patientForm.name) return;

    try {
      setPatientFormLoading(true);

      const payload = {
        name: patientForm.name,
        phone: patientForm.phone || null,
        email: patientForm.email || null,
        date_of_birth: patientForm.dateOfBirth || null,
        notes: patientForm.notes || null,
      };

      const { data, error } = await supabase
        .from('patients')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setPatients((prev) => [...prev, data]);
      setShowPatientForm(false);
      setPatientForm({
        name: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        notes: '',
      });
    } catch (error) {
      console.error('Hasta kaydedilirken hata:', error);
      alert('Hasta kaydedilemedi: ' + error.message);
    } finally {
      setPatientFormLoading(false);
    }
  };

  const handleSelectPatient = (patient) => {
    setNewAppointment((prev) => ({
      ...prev,
      patientName: patient.name,
      phone: patient.phone || prev.phone,
    }));
    suggestBestSlotForPatient(patient.name);
    setShowPatientSuggestions(false);
  };

  const handleAddAppointment = async () => {
    if (!newAppointment.patientName || !selectedSlot) return;

    if (!isSlotAvailable(selectedSlot.time, selectedSlot.date)) {
      alert('Bu tarih ve saatte zaten bir randevu var.');
      return;
    }

    try {
      const appointmentData = {
        date: getDateString(selectedSlot.date),
        time: normalizeTime(selectedSlot.time),
        patient_name: newAppointment.patientName,
        phone: newAppointment.phone,
        type: newAppointment.type,
        duration: newAppointment.duration,
        notes: newAppointment.notes,
        completed: false,
        status: 'planned',
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select();

      if (error) throw error;

      const insertedAppointment = data[0];

      const trimmedName = newAppointment.patientName.trim();
      const existingPatient = patients.find(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (!existingPatient) {
        try {
          const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .insert([
              {
                name: trimmedName,
                phone: newAppointment.phone || null,
                email: null,
                date_of_birth: null,
                notes: null,
              },
            ])
            .select();

          if (patientError) {
            console.error('Hasta oluşturulurken hata:', patientError);
            alert('Hasta kaydı oluşturulamadı: ' + patientError.message);
          } else if (patientData && patientData[0]) {
            setPatients((prev) => [...prev, patientData[0]]);
            console.log('✅ Yeni hasta oluşturuldu:', patientData[0]);
          }
        } catch (e) {
          console.error('Hasta kaydı oluşturulurken beklenmeyen hata:', e);
          alert('Hasta kaydı oluşturulamadı: ' + e.message);
        }
      }

      setAppointments((prev) => [...prev, insertedAppointment]);

      setShowAddModal(false);
      setNewAppointment({
        patientName: '',
        phone: '',
        type: 'Kontrol',
        duration: 30,
        notes: '',
      });
      setSelectedSlot(null);

      alert('Randevu başarıyla eklendi!');
    } catch (error) {
      console.error('Randevu eklenirken hata:', error);
      alert('Randevu eklenemedi: ' + error.message);
    }
  };

  const openAddModal = (time, date) => {
    if (!isSlotAvailable(time, date)) return;
    setSelectedSlot({ time, date });
    setSuggestedSlot(null);
    setShowAddModal(true);
  };

  const getTypeColor = (type) => {
    return (
      appointmentTypes.find((t) => t.value === type)?.color ||
      'bg-gray-50 border-gray-400'
    );
  };

  const getTypeIcon = (type) => {
    return appointmentTypes.find((t) => t.value === type)?.icon || '📋';
  };

  const openPatientHistory = (patientName) => {
    setSelectedPatient(patientName);
    setShowPatientHistory(true);
  };

  const getPatientHistory = (patientName) => {
    return appointments
      .filter((apt) => apt.patient_name === patientName)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getPatientsWithStats = () => {
    const today = new Date();

    const enriched = patients.map((p) => {
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
        id: p.id,
        name: p.name,
        phone: p.phone,
        email: p.email,
        lastVisit,
        totalVisits: history.length,
        upcomingAppointments,
      };
    });

    return enriched.sort((a, b) => {
      if (!a.lastVisit && !b.lastVisit) return a.name.localeCompare(b.name);
      if (!a.lastVisit) return 1;
      if (!b.lastVisit) return -1;
      return new Date(b.lastVisit) - new Date(a.lastVisit);
    });
  };

  const stats = {
    today: getTodayAppointments(currentDate).length || 0,
    week:
      appointments.filter((apt) => {
        const weekDates = getWeekDates();
        return weekDates.some((d) => getDateString(d) === apt.date);
      }).length || 0,
    totalPatients: patients.length,
    completed: appointments.filter((apt) => apt.status === 'completed').length || 0,
  };

  const matchingPatients = newAppointment.patientName
    ? patients.filter((p) =>
        p.name.toLowerCase().includes(newAppointment.patientName.toLowerCase())
      )
    : [];

  const selectedPatientData = React.useMemo(
    () => patients.find((p) => p.name === selectedPatient) || null,
    [patients, selectedPatient]
  );

  const todaysAppointments = getTodayAppointments(currentDate);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-transparent mb-4"></div>
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
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-transparent mb-4"></div>
          <div className="text-2xl font-bold text-gray-800">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* HEADER */}
      <div className="bg-[#fff5f7] border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between h-[120px]">
          
          {/* Sol taraf: Logo + Ünvan + Rol + Çıkış */}
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

              {/* Rol etiketi */}
              {userRole && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-[10px] px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full inline-block">
                    {userRole === "doctor" ? "👩‍⚕️ Doktor" : "👤 Asistan"}
                  </div>

                  {/* Çıkış Butonu — 2. resimdeki gibi kompakt */}
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
              )}
            </div>
          </div>

          {/* Sağ taraf: İstatistik kutuları */}
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

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white px-3 py-1.5 rounded-lg shadow text-center">
                <div className="text-[10px] opacity-90 leading-none">Tamamlanan</div>
                <div className="text-xl font-bold leading-none">{stats.completed}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Controls + Views */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setView('day')}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                  view === 'day'
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Günlük
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                  view === 'week'
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Haftalık
              </button>
              <button
                onClick={() => setView('patients')}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                  view === 'patients'
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Hastalar
              </button>
            </div>

            {view !== 'patients' && (
              <div className="flex items-center gap-4 mt-0 -mb-1">
                <button
                  onClick={() => changeDate(view === 'day' ? -1 : -7)}
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center min-w-[300px]">
                  <div className="font-bold text-gray-800 text-lg">
                    {view === 'day'
                      ? formatDate(currentDate)
                      : (() => {
                          const week = getWeekDates();
                          const start = week[0];
                          const end = week[week.length - 1];

                          const options = {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          };

                          return (
                            start.toLocaleDateString('tr-TR', options) +
                            ' - ' +
                            end.toLocaleDateString('tr-TR', options)
                          );
                        })()}
                  </div>
                </div>
                <button
                  onClick={() => changeDate(view === 'day' ? 1 : 7)}
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {view !== 'patients' && (
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium shadow-lg transition-all"
              >
                Bugün
              </button>
            )}

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
                setUserRole(null);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-medium shadow-lg transition-all"
            >
              Çıkış
            </button>
          </div>
        </div>

        {/* PART 3 BAŞLANGIÇ */}
        {view === 'day' ? (
          <DayView
            workingHours={workingHours}
            appointments={todaysAppointments}
            currentDate={currentDate}
            openAddModal={openAddModal}
            getTypeIcon={getTypeIcon}
            handleUpdateStatus={updateAppointmentStatus}
            openPatientHistory={openPatientHistory}
          />
        ) : view === 'week' ? (
          <WeekView
            weekDates={getWeekDates()}
            workingHours={workingHours}
            appointments={appointments}
            openAddModal={openAddModal}
            getTypeColor={getTypeColor}
            getDateString={getDateString}
            updateAppointmentStatus={updateAppointmentStatus}
            getStatusConfig={getStatusConfig}
            openPatientHistory={openPatientHistory}
            STATUS_OPTIONS={STATUS_OPTIONS}
          />
        ) : (
          <PatientsView
            patients={getPatientsWithStats()}
            appointments={appointments}
            getPatientHistory={getPatientHistory}
            openPatientHistory={openPatientHistory}
            onAddPatient={() => setShowPatientForm(true)}
          />
        )}
      </div>

      {/* Add Patient Modal */}
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

              {suggestedSlot && (
                <div className="mt-3 text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold mb-1">Akıllı öneri:</div>
                    <div>
                      {formatDate(suggestedSlot.date)} •{' '}
                      {normalizeTime(suggestedSlot.time)} (
                      {suggestedSlot.duration} dk)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlot({
                        date: suggestedSlot.date,
                        time: suggestedSlot.time,
                      });
                      setNewAppointment((prev) => ({
                        ...prev,
                        duration: suggestedSlot.duration,
                      }));
                    }}
                    className="ml-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Bu saati kullan
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={patientForm.phone}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="0532 xxx xx xx"
                />
              </div>

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
                disabled={!patientForm.name || patientFormLoading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl hover:from-pink-600 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed font-medium shadow-lg"
              >
                {patientFormLoading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-pink-50 to-purple-50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Plus className="w-6 h-6 text-pink-600" />
                Yeni Randevu
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSuggestedSlot(null);
                  setShowPatientSuggestions(false);
                }}
                className="p-2 hover:bg-white rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-600" />
                  Tarih &amp; Saat
                </label>
                <div className="text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  {selectedSlot && formatDate(selectedSlot.date)} -{' '}
                  {selectedSlot && normalizeTime(selectedSlot.time)}
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-pink-600" />
                  Hasta Adı Soyadı *
                </label>
                <input
                  type="text"
                  value={newAppointment.patientName}
                  onChange={(e) => {
                    setNewAppointment({
                      ...newAppointment,
                      patientName: e.target.value,
                    });
                    suggestBestSlotForPatient(e.target.value);
                    setShowPatientSuggestions(true);
                  }}
                  onFocus={() => {
                    if (
                      newAppointment.patientName &&
                      matchingPatients.length > 0
                    ) {
                      setShowPatientSuggestions(true);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="Örn: Ayşe Yılmaz"
                />
                {showPatientSuggestions &&
                  newAppointment.patientName &&
                  matchingPatients.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {matchingPatients.map((p) => (
                        <button
                          key={p.id ?? p.name}
                          type="button"
                          onClick={() => handleSelectPatient(p)}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-pink-600" />
                  Telefon
                </label>
                <input
                  type="tel"
                  value={newAppointment.phone}
                  onChange={(e) =>
                    setNewAppointment({
                      ...newAppointment,
                      phone: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="0532 xxx xx xx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-pink-600" />
                  Randevu Türü
                </label>
                <select
                  value={newAppointment.type}
                  onChange={(e) => {
                    const type = appointmentTypes.find(
                      (t) => t.value === e.target.value
                    );
                    setNewAppointment({
                      ...newAppointment,
                      type: e.target.value,
                      duration: type?.duration || 30,
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  {appointmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.value} ({type.duration} dk)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-pink-600" />
                  Notlar
                </label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) =>
                    setNewAppointment({
                      ...newAppointment,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  rows="3"
                  placeholder="Ek bilgiler..."
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium transition-all"
              >
                İptal
              </button>
              <button
                onClick={handleAddAppointment}
                disabled={!newAppointment.patientName}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl hover:from-pink-600 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed font-medium shadow-lg transition-all"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient History Modal */}
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
        />
      )}
    </div>
  );
}

/* ------------------------------- Day View -------------------------------- */

function DayView({
  workingHours,
  appointments,
  currentDate,
  openAddModal,
  getTypeIcon,
  handleUpdateStatus,
  openPatientHistory,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-pink-50 to-purple-50">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-pink-600" />
          Günlük Takvim
        </h3>
      </div>

      <div className="p-6">
        <div className="space-y-3">
          {workingHours.map((time) => {
            const appointment = appointments.find(
              (apt) => normalizeTime(apt.time) === normalizeTime(time)
            );
            const available = !appointment;

            return (
              <div key={time} className="flex gap-4 items-stretch">
                <div className="w-20 text-gray-600 font-semibold pt-4 text-center">
                  {time}
                </div>

                {available ? (
                  <button
                    onClick={() => openAddModal(time, currentDate)}
                    className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-pink-400 hover:bg-pink-50 transition-all text-gray-400 hover:text-pink-600 font-medium group"
                  >
                    <Plus className="w-5 h-5 inline mr-2 group-hover:scale-110 transition-transform" />
                    Randevu Ekle
                  </button>
                ) : (
                  <div
                    onClick={() =>
                      openPatientHistory(appointment.patient_name)
                    }
                    className={`flex-1 min-h-[80px]
                      rounded-2xl px-4 py-3
                      shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center justify-between gap-4
                      cursor-pointer text-left
                      ${getStatusColorClasses(appointment.status)}
                      ${
                        appointment.status === 'completed' ? 'opacity-80' : ''
                      }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-2xl opacity-80 flex-shrink-0">
                        {getTypeIcon(appointment.type)}
                      </span>

                      <div className="flex flex-col leading-tight truncate">
                        <span className="font-semibold text-gray-800 text-sm truncate">
                          {appointment.patient_name}
                        </span>

                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {appointment.type} • {appointment.duration} dk
                        </span>

                        {appointment.phone && (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {appointment.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={appointment.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(appointment.id, e.target.value);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                      >
                        <option value="planned">Beklemede</option>
                        <option value="completed">Tamamlandı</option>
                        <option value="no_show">Gelmedi</option>
                        <option value="cancelled">İptal</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Week View -------------------------------- */

function WeekView({
  weekDates,
  workingHours,
  appointments,
  openAddModal,
  getTypeColor,
  getDateString,
  updateAppointmentStatus,
  getStatusConfig,
  openPatientHistory,
  STATUS_OPTIONS,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-x-auto">
      <div className="p-6 border-b bg-gradient-to-r from-pink-50 to-purple-50">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-pink-600" />
          Haftalık Takvim
        </h3>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-8 gap-3 w-full">
          <div className="w-20" />
          {weekDates.map((date) => (
            <div
              key={date.toString()}
              className="text-center bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-3"
            >
              <div className="font-bold text-gray-800 text-lg">
                {date.toLocaleDateString('tr-TR', { weekday: 'short' })}
              </div>
              <div className="text-sm text-gray-600">
                {date.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
            </div>
          ))}

          {workingHours.map((time) => (
            <React.Fragment key={time}>
              <div className="w-20 text-gray-600 font-semibold pt-3 text-center">
                {time}
              </div>

              {weekDates.map((date) => {
                const dateStr = getDateString(date);
                const appointment = appointments.find(
                  (apt) =>
                    getDateString(apt.date) === dateStr &&
                    normalizeTime(apt.time) === normalizeTime(time)
                );
                const available = !appointment;

                return (
                  <div key={`${time}-${dateStr}`} className="w-full">
                    {available ? (
                      <button
                        onClick={() => openAddModal(time, date)}
                        className="w-full h-[90px] border-2 border-dashed border-gray-200 rounded-xl 
                           px-3 py-2 hover:border-pink-400 hover:bg-pink-50 transition-all 
                           text-xs text-gray-400 hover:text-pink-600
                           flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 mx-auto" />
                      </button>
                    ) : (
                      <div
                        onClick={() =>
                          openPatientHistory(appointment.patient_name)
                        }
                        className={`${getTypeColor(
                          appointment.type
                        )} w-full h-[90px] rounded-xl px-3 py-2 border-l-4 text-xs shadow-sm 
                           hover:shadow-md transition-all group flex flex-col justify-between 
                           cursor-pointer`}
                      >
                        <div className="font-bold text-gray-800 truncate mb-1">
                          {appointment.patient_name}
                        </div>

                        <div className="text-gray-600 truncate">
                          {appointment.type}
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={getStatusBadgeClass(
                              appointment.status
                            )}
                          >
                            {STATUS_OPTIONS.find(
                              (o) => o.value === appointment.status
                            )?.label || 'Beklemede'}
                          </span>

                          <select
                            value={appointment.status || 'planned'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateAppointmentStatus(
                                appointment.id,
                                e.target.value
                              );
                            }}
                            className="text-[10px] border border-gray-300 rounded-lg px-1.5 py-0.5 
                               bg-white text-gray-600 hover:border-pink-400 focus:outline-none 
                               focus:ring-1 focus:ring-pink-500
                               opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Patients View ----------------------------- */

function PatientsView({
  patients,
  appointments,
  getPatientHistory,
  openPatientHistory,
  onAddPatient,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg">
      <div className="p-6 border-b bg-gradient-to-r from-pink-50 to-purple-50">
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
              <div className="mt-2">
                <RiskBadge history={appointments} />
              </div>
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
                <button
                  key={patient.name}
                  onClick={() => openPatientHistory(patient.name)}
                  className="bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 rounded-xl p-6 hover:shadow-lg transition-all text-left border-2 border-transparent hover:border-pink-300 group"
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
                          <div className="mt-2">
                            <RiskBadge
                              history={patientHistory}
                              patient={patient}
                            />
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------- PatientHistory Modal -------------------------- */

function PatientHistoryModal({
  selectedPatient,
  patient,
  getPatientHistory,
  getTypeColor,
  getTypeIcon,
  onClose,
}) {
  const history = getPatientHistory(selectedPatient);

  function getClinicalRisk() {
    if (!patient) return { label: 'Bilinmiyor', color: 'text-gray-500' };

    if (patient.highRiskFlag) {
      return { label: 'Yüksek Risk', color: 'text-red-600' };
    }

    if (history.some((h) => h.type === 'Yüksek Riskli Gebelik')) {
      return { label: 'Yüksek Risk', color: 'text-red-600' };
    }

    if (history.length > 5) {
      return { label: 'Orta Risk', color: 'text-yellow-600' };
    }

    return { label: 'Düşük Risk', color: 'text-green-600' };
  }

  const { label: riskLabel } = getClinicalRisk();

  const [profile, setProfile] = React.useState({
    phone: '',
    diagnosis: '',
    notes: '',
  });
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('patient_profiles')
          .select('*')
          .eq('patient_name', selectedPatient)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error('Hasta profili yüklenirken hata:', error);
        }

        const lastPhone =
          history && history.length > 0 ? history[0].phone || '' : '';

        setProfile({
          phone: data?.phone ?? lastPhone,
          diagnosis: data?.diagnosis ?? '',
          notes: data?.notes ?? '',
        });
      } catch (err) {
        console.error('Hasta profili yüklenirken beklenmeyen hata:', err);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [selectedPatient]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      const payload = {
        patient_name: selectedPatient,
        phone: profile.phone || null,
        diagnosis: profile.diagnosis || null,
        notes: profile.notes || null,
      };

      const { error } = await supabase
        .from('patient_profiles')
        .upsert(payload, { onConflict: 'patient_name' });

      if (error) {
        console.error('Hasta profili kaydedilirken hata:', error);
        alert('Hasta profili kaydedilemedi: ' + error.message);
        return;
      }

      alert('Hasta profili kaydedildi.');
    } catch (err) {
      console.error('Hasta profili kaydedilirken beklenmeyen hata:', err);
      alert('Profil kaydedilirken beklenmeyen bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

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
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* HASTA PROFİL KARTI */}
          <div className="bg-pink-50/60 border border-pink-100 rounded-xl p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-semibold text-lg">
                  {selectedPatient
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')}
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
                        riskLabel === 'Düşük Risk'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : riskLabel === 'Orta Risk'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : riskLabel === 'Yüksek Risk'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
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
                {saving ? 'Kaydediliyor...' : 'Profili Kaydet'}
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
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                  placeholder="0532 xxx xx xx"
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
                Doktor Notları / Klinik Öykü
              </label>
              <textarea
                rows={3}
                value={profile.notes}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent resize-none"
                placeholder="Önemli öykü, alerjiler, cerrahi geçmiş, gebelik süreci, vs..."
              />
              {loadingProfile && (
                <div className="text-xs text-gray-400 mt-1">
                  Profil yükleniyor...
                </div>
              )}
            </div>
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
                        {new Date(apt.date).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
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
