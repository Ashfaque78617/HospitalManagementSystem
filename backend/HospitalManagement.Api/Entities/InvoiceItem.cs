using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Entities;

public class InvoiceItem
{
    public int InvoiceItemId { get; set; }
    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    [MaxLength(250)] public string ItemDescription { get; set; } = string.Empty;
    [Precision(10, 2)] public decimal Quantity { get; set; }
    [Precision(18, 2)] public decimal UnitPrice { get; set; }
    [Precision(18, 2)] public decimal DiscountAmount { get; set; }
    [Precision(18, 2)] public decimal TaxAmount { get; set; }
    [Precision(18, 2)] public decimal LineTotal { get; set; }
}
