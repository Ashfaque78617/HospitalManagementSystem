namespace HospitalManagement.Api.Common;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Receptionist = "Receptionist";
    public const string BillingStaff = "Billing Staff";
    public const string Doctor = "Doctor";

    // Handy combinations for [Authorize(Roles = ...)]
    public const string AdminOrReceptionist = Admin + "," + Receptionist;
    public const string AdminOrBilling = Admin + "," + BillingStaff;
    public const string AdminReceptionistOrDoctor = Admin + "," + Receptionist + "," + Doctor;
}
