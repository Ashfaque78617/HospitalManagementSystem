using HospitalManagement.Api.Common;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.Api.Controllers;

[ApiController, Authorize]
[Route("api/patients")]
public class PatientsController(PatientService patients) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<PatientDto>> Search([FromQuery] string? search, [FromQuery] bool? isActive, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        => patients.SearchAsync(search, isActive, page, pageSize);

    [HttpGet("lookup")]
    public Task<IReadOnlyList<PatientLookupDto>> Lookup([FromQuery] string? search) => patients.LookupAsync(search);

    [HttpGet("{id:int}")]
    public Task<PatientDto> Get(int id) => patients.GetAsync(id);

    [HttpGet("{id:int}/details")]
    public Task<PatientDetailsDto> Details(int id) => patients.GetDetailsAsync(id);

    [HttpGet("{id:int}/history")]
    public Task<IReadOnlyList<HistoryItemDto>> History(int id) => patients.GetHistoryAsync(id);

    [HttpPost, Authorize(Roles = AppRoles.AdminOrReceptionist)]
    public async Task<ActionResult<PatientDto>> Create(PatientRequest request)
    {
        var created = await patients.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id = created.PatientId }, created);
    }

    [HttpPut("{id:int}"), Authorize(Roles = AppRoles.AdminOrReceptionist)]
    public Task<PatientDto> Update(int id, PatientRequest request) => patients.UpdateAsync(id, request);

    [HttpPatch("{id:int}/status"), Authorize(Roles = AppRoles.AdminOrReceptionist)]
    public async Task<IActionResult> SetStatus(int id, ActiveStatusRequest request)
    {
        await patients.SetActiveAsync(id, request.IsActive);
        return NoContent();
    }
}
