using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Entities;

public class Appointment : IAuditable
{
    public int AppointmentId { get; set; }
    [MaxLength(30)] public string AppointmentNo { get; set; } = string.Empty;

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public int DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;

    public int AppointmentStatusId { get; set; }
    public AppointmentStatus Status { get; set; } = null!;

    public DateOnly AppointmentDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    [MaxLength(500)] public string? Reason { get; set; }
    [MaxLength(1000)] public string? Notes { get; set; }

    public DateTime CreatedDate { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public int? ModifiedBy { get; set; }
}
