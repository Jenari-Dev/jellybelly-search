using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.JellyBellySearch.Configuration;

/// <summary>Plugin configuration persisted by Jellyfin.</summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>Enable the custom search page UI.</summary>
    public bool EnableSearch { get; set; } = true;

    /// <summary>Enable the "Other Libraries" iframe tab/sidebar entries.</summary>
    public bool EnableOtherLibraries { get; set; } = false;

    /// <summary>List of remote Jellyfin libraries to embed.</summary>
    public RemoteLibraryEntry[] RemoteLibraries { get; set; } = Array.Empty<RemoteLibraryEntry>();
}

/// <summary>One remote Jellyfin server to embed.</summary>
public class RemoteLibraryEntry
{
    /// <summary>Display name shown in the nav (e.g. "Friend's Library").</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Full URL to the remote Jellyfin web client (e.g. https://example.com/web/index.html).</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>"sidebar" or "tab" — where the nav entry is injected.</summary>
    public string Placement { get; set; } = "sidebar";
}
