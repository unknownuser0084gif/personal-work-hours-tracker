import { selectAppState } from "./store/index.js";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Clock,
  House,
  CalendarDays,
  ChartNoAxesColumn,
  Wallet,
  Settings as SettingsIcon,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  hydrate,
  patchUI,
  deleteEntry,
  restoreEntry,
  deleteHoliday,
} from "./store/index.js";
import { useNow } from "./hooks/useNow.js";
import { localISO } from "./lib/time.js";
import { dateLabel } from "./lib/jalali.js";
import { startReminders } from "./lib/notifications.js";
import { updateSW } from "./lib/pwa.js";
import Dashboard from "./pages/Dashboard.jsx";
import Calendar from "./pages/Calendar.jsx";
import Reports from "./pages/Reports.jsx";
import Salary from "./pages/Salary.jsx";
import Settings from "./pages/Settings.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import { ManualSheet } from "./components/ManualSheet.jsx";
import { Sheet, Card } from "./components/Common.jsx";
const navigation = [
  ["/", "داشبورد", House],
  ["/calendar", "تقویم", CalendarDays],
  ["/reports", "گزارش‌ها", ChartNoAxesColumn],
  ["/salary", "حقوق", Wallet],
  ["/settings", "تنظیمات", SettingsIcon],
];
function Header() {
  const now = useNow();
  return (
    <header className="app-header">
      <span className="brand">
        <Clock size={29} />
        ساعت کاری
      </span>
      <span className="header-date">
        <CalendarDays size={19} />
        {dateLabel(localISO(now))}
      </span>
    </header>
  );
}
export default function App() {
  const dispatch = useDispatch(),
    state = useSelector(selectAppState),
    location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    dispatch(hydrate());
  }, [dispatch]);
  useEffect(() => {
    if (state.ui.status === "ready") return startReminders();
  }, [state.ui.status]);
  useEffect(() => {
    if (
      state.ui.status === "ready" &&
      new URLSearchParams(location.search).get("manual") === "out"
    ) {
      const today = localISO();
      const open = [...state.entries]
        .filter((e) => !e.out)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      dispatch(
        patchUI({
          manual: { date: open?.date || today, mode: "exit", id: open?.id },
        }),
      );
      navigate("/", { replace: true });
    }
  }, [state.ui.status, location.search, dispatch, navigate, state.entries]);
  if (state.ui.status === "idle" || state.ui.status === "loading")
    return (
      <div className="loading" aria-busy="true">
        <Clock size={42} />
        <p>در حال آماده‌سازی ساعت کاری…</p>
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    );
  if (state.ui.status === "error")
    return (
      <div className="page">
        <Card>
          <h1>داده‌ها باز نشدند</h1>
          <p className="error">{state.ui.error}</p>
          <p>ممکن است دسترسی مرورگر به ذخیره‌سازی محدود شده باشد.</p>
          <button
            className="button primary"
            onClick={() => dispatch(hydrate())}
          >
            تلاش دوباره
          </button>
        </Card>
      </div>
    );
  if (!state.settings.onboardingDone && location.pathname !== "/onboarding")
    return <Navigate to="/onboarding" replace />;
  const onboarding = location.pathname === "/onboarding";
  const confirm = state.ui.confirm;
  async function confirmAction() {
    dispatch(patchUI({ confirm: null }));
    try {
      if (confirm.kind === "clearAll") {
        dispatch(patchUI({ clearRequested: true }));
      } else if (confirm.kind === "deleteHoliday") {
        await dispatch(deleteHoliday(confirm.date)).unwrap();
        toast.success("مناسبت حذف شد.");
      } else if (confirm.kind === "deleteEntry") {
        const old = await dispatch(deleteEntry(confirm.entry.id)).unwrap();
        toast(
          (t) => (
            <div className="toast-undo">
              بازه حذف شد.
              <button
                onClick={async () => {
                  try {
                    await dispatch(restoreEntry(old)).unwrap();
                    toast.dismiss(t.id);
                    toast.success("بازه برگردانده شد.");
                  } catch (e) {
                    toast.error(String(e));
                  }
                }}
              >
                برگردان
              </button>
            </div>
          ),
          { duration: 7000 },
        );
      }
    } catch (e) {
      toast.error("عملیات انجام نشد.");
    }
  }

  return (
    <div className={`app-shell ${onboarding ? "setup-shell" : ""}`}>
      {!onboarding && (
        <>
          <Header />
          <nav className="navigation" aria-label="ناوبری اصلی">
            <span className="nav-brand">
              <Clock />
              ساعت کاری
            </span>
            {navigation.map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <Icon size={23} />
                <span>{label}</span>
              </NavLink>
            ))}
            <span className="nav-footer">شخصی، ساده، آفلاین</span>
          </nav>
        </>
      )}
      <main>
        {state.ui.updateAvailable && (
          <div className="banner">
            <span>نسخه جدید آماده است</span>
            <button onClick={() => updateSW(true)}>
              <RefreshCw size={16} />
              به‌روزرسانی
            </button>
          </div>
        )}
        {state.ui.missed.length > 0 && !onboarding && (
          <div className="banner missed">
            <div>
              <b>یادآوری‌های ازدست‌رفته</b>
              <p>{state.ui.missed.map((r) => r.title).join("، ")}</p>
            </div>
            <button
              onClick={() =>
                dispatch(
                  patchUI({
                    manual: {
                      date: localISO(),
                      mode: state.entries.some(
                        (e) => e.date === localISO() && !e.out,
                      )
                        ? "exit"
                        : "entry",
                    },
                  }),
                )
              }
            >
              ثبت دستی
            </button>
            <button
              aria-label="بستن یادآوری"
              onClick={() => dispatch(patchUI({ missed: [] }))}
            >
              بستن
            </button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {state.ui.manual && <ManualSheet key={JSON.stringify(state.ui.manual)} />}
      {confirm && (
        <Sheet
          title={confirm.title}
          onClose={() => dispatch(patchUI({ confirm: null }))}
        >
          <p>{confirm.body}</p>
          <div className="two-grid mt-5">
            <button className="button danger" onClick={confirmAction}>
              تأیید
            </button>
            <button
              className="button secondary"
              onClick={() => dispatch(patchUI({ confirm: null }))}
            >
              انصراف
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
