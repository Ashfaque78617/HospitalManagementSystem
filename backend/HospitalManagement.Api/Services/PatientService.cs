using HospitalManagement.Api.Common;
using HospitalManagement.Api.Data;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Services;

public class PatientService(AppDbContext db, IAuditService audit)
{
    public async Task<PagedResult<PatientDto>> SearchAsync(string? search, bool? isActive, int page, int pageSize)
    {
        var q = db.Patients.AsNoTracking().AsQueryable();
        if (isActive.HasValue) q = q.Where(p => p.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(p => p.PatientCode.Contains(s) || p.Phone.Contains(s) ||
                             (p.FirstName + " " + (p.LastName ?? "")).Contains(s));
        }
        var paged = await q.OrderByDescending(p => p.PatientId).ToPagedAsync(page, pageSize);
        return new PagedResult<PatientDto>(paged.Items.Select(PatientDto.From).ToList(), paged.TotalCount, paged.Page, paged.PageSize);
    }

    public async Task<IReadOnlyList<PatientLookupDto>> LookupAsync(string? search)
    {
        var q = db.Patients.AsNoTracking().Where(p => p.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(p => p.PatientCode.Contains(s) || p.Phone.Contains(s) ||
                             (p.FirstName + " " + (p.LastName ?? "")).Contains(s));
        }
        return await q.OrderBy(p => p.FirstName).Take(20)
            .Select(p => new PatientLookupDto(p.PatientId, p.PatientCode, (p.FirstName + " " + (p.LastName ?? "")).Trim(), p.Phone))
            .ToListAsync();
    }

    public async Task<PatientDto> GetAsync(int id) => PatientDto.From(await FindAsync(id, tracking: false));

    public async Task<PatientDetailsDto> GetDetailsAsync(int id)
    {
        var patient = await FindAsync(id, tracking: false);
        var appointments = await db.Appointments.AsNoTracking().Where(a => a.PatientId == id)
            .OrderByDescending(a => a.AppointmentDate).ThenByDescending(a => a.StartTime)
            .Select(Projections.Appointment).ToListAsync();
        var invoices = await db.Invoices.AsNoTracking().Where(i => i.PatientId == id)
            .OrderByDescending(i => i.InvoiceDate).Select(Projections.InvoiceList).ToListAsync();

        var billable = invoices.Where(i => i.Status != InvoiceStatuses.Cancelled).ToList();
        var summary = new PaymentSummaryDto(billable.Sum(i => i.GrandTotal), billable.Sum(i => i.PaidAmount), billable.Sum(i => i.Balance));
        return new PatientDetailsDto(PatientDto.From(patient), appointments, invoices, summary);
    }

    public async Task<IReadOnlyList<HistoryItemDto>> GetHistoryAsync(int id)
    {
        await FindAsync(id, tracking: false);
        var items = new List<HistoryItemDto>();

        var appts = await db.Appointments.AsNoTracking().Where(a => a.PatientId == id)
            .Select(Projections.Appointment).ToListAsync();
        items.AddRange(appts.Select(a => new HistoryItemDto(
            a.AppointmentDate.ToDateTime(a.StartTime), "Appointment", $"{a.DoctorName} ({a.Specialization})",
            a.Reason, null, a.Status, a.AppointmentId)));

        var invoices = await db.Invoices.AsNoTracking().Where(i => i.PatientId == id)
            .Select(Projections.InvoiceList).ToListAsync();
        items.AddRange(invoices.Select(i => new HistoryItemDto(
            i.InvoiceDate.ToLocalTime(), "Invoice", i.InvoiceNo, null, i.GrandTotal, i.Status, i.InvoiceId)));

        var payments = await db.Payments.AsNoTracking().Where(p => p.Invoice.PatientId == id)
            .Select(p => new { p.PaymentId, p.PaymentDate, p.Amount, p.PaymentMethod, p.Invoice.InvoiceNo }).ToListAsync();
        items.AddRange(payments.Select(p => new HistoryItemDto(
            p.PaymentDate.ToLocalTime(), "Payment", $"Payment for {p.InvoiceNo}", p.PaymentMethod, p.Amount, "Completed", p.PaymentId)));

        return items.OrderByDescending(i => i.Date).ToList();
    }

