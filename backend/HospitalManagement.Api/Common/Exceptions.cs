namespace HospitalManagement.Api.Common;

/// <summary>A requested record does not exist (HTTP 404).</summary>
public class NotFoundException(string message) : Exception(message);

/// <summary>A business rule was violated, e.g. overlapping appointment (HTTP 400).</summary>
public class BusinessRuleException(string message) : Exception(message);
