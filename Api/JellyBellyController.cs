using System.Net.Mime;
using Jellyfin.Plugin.JellyBellySearch.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.JellyBellySearch.Api;

/// <summary>Serves the plugin's bundled JS and exposes configuration to the web client.</summary>
[ApiController]
[Route("Plugins/JellyBellySearch")]
public class JellyBellyController : ControllerBase
{
    /// <summary>
    /// Serves the bundled jellybelly.js to the browser.
    /// AllowAnonymous is required — the browser loads this script before the user logs in.
    /// </summary>
    [HttpGet("Script")]
    [AllowAnonymous]
    [Produces("application/javascript")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetScript()
    {
        var resourceName = $"{typeof(Plugin).Namespace}.Web.jellybelly.js";
        var stream = typeof(Plugin).Assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return NotFound();
        }

        return File(stream, "application/javascript; charset=utf-8");
    }

    /// <summary>
    /// Returns the current plugin configuration as JSON.
    /// The web client JS fetches this after login using the Emby-Authorization header.
    /// </summary>
    [HttpGet("PluginConfig")]
    [Authorize(Policy = "DefaultAuthorization")]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<PluginConfiguration> GetPluginConfig()
    {
        return Ok(Plugin.Instance?.Configuration ?? new PluginConfiguration());
    }
}
