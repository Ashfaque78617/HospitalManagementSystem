using HospitalManagement.Api.Common;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.Api.Controllers;

[ApiController, Authorize(Roles = AppRoles.Admin + "," + AppRoles.Receptionist + "," + AppRoles.Doctor)]
[Route("api/appointments")]
public class AppointmentsController(AppointmentService appointments) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<AppointmentDto>> List([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] int? doctorId,
        [FromQuery] int? patientId, [FromQuery] int? statusId, [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        => appointments.ListAsync(from, to, doctorId, patientId, statusId, search, page, pageSize);

    [HttpGet("slots")]
    public Task<IReadOnlyList<SlotDto>> Slots([FromQuery] int doctorId, [FromQuery] DateOnly date, [FromQuery] int excludeAppointmentId = 0)
        => appointments.GetSlotsAsync(doctorId, date, excludeAppointmentId);

    [HttpGet("{id:int}")]
    public Task<AppointmentDto> Get(int id) => appointments.GetAsync(id);

    [HttpPost, Authorize(Roles = AppRoles.AdminOrReceptionist)]
    public async Task<ActionResult<AppointmentDto>> Create(AppointmentRequest request)
    {
        var created = await appointments.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id = created.AppointmentId }, created);
    }

    [HttpPut("{id:int}"), Authorize(Roles = AppRoles.AdminOrReceptionist)]
    public Task<AppointmentDto> Reschedule(int id, AppointmentRequest request) => appointments.RescheduleAsync(id, request);

    [HttpPost("{id:int}/status")]
    public Task<AppointmentDto> ChangeStatus(int id, AppointmentStatusChangeRequest request) => appointments.ChangeStatusAsync(id, request.StatusName);
}
