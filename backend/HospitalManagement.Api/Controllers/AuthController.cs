using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth, ICurrentUser currentUser) : ControllerBase
{
    [AllowAnonymous, HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request) => await auth.LoginAsync(request);

    [Authorize, HttpGet("me")]
    public async Task<ActionResult<UserInfo>> Me() => await auth.GetProfileAsync(currentUser.UserId ?? 0);
}