    public async Task<PatientDto> CreateAsync(PatientRequest r)
    {
        Validate(r);
        await EnsureNotDuplicateAsync(r, null);

        var patient = new Patient { PatientCode = Guid.NewGuid().ToString("N")[..20] };
        Apply(patient, r);

        await using var tx = await db.Database.BeginTransactionAsync();
        db.Patients.Add(patient);
        await db.SaveChangesAsync();
        patient.PatientCode = $"PAT-{patient.PatientId:D6}";
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("Create", nameof(Patient), patient.PatientId, $"Registered patient {patient.PatientCode} ({patient.FirstName}).");
        return PatientDto.From(patient);
    }

    public async Task<PatientDto> UpdateAsync(int id, PatientRequest r)
    {
        Validate(r);
        var patient = await FindAsync(id, tracking: true);
        await EnsureNotDuplicateAsync(r, id);
        Apply(patient, r);
        await db.SaveChangesAsync();
        await audit.LogAsync("Update", nameof(Patient), id, $"Updated patient {patient.PatientCode}.");
        return PatientDto.From(patient);
    }

    public async Task SetActiveAsync(int id, bool isActive)
    {
        var patient = await FindAsync(id, tracking: true);
        if (!isActive)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var hasUpcoming = await db.Appointments.AnyAsync(a => a.PatientId == id && a.AppointmentDate >= today &&
                !StatusNames.Inactive.Contains(a.Status.StatusName));
            if (hasUpcoming)
                throw new BusinessRuleException("This patient has upcoming appointments. Cancel or complete them before deactivating.");
        }
        patient.IsActive = isActive;
        await db.SaveChangesAsync();
        await audit.LogAsync(isActive ? "Activate" : "Deactivate", nameof(Patient), id, $"{(isActive ? "Reactivated" : "Deactivated")} patient {patient.PatientCode}.");
    }

    // ---------- helpers ----------
    private async Task<Patient> FindAsync(int id, bool tracking)
    {
        var q = tracking ? db.Patients.AsQueryable() : db.Patients.AsNoTracking();
        return await q.FirstOrDefaultAsync(p => p.PatientId == id) ?? throw new NotFoundException($"Patient #{id} was not found.");
    }

    private static void Validate(PatientRequest r)
    {
        if (r.DateOfBirth is { } dob && dob > DateOnly.FromDateTime(DateTime.Today))
            throw new BusinessRuleException("Date of birth cannot be in the future.");
        if (r.DateOfBirth is { } d2 && d2.Year < 1900)
            throw new BusinessRuleException("Enter a valid date of birth.");
    }

    private async Task EnsureNotDuplicateAsync(PatientRequest r, int? excludeId)
    {
        var first = r.FirstName.Trim();
        var last = string.IsNullOrWhiteSpace(r.LastName) ? null : r.LastName.Trim();
        var phone = r.Phone.Trim();
        var exists = await db.Patients.AnyAsync(p => p.PatientId != (excludeId ?? 0) &&
            p.Phone == phone && p.FirstName == first && p.LastName == last);
        if (exists)
            throw new BusinessRuleException("A patient with the same name and phone number is already registered.");
    }

    private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private static void Apply(Patient p, PatientRequest r)
    {
        p.FirstName = r.FirstName.Trim();
        p.LastName = Clean(r.LastName);
        p.DateOfBirth = r.DateOfBirth;
        p.Gender = Clean(r.Gender);
        p.BloodGroup = Clean(r.BloodGroup);
        p.Phone = r.Phone.Trim();
        p.Email = Clean(r.Email);
        p.Address = Clean(r.Address);
        p.EmergencyContactName = Clean(r.EmergencyContactName);
        p.EmergencyContactPhone = Clean(r.EmergencyContactPhone);
    }
}
