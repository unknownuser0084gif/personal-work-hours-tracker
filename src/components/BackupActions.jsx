import { useCallback, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Download, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { createBackup, parseBackup } from "../lib/backup.js";
import { downloadJSON } from "../lib/export.js";
import { localISO } from "../lib/time.js";
import { number, money, toPersianDigits } from "../lib/format.js";
import { importBackup } from "../store/index.js";
import { Sheet, StatList, ErrorText } from "./Common.jsx";

export function BackupActions() {
  const dispatch = useDispatch();
  const input = useRef();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  // The dashboard clock renders every second; keep Sheet's focus effect stable.
  const close = useCallback(() => {
    if (!busy) {
      setPending(null);
      setError("");
    }
  }, [busy]);

  async function download() {
    setBusy(true);
    setError("");
    try {
      const now = new Date();
      downloadJSON(await createBackup(now), `work-hours-backup-${localISO(now)}-${now.getTime()}.json`);
      toast.success("فایل پشتیبان کامل آمادهٔ دانلود شد.");
    } catch {
      setError("تهیهٔ پشتیبان انجام نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function selectFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setPending({ payload: parseBackup(await file.text()), filename: file.name });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await dispatch(importBackup(pending.payload)).unwrap();
      // An old delete/Undo toast must not reintroduce rows from before import.
      toast.remove();
      setPending(null);
      toast.success("همهٔ اطلاعات از فایل پشتیبان جایگزین شدند.");
    } catch (e) {
      setError(`بازیابی انجام نشد؛ اطلاعات فعلی حفظ شدند. ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="backup-tools" aria-busy={busy}>
      <div className="quick-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={download}>
          <Download size={18} />دانلود پشتیبان کامل
        </button>
        <button type="button" className="button secondary" disabled={busy} onClick={() => input.current.click()}>
          <Upload size={18} />بازیابی از فایل JSON
        </button>
      </div>
      <input ref={input} type="file" accept=".json,application/json" hidden
        aria-label="فایل پشتیبان JSON" onChange={selectFile} />
      <small className="muted backup-hint">همهٔ اطلاعات و تنظیمات در یک فایل JSON؛ فایل را خارج از مرورگر نگه دارید.</small>
      {!pending && <ErrorText error={error} />}
      {pending && (
        <Sheet title="جایگزینی همهٔ اطلاعات؟" onClose={close}>
          <p className="backup-filename" dir="auto">{pending.filename}</p>
          <StatList rows={[
            ["تاریخ پشتیبان", toPersianDigits(new Date(pending.payload.exportedAt).toLocaleString("fa-IR"))],
            ["بازه‌های کاری", number(pending.payload.data.entries.length)],
            ["یادداشت‌ها", number(pending.payload.data.dayNotes.length)],
            ["مناسبت‌ها", number(pending.payload.data.holidays.length)],
            ["حقوق پایهٔ ماهانه", money(pending.payload.data.settings.monthlySalary)],
          ]} />
          <p className="warning">تمام داده‌های فعلی حذف و با اطلاعات این فایل جایگزین می‌شوند. برای نگه‌داشتن اطلاعات فعلی، ابتدا پشتیبان دانلود کنید.</p>
          <ErrorText error={error} />
          <div className="two-grid mt-5">
            <button type="button" className="button danger" disabled={busy} onClick={restore}>
              {busy ? "در حال بازیابی…" : "تأیید و جایگزینی"}
            </button>
            <button type="button" className="button secondary" disabled={busy} onClick={close}>انصراف</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
