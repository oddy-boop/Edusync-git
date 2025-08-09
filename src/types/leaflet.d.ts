
// This file is for extending or declaring types for libraries that don't have up-to-date
// or complete type definitions.

// For Leaflet, if you're using plugins that extend the L namespace, you can declare them here.
// For example:
/*
import 'leaflet';

declare module 'leaflet' {
    namespace somePlugin {
        function aFunction(some_param: any): any;
    }
}
*/

// Or declare a module that doesn't have types
/*
declare module 'some-leaflet-plugin' {
    const plugin: any;
    export default plugin;
}
*/
