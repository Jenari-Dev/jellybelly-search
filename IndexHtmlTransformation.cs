using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Jellyfin.Plugin.JellyBellySearch;

// ─── Startup filter ───────────────────────────────────────────────────────────
// ASP.NET Core picks up every IStartupFilter registered in DI and uses it to
// configure the middleware pipeline at host startup.  This is the canonical
// cross-cutting injection point available to plugins without requiring
// IApplicationBuilder access in the registrator.
public class JellyBellyStartupFilter : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
        => app =>
        {
            app.UseMiddleware<IndexHtmlMiddleware>();
            next(app);
        };
}

// ─── Middleware ───────────────────────────────────────────────────────────────
// Intercepts Jellyfin's index.html response, buffers it, injects our <script defer>
// tag immediately before </body>, then forwards the modified content to the client.
// Uses a MemoryStream swap so the static-file middleware never touches the socket
// directly — no headers are committed until we write the final bytes.
public class IndexHtmlMiddleware : IMiddleware
{
    private const string Marker = "jellybelly-plugin-script";
    private const string ScriptUrl = "/Plugins/JellyBellySearch/Script";

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        if (!ShouldIntercept(context.Request))
        {
            await next(context);
            return;
        }

        var originalBody = context.Response.Body;
        using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        await next(context);

        buffer.Seek(0, SeekOrigin.Begin);
        context.Response.Body = originalBody;

        // Only transform successful HTML responses
        var ct = context.Response.ContentType ?? string.Empty;
        if (context.Response.StatusCode == StatusCodes.Status200OK
            && ct.Contains("html", StringComparison.OrdinalIgnoreCase))
        {
            var html = await new StreamReader(buffer, Encoding.UTF8).ReadToEndAsync();

            if (!html.Contains(Marker, StringComparison.Ordinal))
            {
                html = html.Replace(
                    "</body>",
                    $"\n    <script defer src=\"{ScriptUrl}\" id=\"{Marker}\"></script>\n</body>",
                    StringComparison.OrdinalIgnoreCase);
            }

            var bytes = Encoding.UTF8.GetBytes(html);
            context.Response.ContentLength = bytes.Length;
            await originalBody.WriteAsync(bytes, context.RequestAborted);
        }
        else
        {
            // Not HTML — forward the buffered response unchanged
            await buffer.CopyToAsync(originalBody, context.RequestAborted);
        }
    }

    private static bool ShouldIntercept(HttpRequest req)
    {
        if (!HttpMethods.IsGet(req.Method)) return false;

        var path = req.Path.Value ?? string.Empty;

        // Match /web/index.html and /web/ (Jellyfin's SPA entry points)
        return path.EndsWith("index.html", StringComparison.OrdinalIgnoreCase)
            || string.Equals(path.TrimEnd('/'), "/web", StringComparison.OrdinalIgnoreCase)
            || string.Equals(path, "/", StringComparison.Ordinal);
    }
}
