using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Dtos;

public class UserRequest
{
    [Required, RegularExpression(@"^[A-Za-z0-9._-]{3,50}$", ErrorMessage = "Username: 3-50 letters, digits, . _ -")]
    public string Username { get; set; } = string.Empty;
    /// <summary>Required when creating a user; ignored on update (use reset-password).</summary>
    public string? Password { get; set; }
    [Required, StringLength(150)] public string FullName { get; set; } = string.Empty;
    [EmailAddress, StringLength(150)] public string? Email { get; set; }
    [RegularExpression(@"^[0-9+\-\s()]{7,20}$", ErrorMessage = "Enter a valid phone number.")] public string? Phone { get; set; }
    [Range(1, int.MaxValue, ErrorMessage = "Select a role.")] public int RoleId { get; set; }
}

public class ResetPasswordRequest
{
    [Required] public string NewPassword { get; set; } = string.Empty;
}

public record UserDto(int UserId, string Username, string FullName, string? Email, string? Phone, int RoleId, string RoleName, bool IsActive, DateTime CreatedDate);
public record RoleDto(int RoleId, string RoleName, int UserCount);

public class SpecializationRequest
{
    [Required, StringLength(100)] public string SpecializationName { get; set; } = string.Empty;
    [StringLength(500)] public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}
public record SpecializationDto(int SpecializationId, string SpecializationName, string? Description, bool IsActive, int DoctorCount);

public class AppointmentStatusRequest
{
    [Required, StringLength(50)] public string StatusName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
public record AppointmentStatusDto(int AppointmentStatusId, string StatusName, bool IsActive);

public record AuditLogDto(long AuditLogId, int? UserId, string? UserName, string Action, string? EntityName, string? EntityId, string? Description, DateTime CreatedDate, string? IpAddress);

public record SettingDto(string SettingKey, string? SettingValue, string? Description);
public class SettingsUpdateRequest
{
    [Required] public Dictionary<string, string?> Values { get; set; } = new();
}
