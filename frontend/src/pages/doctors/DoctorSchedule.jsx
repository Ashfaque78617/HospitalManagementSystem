import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getErrorMessage, http } from "../../api/client";
import { ErrorAlert, Loading } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";
import { DAYS, toInputTime, toTimeParam } from "../../utils/format";

const blank = (day = 1) => ({ dayOfWeek: day, startTime: "09:00", endTime: "13:00", slotDurationMinutes: 20, maxAppointments: "", isActive: true });

export default function DoctorSchedule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [doctor, setDoctor] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([http.get(`/doctors/${id}`), http.get(`/doctors/${id}/schedules`)])
      .then(([d, s]) => {
        setDoctor(d);
        setRows(s.map((r) => ({ ...r, startTime: toInputTime(r.startTime), endTime: toInputTime(r.endTime), maxAppointments: r.maxAppointments ?? "" })));
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (i, patch) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const rowError = (r) => {
    if (!r.startTime || !r.endTime) return "Enter start and end time.";
    if (r.endTime <= r.startTime) return "End time must be after start time.";
    if (Number(r.slotDurationMinutes) < 5) return "Slot must be at least 5 minutes.";
    return null;
  };

  const save = async () => {
    const bad = rows.map(rowError).find(Boolean);
    if (bad) return setError(bad);
    setSaving(true);
    setError("");
    try {
      await http.put(`/doctors/${id}/schedules`, rows.map((r) => ({
        dayOfWeek: Number(r.dayOfWeek),
        startTime: toTimeParam(r.startTime),
        endTime: toTimeParam(r.endTime),
        slotDurationMinutes: Number(r.slotDurationMinutes),
        maxAppointments: r.maxAppointments === "" ? null : Number(r.maxAppointments),
        isActive: r.isActive,
      })));
      toast.success("Schedule saved.");
      navigate(`/doctors/${id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Weekly schedule" subtitle={doctor?.fullName}
        crumbs={[{ label: "Doctors", to: "/doctors" }, { label: doctor?.fullName ?? "…", to: `/doctors/${id}` }, { label: "Schedule" }]}>
        <button className="btn btn-outline-secondary" onClick={() => setRows((r) => [...r, blank(r.at(-1)?.dayOfWeek ?? 1)])}>
          <i className="bi bi-plus-lg me-1" />Add working hours
        </button>
      </PageHeader>

      <div className="panel">
        <div className="panel-body pb-0"><ErrorAlert message={error} /></div>
        <div className="table-responsive">
          <table className="table table-clean">
            <thead><tr><th>Day</th><th>Start</th><th>End</th><th>Slot (min)</th><th>Max patients</th><th>Active</th><th /></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ minWidth: 140 }}>
                    <select className="form-select" value={r.dayOfWeek} onChange={(e) => update(i, { dayOfWeek: Number(e.target.value) })}>
                      {DAYS.slice(1).map((d, idx) => <option key={d} value={idx + 1}>{d}</option>)}
                    </select>
                  </td>
                  <td><input type="time" className="form-control" value={r.startTime} onChange={(e) => update(i, { startTime: e.target.value })} /></td>
                  <td><input type="time" className="form-control" value={r.endTime} onChange={(e) => update(i, { endTime: e.target.value })} /></td>
                  <td style={{ width: 110 }}><input type="number" min="5" max="240" className="form-control" value={r.slotDurationMinutes} onChange={(e) => update(i, { slotDurationMinutes: e.target.value })} /></td>
                  <td style={{ width: 120 }}><input type="number" min="1" className="form-control" placeholder="No limit" value={r.maxAppointments} onChange={(e) => update(i, { maxAppointments: e.target.value })} /></td>
                  <td><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={r.isActive} onChange={(e) => update(i, { isActive: e.target.checked })} aria-label="Active" /></div></td>
                  <td className="text-end"><button className="btn btn-outline-danger icon-btn" aria-label="Remove row" onClick={() => setRows((x) => x.filter((_, idx) => idx !== i))}><i className="bi bi-trash" /></button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-4">No working hours yet. Add the first row.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="panel-body d-flex justify-content-end gap-2 border-top">
          <button className="btn btn-outline-secondary" onClick={() => navigate(`/doctors/${id}`)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}Save schedule
          </button>
        </div>
      </div>
    </>
  );
}
