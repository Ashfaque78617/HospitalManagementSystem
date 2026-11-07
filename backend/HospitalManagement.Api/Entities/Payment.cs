using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Entities;

public class Payment
{
    public int PaymentId { get; set; }
    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public DateTime PaymentDate { get; set; }
    [Precision(18, 2)] public decimal Amount { get; set; }
    [MaxLength(30)] public string PaymentMethod { get; set; } = string.Empty;
    [MaxLength(100)] public string? TransactionReference { get; set; }
    [MaxLength(30)] public string PaymentStatus { get; set; } = PaymentStatuses.Completed;

    public int? ReceivedBy { get; set; }
    public User? ReceivedByUser { get; set; }

    [MaxLength(500)] public string? Remarks { get; set; }
}

public static class PaymentStatuses
{
    public const string Completed = "Completed";
}

public static class PaymentMethods
{
    public static readonly string[] All = ["Cash", "Card", "UPI", "Online"];
}
