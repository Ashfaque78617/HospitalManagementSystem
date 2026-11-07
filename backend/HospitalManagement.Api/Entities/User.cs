using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Entities;

public class User : IAuditable
{
    public int UserId { get; set; }
    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;

    [MaxLength(100)] public string Username { get; set; } = string.Empty;
    [MaxLength(255)] public string PasswordHash { get; set; } = string.Empty;
    [MaxLength(150)] public string FullName { get; set; } = string.Empty;
    [MaxLength(150)] public string? Email { get; set; }
    [MaxLength(20)] public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime CreatedDate { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public int? ModifiedBy { get; set; }
}
