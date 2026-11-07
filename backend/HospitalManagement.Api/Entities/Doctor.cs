using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Entities;

public class Doctor : IAuditable
{
    public int DoctorId { get; set; }
    [MaxLength(30)] public string DoctorCode { get; set; } = string.Empty;
    [MaxLength(80)] public string FirstName { get; set; } = string.Empty;
    [MaxLength(80)] public string? LastName { get; set; }

    public int SpecializationId { get; set; }
    public Specialization Specialization { get; set; } = null!;

    /// <summary>Optional login account (role = Doctor) so a doctor only sees their own appointments.</summary>
    public int? UserId { get; set; }
    public User? User { get; set; }

    [MaxLength(200)] public string? Qualification { get; set; }
    [MaxLength(20)] public string? Phone { get; set; }
    [MaxLength(150)] public string? Email { get; set; }
    [Precision(18, 2)] public decimal ConsultationFee { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime CreatedDate { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public int? ModifiedBy { get; set; }

    public ICollection<DoctorSchedule> Schedules { get; set; } = new List<DoctorSchedule>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
