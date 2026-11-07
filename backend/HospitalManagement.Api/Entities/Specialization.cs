using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Entities;

public class Specialization
{
    public int SpecializationId { get; set; }
    [MaxLength(100)] public string SpecializationName { get; set; } = string.Empty;
    [MaxLength(500)] public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Doctor> Doctors { get; set; } = new List<Doctor>();
}
