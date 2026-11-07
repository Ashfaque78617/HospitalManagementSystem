using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.Api.Common;

/// <summary>Central error handling: maps exceptions to RFC 7807 problem responses and logs unexpected ones.</summary>
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var (status, title) = ex switch
            {
                NotFoundException => (StatusCodes.Status404NotFound, "Not found"),
                BusinessRuleException => (StatusCodes.Status400BadRequest, "Request could not be completed"),
                UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
                _ => (StatusCodes.Status500InternalServerError, "Unexpected error")
            };

            if (status == StatusCodes.Status500InternalServerError)
                logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);

            if (context.Response.HasStarted) throw;

            context.Response.Clear();
            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = status,
                Title = title,
                // Never leak internal details for unexpected errors.
                Detail = status == StatusCodes.Status500InternalServerError
                    ? "Something went wrong on our side. Please try again."
                    : ex.Message
            });
        }
    }
}
