using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Entities;

public class Role
{
    public int RoleId { get; set; }

    [MaxLength(50)]
    public string RoleName { get; set; } = string.Empty;

    public ICollection<User> Users { get; set; } = new List<User>();
}
