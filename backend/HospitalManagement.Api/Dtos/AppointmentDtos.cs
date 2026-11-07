using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Dtos;

public class AppointmentRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Select a patient.")] public int PatientId { get; set; }
    [Range(1, int.MaxValue, ErrorMessage = "Select a doctor.")] public int DoctorId { get; set; }
    public DateOnly AppointmentDate { get; set; }
    public TimeOnly StartTime { get; set; }
    [StringLength(500)] public string? Reason { get; set; }
    [StringLength(1000)] public string? Notes { get; set; }
}

public class AppointmentStatusChangeRequest
{
    [Required] public string StatusName { get; set; } = string.Empty;
}

public record AppointmentDto(
    int AppointmentId, string AppointmentNo, int PatientId, string PatientName, string PatientCode,
    int DoctorId, string DoctorName, string Specialization, int AppointmentStatusId, string Status,
    DateOnly AppointmentDate, TimeOnly StartTime, TimeOnly EndTime, string? Reason, string? Notes, decimal ConsultationFee);

public record SlotDto(TimeOnly StartTime, TimeOnly EndTime, bool IsAvailable);
