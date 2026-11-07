using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Dtos;

public class InvoiceItemRequest
{
    [Required, StringLength(250)] public string ItemDescription { get; set; } = string.Empty;
    [Range(0.01, 100000)] public decimal Quantity { get; set; } = 1;
    [Range(0, 10000000)] public decimal UnitPrice { get; set; }
    [Range(0, 10000000)] public decimal DiscountAmount { get; set; }
    [Range(0, 10000000)] public decimal TaxAmount { get; set; }
}

public class InvoiceRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Select a patient.")] public int PatientId { get; set; }
    public int? AppointmentId { get; set; }
    [Range(0, 10000000)] public decimal AdditionalDiscount { get; set; }
    [Required, MinLength(1, ErrorMessage = "Add at least one line item.")]
    public List<InvoiceItemRequest> Items { get; set; } = new();
}

public class PaymentRequest
{
    [Range(1, int.MaxValue)] public int InvoiceId { get; set; }
    [Range(0.01, 10000000, ErrorMessage = "Amount must be greater than zero.")] public decimal Amount { get; set; }
    [Required] public string PaymentMethod { get; set; } = string.Empty;
    [StringLength(100)] public string? TransactionReference { get; set; }
    [StringLength(500)] public string? Remarks { get; set; }
}

public record InvoiceListDto(
    int InvoiceId, string InvoiceNo, int PatientId, string PatientName, string PatientCode,
    DateTime InvoiceDate, decimal GrandTotal, decimal PaidAmount, decimal Balance, string Status);

public record InvoiceItemDto(int InvoiceItemId, string ItemDescription, decimal Quantity, decimal UnitPrice, decimal DiscountAmount, decimal TaxAmount, decimal LineTotal);

public record PaymentDto(int PaymentId, DateTime PaymentDate, decimal Amount, string PaymentMethod, string? TransactionReference, string PaymentStatus, string? ReceivedBy, string? Remarks);

public record InvoiceDetailDto(
    int InvoiceId, string InvoiceNo, DateTime InvoiceDate, string Status,
    int PatientId, string PatientName, string PatientCode, string PatientPhone, string? PatientAddress,
    int? AppointmentId, string? AppointmentNo,
    decimal SubTotal, decimal DiscountAmount, decimal TaxAmount, decimal GrandTotal, decimal PaidAmount, decimal Balance,
    IReadOnlyList<InvoiceItemDto> Items, IReadOnlyList<PaymentDto> Payments);

public record ReportRowDto(string Period, int InvoiceCount, decimal Invoiced, decimal Collected);

public record BillingReportDto(
    IReadOnlyList<ReportRowDto> Rows, decimal TotalInvoiced, decimal TotalCollected, decimal OutstandingTotal,
    IReadOnlyList<InvoiceListDto> OutstandingInvoices);
