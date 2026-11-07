using HospitalManagement.Api.Common;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Entities;
using HospitalManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.Api.Controllers;

[ApiController, Authorize(Roles = AppRoles.AdminOrBilling)]
[Route("api/billing")]
public class BillingController(BillingService billing) : ControllerBase
{
    [HttpGet("invoices")]
    public Task<PagedResult<InvoiceListDto>> Invoices([FromQuery] string? search, [FromQuery] string? status, [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to, [FromQuery] int? patientId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        => billing.ListAsync(search, status, from, to, patientId, page, pageSize);

    [HttpGet("invoices/{id:int}")]
    public Task<InvoiceDetailDto> Invoice(int id) => billing.GetAsync(id);

    [HttpPost("invoices")]
    public async Task<ActionResult<InvoiceDetailDto>> CreateInvoice(InvoiceRequest request)
    {
        var created = await billing.CreateAsync(request);
        return CreatedAtAction(nameof(Invoice), new { id = created.InvoiceId }, created);
    }

    [HttpPost("invoices/{id:int}/cancel")]
    public Task<InvoiceDetailDto> Cancel(int id) => billing.CancelAsync(id);

    [HttpPost("payments")]
    public Task<InvoiceDetailDto> AddPayment(PaymentRequest request) => billing.AddPaymentAsync(request);

    [HttpGet("payment-methods")]
    public string[] PaymentMethodList() => PaymentMethods.All;

    [HttpGet("reports")]
    public Task<BillingReportDto> Report([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string groupBy = "day")
    {
        var end = to ?? DateOnly.FromDateTime(DateTime.Today);
        var start = from ?? end.AddDays(-29);
        return billing.GetReportAsync(start, end, groupBy);
    }
}
