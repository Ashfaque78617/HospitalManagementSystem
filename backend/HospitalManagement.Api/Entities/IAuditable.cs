namespace HospitalManagement.Api.Entities;

/// <summary>Entities implementing this get CreatedDate/By and ModifiedDate/By stamped automatically.</summary>
public interface IAuditable
{
    DateTime CreatedDate { get; set; }
    int? CreatedBy { get; set; }
    DateTime? ModifiedDate { get; set; }
    int? ModifiedBy { get; set; }
}
