using System.Linq.Expressions;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Entities;

namespace HospitalManagement.Api.Services;

/// <summary>Reusable EF-translatable projections so list/detail queries stay consistent.</summary>
public static class Projections
{
    public static readonly Expression<Func<Appointment, AppointmentDto>> Appointment = a => new AppointmentDto(
        a.AppointmentId, a.AppointmentNo, a.PatientId,
        (a.Patient.FirstName + " " + (a.Patient.LastName ?? "")).Trim(), a.Patient.PatientCode,
        a.DoctorId, "Dr. " + (a.Doctor.FirstName + " " + (a.Doctor.LastName ?? "")).Trim(),
        a.Doctor.Specialization.SpecializationName,
        a.AppointmentStatusId, a.Status.StatusName,
        a.AppointmentDate, a.StartTime, a.EndTime, a.Reason, a.Notes, a.Doctor.ConsultationFee);

    public static readonly Expression<Func<Invoice, InvoiceListDto>> InvoiceList = i => new InvoiceListDto(
        i.InvoiceId, i.InvoiceNo, i.PatientId,
        (i.Patient.FirstName + " " + (i.Patient.LastName ?? "")).Trim(), i.Patient.PatientCode,
        i.InvoiceDate, i.GrandTotal,
        i.Payments.Where(p => p.PaymentStatus == PaymentStatuses.Completed).Sum(p => p.Amount),
        i.Status == InvoiceStatuses.Cancelled
            ? 0
            : i.GrandTotal - i.Payments.Where(p => p.PaymentStatus == PaymentStatuses.Completed).Sum(p => p.Amount),
        i.Status);
}
