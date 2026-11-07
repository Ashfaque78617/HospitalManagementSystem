using System.Data;
using HospitalManagement.Api.Common;
using HospitalManagement.Api.Data;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Services;

public class AppointmentService(AppDbContext db, IAuditService audit, ICurrentUser currentUser)
{
    // Allowed workflow moves. Anything else is rejected.
    private static readonly Dictionary<string, string[]> Transitions = new()
    {
        [StatusNames.Scheduled] = [StatusNames.CheckedIn, StatusNames.Cancelled, StatusNames.NoShow],
        [StatusNames.CheckedIn] = [StatusNames.Waiting, StatusNames.InConsultation, StatusNames.Cancelled],
        [StatusNames.Waiting] = [StatusNames.InConsultation, StatusNames.Cancelled],
        [StatusNames.InConsultation] = [StatusNames.Completed],
    };

    public static byte IsoDay(DateOnly date) => (byte)(((int)date.DayOfWeek + 6) % 7 + 1);

    /// <summary>If the caller is a doctor, returns their DoctorId (or -1 when no profile is linked); otherwise null.</summary>
    public async Task<int?> GetOwnDoctorIdAsync()
    {
        if (!currentUser.IsInRole(AppRoles.Doctor)) return null;
        var uid = currentUser.UserId;
        var id = await db.Doctors.Where(d => d.UserId == uid).Select(d => (int?)d.DoctorId).FirstOrDefaultAsync();
        return id ?? -1;
    }

    public async Task<PagedResult<AppointmentDto>> ListAsync(DateOnly? from, DateOnly? to, int? doctorId, int? patientId,
        int? statusId, string? search, int page, int pageSize)
    {
        var q = db.Appointments.AsNoTracking().AsQueryable();
        var own = await GetOwnDoctorIdAsync();
        if (own.HasValue) q = q.Where(a => a.DoctorId == own.Value);
        if (from.HasValue) q = q.Where(a => a.AppointmentDate >= from.Value);
        if (to.HasValue) q = q.Where(a => a.AppointmentDate <= to.Value);
        if (doctorId.HasValue) q = q.Where(a => a.DoctorId == doctorId);
        if (patientId.HasValue) q = q.Where(a => a.PatientId == patientId);
        if (statusId.HasValue) q = q.Where(a => a.AppointmentStatusId == statusId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(a => a.AppointmentNo.Contains(s) || a.Patient.PatientCode.Contains(s) ||
                             (a.Patient.FirstName + " " + (a.Patient.LastName ?? "")).Contains(s));
        }
        return await q.OrderBy(a => a.AppointmentDate).ThenBy(a => a.StartTime).Select(Projections.Appointment).ToPagedAsync(page, pageSize);
    }

    public async Task<AppointmentDto> GetAsync(int id)
    {
        var own = await GetOwnDoctorIdAsync();
        var dto = await db.Appointments.AsNoTracking()
            .Where(a => a.AppointmentId == id && (own == null || a.DoctorId == own))
            .Select(Projections.Appointment).FirstOrDefaultAsync();
        return dto ?? throw new NotFoundException($"Appointment #{id} was not found.");
    }

    /// <summary>All slots for a doctor on a date, flagged available or taken.</summary>
    public async Task<IReadOnlyList<SlotDto>> GetSlotsAsync(int doctorId, DateOnly date, int excludeAppointmentId = 0)
    {
        var dow = IsoDay(date);
        var schedules = await db.DoctorSchedules.AsNoTracking()
            .Where(s => s.DoctorId == doctorId && s.IsActive && s.DayOfWeek == dow)
            .OrderBy(s => s.StartTime).ToListAsync();
        if (schedules.Count == 0) return [];

        var booked = await db.Appointments.AsNoTracking()
            .Where(a => a.DoctorId == doctorId && a.AppointmentDate == date && a.AppointmentId != excludeAppointmentId &&
                        !StatusNames.Inactive.Contains(a.Status.StatusName))
            .Select(a => new { a.StartTime, a.EndTime }).ToListAsync();

        var today = DateOnly.FromDateTime(DateTime.Today);
        var nowTime = TimeOnly.FromDateTime(DateTime.Now);
        var slots = new List<SlotDto>();

        foreach (var sch in schedules)
        {
            var windowCount = booked.Count(b => b.StartTime >= sch.StartTime && b.StartTime < sch.EndTime);
            var full = sch.MaxAppointments.HasValue && windowCount >= sch.MaxAppointments.Value;
            var cursor = sch.StartTime;

            while (true)
            {
                var end = cursor.AddMinutes(sch.SlotDurationMinutes);
                if (end <= cursor || end > sch.EndTime) break; // passed the window (or wrapped past midnight)

                var taken = booked.Any(b => b.StartTime < end && b.EndTime > cursor);
                var past = date < today || (date == today && cursor <= nowTime);
                slots.Add(new SlotDto(cursor, end, !taken && !past && !full));
                cursor = end;
            }
        }
        return slots;
    }

    public async Task<AppointmentDto> CreateAsync(AppointmentRequest r)
    {
        var patient = await db.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.PatientId == r.PatientId)
                      ?? throw new BusinessRuleException("The selected patient does not exist.");
        if (!patient.IsActive) throw new BusinessRuleException("Inactive patients cannot book new appointments.");
        await EnsureDoctorActiveAsync(r.DoctorId);

