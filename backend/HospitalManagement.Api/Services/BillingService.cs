using System.Data;
using HospitalManagement.Api.Common;
using HospitalManagement.Api.Data;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Services;

public class BillingService(AppDbContext db, IAuditService audit, ICurrentUser currentUser)
{
    public async Task<PagedResult<InvoiceListDto>> ListAsync(string? search, string? status, DateOnly? from, DateOnly? to, int? patientId, int page, int pageSize)
    {
        var q = db.Invoices.AsNoTracking().AsQueryable();
        if (patientId.HasValue) q = q.Where(i => i.PatientId == patientId);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(i => i.Status == status);
        if (from.HasValue) { var f = from.Value.ToDateTime(TimeOnly.MinValue).ToUniversalTime(); q = q.Where(i => i.InvoiceDate >= f); }
        if (to.HasValue) { var t = to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue).ToUniversalTime(); q = q.Where(i => i.InvoiceDate < t); }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(i => i.InvoiceNo.Contains(s) || i.Patient.PatientCode.Contains(s) ||
                             (i.Patient.FirstName + " " + (i.Patient.LastName ?? "")).Contains(s));
        }
        return await q.OrderByDescending(i => i.InvoiceId).Select(Projections.InvoiceList).ToPagedAsync(page, pageSize);
    }

    public async Task<InvoiceDetailDto> GetAsync(int id)
    {
        var i = await db.Invoices.AsNoTracking()
                    .Include(x => x.Patient).Include(x => x.Appointment)
                    .Include(x => x.Items).Include(x => x.Payments).ThenInclude(p => p.ReceivedByUser)
                    .FirstOrDefaultAsync(x => x.InvoiceId == id)
                ?? throw new NotFoundException($"Invoice #{id} was not found.");

        var paid = i.Payments.Where(p => p.PaymentStatus == PaymentStatuses.Completed).Sum(p => p.Amount);
        var balance = i.Status == InvoiceStatuses.Cancelled ? 0 : i.GrandTotal - paid;

        return new InvoiceDetailDto(
            i.InvoiceId, i.InvoiceNo, i.InvoiceDate, i.Status,
            i.PatientId, $"{i.Patient.FirstName} {i.Patient.LastName}".Trim(), i.Patient.PatientCode, i.Patient.Phone, i.Patient.Address,
            i.AppointmentId, i.Appointment?.AppointmentNo,
            i.SubTotal, i.DiscountAmount, i.TaxAmount, i.GrandTotal, paid, balance,
            i.Items.OrderBy(x => x.InvoiceItemId)
                .Select(x => new InvoiceItemDto(x.InvoiceItemId, x.ItemDescription, x.Quantity, x.UnitPrice, x.DiscountAmount, x.TaxAmount, x.LineTotal)).ToList(),
            i.Payments.OrderBy(p => p.PaymentDate)
                .Select(p => new PaymentDto(p.PaymentId, p.PaymentDate, p.Amount, p.PaymentMethod, p.TransactionReference, p.PaymentStatus, p.ReceivedByUser?.FullName, p.Remarks)).ToList());
    }

    public async Task<InvoiceDetailDto> CreateAsync(InvoiceRequest r)
    {
        var patient = await db.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.PatientId == r.PatientId)
                      ?? throw new BusinessRuleException("The selected patient does not exist.");
        if (!patient.IsActive) throw new BusinessRuleException("Inactive patients cannot be billed.");

        if (r.AppointmentId.HasValue)
        {
            var appt = await db.Appointments.AsNoTracking().FirstOrDefaultAsync(a => a.AppointmentId == r.AppointmentId)
                       ?? throw new BusinessRuleException("The selected appointment does not exist.");
            if (appt.PatientId != r.PatientId)
                throw new BusinessRuleException("The appointment belongs to a different patient.");
            if (await db.Invoices.AnyAsync(i => i.AppointmentId == r.AppointmentId && i.Status != InvoiceStatuses.Cancelled))
                throw new BusinessRuleException("An active invoice already exists for this appointment.");
        }

        var items = new List<InvoiceItem>();
        foreach (var line in r.Items)
        {
            var gross = decimal.Round(line.Quantity * line.UnitPrice, 2);
            var total = gross - line.DiscountAmount + line.TaxAmount;
            if (total < 0) throw new BusinessRuleException($"The discount on '{line.ItemDescription}' is larger than the line amount.");
            items.Add(new InvoiceItem
            {
                ItemDescription = line.ItemDescription.Trim(), Quantity = line.Quantity, UnitPrice = line.UnitPrice,
                DiscountAmount = line.DiscountAmount, TaxAmount = line.TaxAmount, LineTotal = total
            });
        }

        var subTotal = items.Sum(x => decimal.Round(x.Quantity * x.UnitPrice, 2));
        var discount = items.Sum(x => x.DiscountAmount) + r.AdditionalDiscount;
        var tax = items.Sum(x => x.TaxAmount);
        var grand = subTotal - discount + tax; // GrandTotal = SubTotal - DiscountAmount + TaxAmount
        if (grand < 0) throw new BusinessRuleException("The total discount cannot exceed the invoice amount.");

        var invoice = new Invoice
        {
            InvoiceNo = Guid.NewGuid().ToString("N")[..20], PatientId = r.PatientId, AppointmentId = r.AppointmentId,
            InvoiceDate = DateTime.UtcNow, SubTotal = subTotal, DiscountAmount = discount, TaxAmount = tax, GrandTotal = grand,
            Status = grand == 0 ? InvoiceStatuses.Paid : InvoiceStatuses.Unpaid, Items = items
        };

        var prefix = await db.SystemSettings.Where(s => s.SettingKey == "InvoicePrefix").Select(s => s.SettingValue).FirstOrDefaultAsync();
        prefix = string.IsNullOrWhiteSpace(prefix) ? "INV" : prefix.Trim();

        await using var tx = await db.Database.BeginTransactionAsync();
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        invoice.InvoiceNo = $"{prefix}-{invoice.InvoiceId:D6}";
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("Create", nameof(Invoice), invoice.InvoiceId, $"Created invoice {invoice.InvoiceNo} for {grand:0.00}.");
        return await GetAsync(invoice.InvoiceId);
    }

    public async Task<InvoiceDetailDto> CancelAsync(int id)
    {
        var invoice = await db.Invoices.Include(i => i.Payments).FirstOrDefaultAsync(i => i.InvoiceId == id)
                      ?? throw new NotFoundException($"Invoice #{id} was not found.");
        if (invoice.Status == InvoiceStatuses.Cancelled) throw new BusinessRuleException("This invoice is already cancelled.");
        if (invoice.Payments.Any(p => p.PaymentStatus == PaymentStatuses.Completed))
            throw new BusinessRuleException("An invoice with payments cannot be cancelled.");

        invoice.Status = InvoiceStatuses.Cancelled;
        await db.SaveChangesAsync();
        await audit.LogAsync("Cancel", nameof(Invoice), id, $"Cancelled invoice {invoice.InvoiceNo}.");
        return await GetAsync(id);
    }

    public async Task<InvoiceDetailDto> AddPaymentAsync(PaymentRequest r)
    {
        if (!PaymentMethods.All.Contains(r.PaymentMethod))
            throw new BusinessRuleException($"Payment method must be one of: {string.Join(", ", PaymentMethods.All)}.");

        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var invoice = await db.Invoices.Include(i => i.Payments).FirstOrDefaultAsync(i => i.InvoiceId == r.InvoiceId)
                      ?? throw new NotFoundException($"Invoice #{r.InvoiceId} was not found.");
        if (invoice.Status == InvoiceStatuses.Cancelled) throw new BusinessRuleException("Payments cannot be recorded on a cancelled invoice.");

        var paid = invoice.Payments.Where(p => p.PaymentStatus == PaymentStatuses.Completed).Sum(p => p.Amount);
        var balance = invoice.GrandTotal - paid;
        if (balance <= 0) throw new BusinessRuleException("This invoice is already fully paid.");
        if (r.Amount > balance) throw new BusinessRuleException($"The amount exceeds the outstanding balance of {balance:0.00}.");

        invoice.Payments.Add(new Payment
        {
            Amount = r.Amount, PaymentMethod = r.PaymentMethod, PaymentDate = DateTime.UtcNow,
            TransactionReference = string.IsNullOrWhiteSpace(r.TransactionReference) ? null : r.TransactionReference.Trim(),
            Remarks = string.IsNullOrWhiteSpace(r.Remarks) ? null : r.Remarks.Trim(),
            PaymentStatus = PaymentStatuses.Completed, ReceivedBy = currentUser.UserId
        });
        invoice.Status = paid + r.Amount >= invoice.GrandTotal ? InvoiceStatuses.Paid : InvoiceStatuses.PartiallyPaid;

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("Payment", nameof(Invoice), invoice.InvoiceId, $"Received {r.Amount:0.00} via {r.PaymentMethod} on {invoice.InvoiceNo}.");
        return await GetAsync(invoice.InvoiceId);
    }

    public async Task<BillingReportDto> GetReportAsync(DateOnly from, DateOnly to, string groupBy)
    {
        if (to < from) throw new BusinessRuleException("The end date must be on or after the start date.");
        var f = from.ToDateTime(TimeOnly.MinValue).ToUniversalTime();
        var t = to.AddDays(1).ToDateTime(TimeOnly.MinValue).ToUniversalTime();
        var monthly = string.Equals(groupBy, "month", StringComparison.OrdinalIgnoreCase);

        var invoices = await db.Invoices.AsNoTracking()
            .Where(i => i.Status != InvoiceStatuses.Cancelled && i.InvoiceDate >= f && i.InvoiceDate < t)
            .Select(i => new { i.InvoiceDate, i.GrandTotal }).ToListAsync();
        var payments = await db.Payments.AsNoTracking()
            .Where(p => p.PaymentStatus == PaymentStatuses.Completed && p.PaymentDate >= f && p.PaymentDate < t)
            .Select(p => new { p.PaymentDate, p.Amount }).ToListAsync();

        string Key(DateTime utc)
        {
            var local = utc.ToLocalTime();
            return monthly ? local.ToString("yyyy-MM") : local.ToString("yyyy-MM-dd");
        }

        var invByKey = invoices.GroupBy(i => Key(i.InvoiceDate)).ToDictionary(g => g.Key, g => (Count: g.Count(), Sum: g.Sum(x => x.GrandTotal)));
        var payByKey = payments.GroupBy(p => Key(p.PaymentDate)).ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        var rows = invByKey.Keys.Union(payByKey.Keys).OrderByDescending(k => k)
            .Select(k => new ReportRowDto(k,
                invByKey.TryGetValue(k, out var iv) ? iv.Count : 0,
                invByKey.TryGetValue(k, out iv) ? iv.Sum : 0,
                payByKey.GetValueOrDefault(k)))
            .ToList();

        var openInvoices = await db.Invoices.AsNoTracking()
    .Where(i => i.Status == InvoiceStatuses.Unpaid || i.Status == InvoiceStatuses.PartiallyPaid)
    .Select(Projections.InvoiceList)
    .ToListAsync();
        var outstanding = openInvoices.OrderByDescending(i => i.Balance).Take(10).ToList();
        var outstandingTotal = openInvoices.Sum(i => i.Balance);

        return new BillingReportDto(rows, rows.Sum(x => x.Invoiced), rows.Sum(x => x.Collected), outstandingTotal, outstanding);
    }
}
