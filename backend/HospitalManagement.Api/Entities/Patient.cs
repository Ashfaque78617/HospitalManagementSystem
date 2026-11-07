using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Entities;

public class Patient : IAuditable
{
    public int PatientId { get; set; }
    [MaxLength(30)] public string PatientCode { get; set; } = string.Empty;
    [MaxLength(80)] public string FirstName { get; set; } = string.Empty;
    [MaxLength(80)] public string? LastName { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    [MaxLength(20)] public string? Gender { get; set; }
    [MaxLength(5)] public string? BloodGroup { get; set; }
    [MaxLength(20)] public string Phone { get; set; } = string.Empty;
    [MaxLength(150)] public string? Email { get; set; }
    [MaxLength(500)] public string? Address { get; set; }
    [MaxLength(150)] public string? EmergencyContactName { get; set; }
    [MaxLength(20)] public string? EmergencyContactPhone { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime CreatedDate { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public int? ModifiedBy { get; set; }

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}
