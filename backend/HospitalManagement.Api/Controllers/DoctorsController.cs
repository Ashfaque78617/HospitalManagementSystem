using HospitalManagement.Api.Common;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.Api.Controllers;

[ApiController, Authorize]
[Route("api/doctors")]
public class DoctorsController(DoctorService doctors) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<DoctorDto>> Search([FromQuery] string? search, [FromQuery] int? specializationId, [FromQuery] bool? isActive, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        => doctors.SearchAsync(search, specializationId, isActive, page, pageSize);

    [HttpGet("lookup")]
    public Task<IReadOnlyList<DoctorLookupDto>> Lookup() => doctors.LookupAsync();

    [HttpGet("{id:int}")]
    public Task<DoctorDto> Get(int id) => doctors.GetAsync(id);

    [HttpGet("{id:int}/details")]
    public Task<DoctorDetailsDto> Details(int id) => doctors.GetDetailsAsync(id);

    [HttpPost, Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<DoctorDto>> Create(DoctorRequest request)
    {
        var created = await doctors.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id = created.DoctorId }, created);
    }

    [HttpPut("{id:int}"), Authorize(Roles = AppRoles.Admin)]
    public Task<DoctorDto> Update(int id, DoctorRequest request) => doctors.UpdateAsync(id, request);

    [HttpPatch("{id:int}/status"), Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> SetStatus(int id, ActiveStatusRequest request)
    {
        await doctors.SetActiveAsync(id, request.IsActive);
        return NoContent();
    }

    [HttpGet("{id:int}/schedules")]
    public Task<IReadOnlyList<ScheduleDto>> GetSchedules(int id) => doctors.GetSchedulesAsync(id);

    [HttpPut("{id:int}/schedules"), Authorize(Roles = AppRoles.Admin)]
    public Task<IReadOnlyList<ScheduleDto>> SaveSchedules(int id, List<ScheduleRequest> schedules) => doctors.SaveSchedulesAsync(id, schedules);
}
