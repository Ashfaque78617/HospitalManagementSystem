using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Entities;

public class Invoice : IAuditable
{
    public int InvoiceId { get; set; }
    [MaxLength(30)] public string InvoiceNo { get; set; } = string.Empty;

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public DateTime InvoiceDate { get; set; }

    // Snapshot of the billed amounts (an issued invoice must never change if prices change later).
    // Paid amount and balance are NOT stored - they are always derived from Payments.
    [Precision(18, 2)] public decimal SubTotal { get; set; }
    [Precision(18, 2)] public decimal DiscountAmount { get; set; }
    [Precision(18, 2)] public decimal TaxAmount { get; set; }
    [Precision(18, 2)] public decimal GrandTotal { get; set; }

    [MaxLength(30)] public string Status { get; set; } = InvoiceStatuses.Unpaid;

    public DateTime CreatedDate { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public int? ModifiedBy { get; set; }

    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public static class InvoiceStatuses
{
    public const string Unpaid = "Unpaid";
    public const string PartiallyPaid = "Partially Paid";
    public const string Paid = "Paid";
    public const string Cancelled = "Cancelled";
}
