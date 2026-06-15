using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.JellyBellySearch;

/// <summary>Registers plugin services with the Jellyfin DI container.</summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        // IStartupFilter lets us add middleware to the ASP.NET pipeline without
        // needing direct access to IApplicationBuilder at registration time.
        serviceCollection.AddSingleton<IStartupFilter, JellyBellyStartupFilter>();
        serviceCollection.AddSingleton<IndexHtmlMiddleware>();
    }
}