        var scheduledId = await StatusIdAsync(StatusNames.Scheduled);

        // Serializable isolation stops two receptionists booking the same slot at the same instant.
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var slot = await ResolveSlotAsync(r.DoctorId, r.AppointmentDate, r.StartTime, 0);
        await EnsurePatientFreeAsync(r.PatientId, r.AppointmentDate, slot.StartTime, slot.EndTime, 0);

        var appointment = new Appointment
        {
            AppointmentNo = Guid.NewGuid().ToString("N")[..20],
            PatientId = r.PatientId, DoctorId = r.DoctorId, AppointmentStatusId = scheduledId,
            AppointmentDate = r.AppointmentDate, StartTime = slot.StartTime, EndTime = slot.EndTime,
            Reason = Clean(r.Reason), Notes = Clean(r.Notes)
        };
        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();
        appointment.AppointmentNo = $"APT-{appointment.AppointmentId:D6}";
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("Create", nameof(Appointment), appointment.AppointmentId,
            $"Booked {appointment.AppointmentNo} on {r.AppointmentDate:yyyy-MM-dd} {slot.StartTime:HH\\:mm}.");
        return await GetAsync(appointment.AppointmentId);
    }

    public async Task<AppointmentDto> RescheduleAsync(int id, AppointmentRequest r)
    {
        var appt = await db.Appointments.Include(a => a.Status).FirstOrDefaultAsync(a => a.AppointmentId == id)
                   ?? throw new NotFoundException($"Appointment #{id} was not found.");
        if (appt.Status.StatusName != StatusNames.Scheduled)
            throw new BusinessRuleException("Only appointments with status 'Scheduled' can be rescheduled.");
        if (r.PatientId != appt.PatientId)
            throw new BusinessRuleException("The patient of an appointment cannot be changed. Cancel it and book a new one.");
        await EnsureDoctorActiveAsync(r.DoctorId);

        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var slot = await ResolveSlotAsync(r.DoctorId, r.AppointmentDate, r.StartTime, id);
        await EnsurePatientFreeAsync(appt.PatientId, r.AppointmentDate, slot.StartTime, slot.EndTime, id);

        appt.DoctorId = r.DoctorId;
        appt.AppointmentDate = r.AppointmentDate;
        appt.StartTime = slot.StartTime;
        appt.EndTime = slot.EndTime;
        appt.Reason = Clean(r.Reason);
        appt.Notes = Clean(r.Notes);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("Reschedule", nameof(Appointment), id, $"Moved {appt.AppointmentNo} to {r.AppointmentDate:yyyy-MM-dd} {slot.StartTime:HH\\:mm}.");
        return await GetAsync(id);
    }

    public async Task<AppointmentDto> ChangeStatusAsync(int id, string newStatus)
    {
        var own = await GetOwnDoctorIdAsync();
        var appt = await db.Appointments.Include(a => a.Status)
                       .FirstOrDefaultAsync(a => a.AppointmentId == id && (own == null || a.DoctorId == own))
                   ?? throw new NotFoundException($"Appointment #{id} was not found.");

        var current = appt.Status.StatusName;
        if (!Transitions.TryGetValue(current, out var allowed) || !allowed.Contains(newStatus))
            throw new BusinessRuleException($"An appointment that is '{current}' cannot be changed to '{newStatus}'.");

        appt.AppointmentStatusId = await StatusIdAsync(newStatus);
        await db.SaveChangesAsync();
        await audit.LogAsync("StatusChange", nameof(Appointment), id, $"{appt.AppointmentNo}: {current} -> {newStatus}.");
        return await GetAsync(id);
    }

    // ---------- helpers ----------
    private async Task EnsureDoctorActiveAsync(int doctorId)
    {
        var doctor = await db.Doctors.AsNoTracking().FirstOrDefaultAsync(d => d.DoctorId == doctorId)
                     ?? throw new BusinessRuleException("The selected doctor does not exist.");
        if (!doctor.IsActive) throw new BusinessRuleException("The selected doctor is not active.");
    }

    private async Task<int> StatusIdAsync(string name) =>
        await db.AppointmentStatuses.Where(s => s.StatusName == name && s.IsActive).Select(s => (int?)s.AppointmentStatusId).FirstOrDefaultAsync()
        ?? throw new BusinessRuleException($"The appointment status '{name}' is missing or inactive. Check Admin > Appointment statuses.");

    private async Task<SlotDto> ResolveSlotAsync(int doctorId, DateOnly date, TimeOnly start, int excludeId)
    {
        var slots = await GetSlotsAsync(doctorId, date, excludeId);
        var slot = slots.FirstOrDefault(s => s.StartTime == start)
                   ?? throw new BusinessRuleException("The doctor does not take appointments at that time. Pick one of the listed slots.");
        if (!slot.IsAvailable)
            throw new BusinessRuleException("That slot is not available (already booked, in the past, or the session is full).");
        return slot;
    }

    private async Task EnsurePatientFreeAsync(int patientId, DateOnly date, TimeOnly start, TimeOnly end, int excludeId)
    {
        var clash = await db.Appointments.AnyAsync(a => a.PatientId == patientId && a.AppointmentDate == date &&
            a.AppointmentId != excludeId && !StatusNames.Inactive.Contains(a.Status.StatusName) &&
            a.StartTime < end && a.EndTime > start);
        if (clash) throw new BusinessRuleException("The patient already has another appointment at this time.");
    }

    private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
