using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Dtos;

public class LoginRequest
{
    [Required, StringLength(100)] public string Username { get; set; } = string.Empty;
    [Required, StringLength(100)] public string Password { get; set; } = string.Empty;
}

public record UserInfo(int UserId, string Username, string FullName, string Role);
public record LoginResponse(string Token, DateTime ExpiresAt, UserInfo User);
