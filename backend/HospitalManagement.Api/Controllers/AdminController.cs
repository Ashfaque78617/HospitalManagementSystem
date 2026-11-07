using HospitalManagement.Api.Common;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.Api.Controllers;

[ApiController, Authorize(Roles = AppRoles.Admin)]
[Route("api/admin")]
public class AdminController(UserService users, LookupService lookups, IAuditService audit) : ControllerBase
{
    // ---- Users ----
    [HttpGet("users")]
    public Task<PagedResult<UserDto>> Users([FromQuery] string? search, [FromQuery] int? roleId, [FromQuery] bool? isActive, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        => users.ListAsync(search, roleId, isActive, page, pageSize);

    [HttpPost("users")]
    public Task<UserDto> CreateUser(UserRequest request) => users.CreateAsync(request);

    [HttpPut("users/{id:int}")]
    public Task<UserDto> UpdateUser(int id, UserRequest request) => users.UpdateAsync(id, request);

    [HttpPatch("users/{id:int}/status")]
    public async Task<IActionResult> SetUserStatus(int id, ActiveStatusRequest request)
    {
        await users.SetActiveAsync(id, request.IsActive);
        return NoContent();
    }

    [HttpPost("users/{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, ResetPasswordRequest request)
    {
        await users.ResetPasswordAsync(id, request.NewPassword);
        return NoContent();
    }

    // ---- Roles (fixed set; read-only) ----
    [HttpGet("roles")]
    public Task<IReadOnlyList<RoleDto>> Roles() => lookups.GetRolesAsync();

    // ---- Specializations ----
    [HttpGet("specializations")]
    public Task<IReadOnlyList<SpecializationDto>> Specializations() => lookups.GetSpecializationsAsync(false);

    [HttpPost("specializations")]
    public Task<SpecializationDto> CreateSpecialization(SpecializationRequest request) => lookups.SaveSpecializationAsync(null, request);

    [HttpPut("specializations/{id:int}")]
    public Task<SpecializationDto> UpdateSpecialization(int id, SpecializationRequest request) => lookups.SaveSpecializationAsync(id, request);

    // ---- Appointment statuses ----
    [HttpGet("appointment-statuses")]
    public Task<IReadOnlyList<AppointmentStatusDto>> Statuses() => lookups.GetStatusesAsync();

    [HttpPost("appointment-statuses")]
    public Task<AppointmentStatusDto> CreateStatus(AppointmentStatusRequest request) => lookups.SaveStatusAsync(null, request);

    [HttpPut("appointment-statuses/{id:int}")]
    public Task<AppointmentStatusDto> UpdateStatus(int id, AppointmentStatusRequest request) => lookups.SaveStatusAsync(id, request);

    // ---- Audit logs ----
    [HttpGet("audit-logs")]
    public Task<PagedResult<AuditLogDto>> AuditLogs([FromQuery] string? search, [FromQuery] string? action, [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => audit.QueryAsync(search, action, from, to, page, pageSize);

    [HttpGet("audit-logs/actions")]
    public Task<IReadOnlyList<string>> AuditActions() => audit.GetActionsAsync();
}
