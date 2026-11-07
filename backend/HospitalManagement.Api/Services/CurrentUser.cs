using System.Security.Claims;

namespace HospitalManagement.Api.Services;

public interface ICurrentUser
{
    int? UserId { get; }
    string? Role { get; }
    string? IpAddress { get; }
    bool IsInRole(string role);
}

public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public int? UserId => int.TryParse(Principal?.FindFirst("sub")?.Value, out var id) ? id : null;
    public string? Role => Principal?.FindFirst("role")?.Value;
    public string? IpAddress => accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
    public bool IsInRole(string role) => string.Equals(Role, role, StringComparison.OrdinalIgnoreCase);
}
