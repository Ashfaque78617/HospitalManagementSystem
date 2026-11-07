using HospitalManagement.Api.Common;
using HospitalManagement.Api.Data;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Services;

public class DoctorService(AppDbContext db, IAuditService audit)
{
    private static DoctorDto ToDto(Doctor d) => new(
        d.DoctorId, d.DoctorCode, d.FirstName, d.LastName, $"Dr. {d.FirstName} {d.LastName}".Trim(),
        d.SpecializationId, d.Specialization.SpecializationName, d.UserId, d.Qualification,
        d.Phone, d.Email, d.ConsultationFee, d.IsActive);

    public async Task<PagedResult<DoctorDto>> SearchAsync(string? search, int? specializationId, bool? isActive, int page, int pageSize)
    {
        var q = db.Doctors.AsNoTracking().Include(d => d.Specialization).AsQueryable();
        if (specializationId.HasValue) q = q.Where(d => d.SpecializationId == specializationId);
        if (isActive.HasValue) q = q.Where(d => d.IsActive == isActive);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(d => d.DoctorCode.Contains(s) || (d.FirstName + " " + (d.LastName ?? "")).Contains(s));
        }
        var paged = await q.OrderBy(d => d.FirstName).ToPagedAsync(page, pageSize);
        return new PagedResult<DoctorDto>(paged.Items.Select(ToDto).ToList(), paged.TotalCount, paged.Page, paged.PageSize);
    }

    public async Task<IReadOnlyList<DoctorLookupDto>> LookupAsync() =>
        await db.Doctors.AsNoTracking().Where(d => d.IsActive).OrderBy(d => d.FirstName)
            .Select(d => new DoctorLookupDto(d.DoctorId, "Dr. " + (d.FirstName + " " + (d.LastName ?? "")).Trim(),
                d.Specialization.SpecializationName, d.ConsultationFee))
            .ToListAsync();

    public async Task<DoctorDto> GetAsync(int id) => ToDto(await FindAsync(id, false));

    public async Task<DoctorDetailsDto> GetDetailsAsync(int id)
    {
        var doctor = await FindAsync(id, false);
        var today = DateOnly.FromDateTime(DateTime.Today);
        var upcoming = await db.Appointments.AsNoTracking()
            .Where(a => a.DoctorId == id && a.AppointmentDate >= today && !StatusNames.Inactive.Contains(a.Status.StatusName))
            .OrderBy(a => a.AppointmentDate).ThenBy(a => a.StartTime).Take(15)
            .Select(Projections.Appointment).ToListAsync();
        return new DoctorDetailsDto(ToDto(doctor), await GetSchedulesAsync(id), upcoming);
    }

    public async Task<DoctorDto> CreateAsync(DoctorRequest r)
    {
        await ValidateAsync(r, null);
        var doctor = new Doctor { DoctorCode = Guid.NewGuid().ToString("N")[..20] };
        Apply(doctor, r);

        await using var tx = await db.Database.BeginTransactionAsync();
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();
        doctor.DoctorCode = $"DOC-{doctor.DoctorId:D4}";
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("Create", nameof(Doctor), doctor.DoctorId, $"Created doctor {doctor.DoctorCode} ({doctor.FirstName}).");
        return await GetAsync(doctor.DoctorId);
    }

    public async Task<DoctorDto> UpdateAsync(int id, DoctorRequest r)
    {
        var doctor = await FindAsync(id, true);
        await ValidateAsync(r, id);
        Apply(doctor, r);
        await db.SaveChangesAsync();
        await audit.LogAsync("Update", nameof(Doctor), id, $"Updated doctor {doctor.DoctorCode}.");
        return await GetAsync(id);
    }

    public async Task SetActiveAsync(int id, bool isActive)
    {
        var doctor = await FindAsync(id, true);
        if (!isActive)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            if (await db.Appointments.AnyAsync(a => a.DoctorId == id && a.AppointmentDate >= today && !StatusNames.Inactive.Contains(a.Status.StatusName)))
                throw new BusinessRuleException("This doctor has upcoming appointments. Reschedule or cancel them first.");
        }
        doctor.IsActive = isActive;
        await db.SaveChangesAsync();
        await audit.LogAsync(isActive ? "Activate" : "Deactivate", nameof(Doctor), id, $"{(isActive ? "Reactivated" : "Deactivated")} doctor {doctor.DoctorCode}.");
    }

    // ---------- schedules ----------
    public async Task<IReadOnlyList<ScheduleDto>> GetSchedulesAsync(int doctorId) =>
        await db.DoctorSchedules.AsNoTracking().Where(s => s.DoctorId == doctorId)
            .OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime)
            .Select(s => new ScheduleDto(s.ScheduleId, s.DayOfWeek, s.StartTime, s.EndTime, s.SlotDurationMinutes, s.MaxAppointments, s.IsActive))
            .ToListAsync();

    /// <summary>Replaces the doctor's weekly schedule with the supplied list (validated for overlaps).</summary>
    public async Task<IReadOnlyList<ScheduleDto>> SaveSchedulesAsync(int doctorId, List<ScheduleRequest> requests)
    {
        await FindAsync(doctorId, false);

        foreach (var s in requests)
        {
            if (s.EndTime <= s.StartTime) throw new BusinessRuleException("End time must be after start time.");
            if ((s.EndTime - s.StartTime).TotalMinutes < s.SlotDurationMinutes)
                throw new BusinessRuleException("The working window is shorter than one appointment slot.");
        }
        foreach (var day in requests.Where(r => r.IsActive).GroupBy(r => r.DayOfWeek))
        {
            var ordered = day.OrderBy(r => r.StartTime).ToList();
            for (var i = 1; i < ordered.Count; i++)
                if (ordered[i].StartTime < ordered[i - 1].EndTime)
                    throw new BusinessRuleException("Working hours on the same day cannot overlap.");
        }

        var existing = await db.DoctorSchedules.Where(s => s.DoctorId == doctorId).ToListAsync();
        db.DoctorSchedules.RemoveRange(existing);
        db.DoctorSchedules.AddRange(requests.Select(r => new DoctorSchedule
        {
            DoctorId = doctorId, DayOfWeek = r.DayOfWeek, StartTime = r.StartTime, EndTime = r.EndTime,
            SlotDurationMinutes = r.SlotDurationMinutes, MaxAppointments = r.MaxAppointments, IsActive = r.IsActive
        }));
        await db.SaveChangesAsync();
        await audit.LogAsync("Update", "DoctorSchedule", doctorId, $"Saved {requests.Count} schedule row(s).");
        return await GetSchedulesAsync(doctorId);
    }

    // ---------- helpers ----------
    private async Task<Doctor> FindAsync(int id, bool tracking)
    {
        var q = tracking ? db.Doctors.AsQueryable() : db.Doctors.AsNoTracking();
        return await q.Include(d => d.Specialization).FirstOrDefaultAsync(d => d.DoctorId == id)
               ?? throw new NotFoundException($"Doctor #{id} was not found.");
    }

    private async Task ValidateAsync(DoctorRequest r, int? excludeId)
    {
        if (!await db.Specializations.AnyAsync(s => s.SpecializationId == r.SpecializationId && s.IsActive))
            throw new BusinessRuleException("Select an active specialization.");

        if (r.UserId.HasValue)
        {
            var user = await db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == r.UserId)
                       ?? throw new BusinessRuleException("The linked user account does not exist.");
            if (user.Role.RoleName != AppRoles.Doctor)
                throw new BusinessRuleException("The linked user must have the Doctor role.");
            if (await db.Doctors.AnyAsync(d => d.UserId == r.UserId && d.DoctorId != (excludeId ?? 0)))
                throw new BusinessRuleException("That user account is already linked to another doctor.");
        }
    }

    private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private static void Apply(Doctor d, DoctorRequest r)
    {
        d.FirstName = r.FirstName.Trim();
        d.LastName = Clean(r.LastName);
        d.SpecializationId = r.SpecializationId;
        d.UserId = r.UserId;
        d.Qualification = Clean(r.Qualification);
        d.Phone = Clean(r.Phone);
        d.Email = Clean(r.Email);
        d.ConsultationFee = r.ConsultationFee;
    }
}
