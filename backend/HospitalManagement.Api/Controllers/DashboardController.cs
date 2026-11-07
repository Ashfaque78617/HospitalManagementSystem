using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.Api.Controllers;

[ApiController, Authorize]
[Route("api/dashboard")]
public class DashboardController(DashboardService dashboard) : ControllerBase
{
    [HttpGet]
    public Task<DashboardDto> Get() => dashboard.GetAsync();
}
