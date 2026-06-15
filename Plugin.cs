using System.Collections.Generic;
using Jellyfin.Plugin.JellyBellySearch.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.JellyBellySearch;

/// <summary>JellyBelly Search plugin entry point.</summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public static Plugin? Instance { get; private set; }

    public override string Name => "JellyBelly Search";

    // Keep this GUID stable — changing it breaks existing installs.
    public override Guid Id => new Guid("B8FC5B3C-FD35-4B53-B68D-D48CA8B7EA4D");

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = Name,
            // Matches EmbeddedResource path: Jellyfin.Plugin.JellyBellySearch.Web.configpage.html
            EmbeddedResourcePath = $"{GetType().Namespace}.Web.configpage.html"
        };
    }
}
