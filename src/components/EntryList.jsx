import { Pencil, Trash2, LogIn, LogOut } from "lucide-react";
import { useDispatch } from "react-redux";
import { patchUI } from "../store/index.js";
import { toPersianDigits, duration } from "../lib/format.js";
import { minutes } from "../lib/time.js";
import { Empty } from "./Common.jsx";
export function EntryList({ entries }) {
  const dispatch = useDispatch();
  function remove(entry) {
    dispatch(
      patchUI({
        confirm: {
          title: "حذف این بازه؟",
          body: "بازه انتخاب‌شده حذف می‌شود. پس از حذف می‌توانی آن را برگردانی.",
          kind: "deleteEntry",
          entry,
        },
      }),
    );
  }
  if (!entries.length) return <Empty />;
  return (
    <div className="entry-list">
      {[...entries]
        .sort((a, b) => a.in.localeCompare(b.in))
        .map((e) => (
          <div className="entry-row" key={e.id}>
            <div className="entry-times">
              <span>
                <LogIn size={16} />
                <b dir="ltr">{toPersianDigits(e.in)}</b>
              </span>
              <span>
                <LogOut size={16} />
                <b dir="ltr">{e.out ? toPersianDigits(e.out) : "باز"}</b>
              </span>
              <small>
                {e.out
                  ? duration(minutes(e.out) - minutes(e.in))
                  : "در حال کار"}
              </small>
            </div>
            <div className="flex">
              <button
                className="icon-button"
                aria-label="ویرایش بازه"
                onClick={() => dispatch(patchUI({ manual: { entry: e } }))}
              >
                <Pencil size={18} />
              </button>
              <button
                className="icon-button danger-text"
                aria-label="حذف بازه"
                onClick={() => remove(e)}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
