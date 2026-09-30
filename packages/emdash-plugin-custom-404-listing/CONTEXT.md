# Custom404 listing

The sandboxed plugin that gives the native Custom404 plugin a presence in the EmDash Registry, where native plugins cannot be listed.

## Language

**Listing plugin**:
A sandboxed plugin whose only job is to represent a Native plugin in the Registry and send readers to install it from npm. It never provides the Native plugin's feature itself.
_Avoid_: Placeholder, advert, stub, shim, companion

**Native plugin**:
The plugin a Listing plugin represents, installed from npm and registered in `plugins: []`; here, Custom404.
_Avoid_: Real plugin, full plugin, trusted plugin

**Registry**:
The federated EmDash plugin directory at plugins.emdashcms.com, where sandboxed plugins are published and installed from the admin.
_Avoid_: Marketplace (the deprecated central service), plugin store

**Signpost page**:
The single admin page a Listing plugin shows once installed: what the Native plugin does, screenshots, and links to install it.
_Avoid_: Landing page, info page, advert page
