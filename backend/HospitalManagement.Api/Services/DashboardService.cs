using HospitalManagement.Api.Common;
using HospitalManagement.Api.Data;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Services;

public class DashboardService(AppDbContext db, ICurrentUser currentUser, AppointmentService appointments)
{
    private static readonly string[] Pending = [StatusNames.Scheduled, StatusNames.CheckedIn, StatusNames.Waiting];

    public async Task<DashboardDto> GetAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var own = await appointments.GetOwnDoctorIdAsync();
        var showBilling = currentUser.IsInRole(AppRoles.Admin) || currentUser.IsInRole(AppRoles.BillingStaff);

        var todayAppts = db.Appointments.AsNoTracking().Where(a => a.AppointmentDate == today);
        if (own.HasValue) todayAppts = todayAppts.Where(a => a.DoctorId == own.Value);

        var totalPatients = await db.Patients.CountAsync(p => p.IsActive);
        var totalDoctors = await db.Doctors.CountAsync(d => d.IsActive);
        var todayCount = await todayAppts.CountAsync();
        var pending = await todayAppts.CountAsync(a => Pending.Contains(a.Status.StatusName));
        var schedule = await todayAppts.OrderBy(a => a.StartTime).Take(8).Select(Projections.Appointment).ToListAsync();
        var byStatus = (await todayAppts.GroupBy(a => a.Status.StatusName).Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync())
            .Select(x => new StatusCountDto(x.Status, x.Count)).ToList();

        int todaysInvoices = 0;
        decimal todaysCollections = 0, outstanding = 0;
        var collections = new List<CollectionPointDto>();

        if (showBilling)
        {
            var startUtc = DateTime.Today.ToUniversalTime();
            var endUtc = startUtc.AddDays(1);
            todaysInvoices = await db.Invoices.CountAsync(i => i.Status != InvoiceStatuses.Cancelled && i.InvoiceDate >= startUtc && i.InvoiceDate < endUtc);
            todaysCollections = await db.Payments.Where(p => p.PaymentStatus == PaymentStatuses.Completed && p.PaymentDate >= startUtc && p.PaymentDate < endUtc)
                .SumAsync(p => (decimal?)p.Amount) ?? 0;
            var openTotal = await db.Invoices
     .Where(i => i.Status == InvoiceStatuses.Unpaid || i.Status == InvoiceStatuses.PartiallyPaid)
     .SumAsync(i => (decimal?)i.GrandTotal) ?? 0;
            var openPaid = await db.Payments
                .Where(p => p.PaymentStatus == PaymentStatuses.Completed &&
                            (p.Invoice.Status == InvoiceStatuses.Unpaid || p.Invoice.Status == InvoiceStatuses.PartiallyPaid))
                .SumAsync(p => (decimal?)p.Amount) ?? 0;
            outstanding = openTotal - openPaid;
            var weekStart = DateTime.Today.AddDays(-6).ToUniversalTime();
            var recent = await db.Payments.AsNoTracking()
                .Where(p => p.PaymentStatus == PaymentStatuses.Completed && p.PaymentDate >= weekStart)
                .Select(p => new { p.PaymentDate, p.Amount }).ToListAsync();
            for (var d = 6; d >= 0; d--)
            {
                var day = DateTime.Today.AddDays(-d);
                collections.Add(new CollectionPointDto(day.ToString("ddd"), recent.Where(p => p.PaymentDate.ToLocalTime().Date == day).Sum(p => p.Amount)));
            }
        }

        return new DashboardDto(totalPatients, totalDoctors, todayCount, pending, todaysInvoices, todaysCollections, outstanding,
            showBilling, schedule, collections, byStatus);
    }
}
