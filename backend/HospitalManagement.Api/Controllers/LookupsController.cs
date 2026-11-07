using HospitalManagement.Api.Common;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.Api.Controllers;

/// <summary>Read-only reference data for dropdowns, available to every signed-in user. Also hosts public settings.</summary>
[ApiController, Authorize]
[Route("api")]
public class LookupsController(LookupService lookups, SettingsService settings) : ControllerBase
{
    [HttpGet("lookups/specializations")]
    public Task<IReadOnlyList<SpecializationDto>> Specializations() => lookups.GetSpecializationsAsync(true);

    [HttpGet("lookups/appointment-statuses")]
    public Task<IReadOnlyList<AppointmentStatusDto>> Statuses() => lookups.GetStatusesAsync();

    [HttpGet("lookups/roles"), Authorize(Roles = AppRoles.Admin)]
    public Task<IReadOnlyList<RoleDto>> Roles() => lookups.GetRolesAsync();

    [HttpGet("settings")]
    public Task<IReadOnlyList<SettingDto>> GetSettings() => settings.GetAllAsync();

    [HttpPut("settings"), Authorize(Roles = AppRoles.Admin)]
    public Task<IReadOnlyList<SettingDto>> UpdateSettings(SettingsUpdateRequest request) => settings.UpdateAsync(request.Values);

    /// <summary>Branding for the login page (no sign-in needed).</summary>
    [AllowAnonymous, HttpGet("public/branding")]
    public async Task<object> Branding()
    {
        var all = await settings.GetAllAsync();
        return new { hospitalName = all.FirstOrDefault(s => s.SettingKey == "HospitalName")?.SettingValue ?? "Hospital" };
    }
}
