const Clutter = imports.gi.Clutter;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Gio = imports.gi.Gio;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;

// These constants can be customised as you see fit...
const EDITOR = [ '/usr/bin/gedit', '-s' ];
const EXTRA_PLACES_DIRECTORY = GLib.get_user_config_dir() + "/ntc-places";
const DEFAULT_PLACES_FILE = GLib.get_user_config_dir() + "/gtk-3.0/bookmarks";
// End of customisable constants.


function myLog( message ) {
    // Comment out the line below when finished debugging
    global.logError( 'ntc places: ' + message );
}


const PlaceMenuItem = new Lang.Class({
    Name: 'Places.PlaceMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function( name, uri ) {
	    this.parent();
	    this.uri = uri;

        let box = new St.BoxLayout({ style_class: 'popup-combobox-item' });
	    let label = new St.Label({ text: name });
        // Could add an icon similar to the "Places Status Indicator" extension.
        box.add(label);
        
        this.actor.add(box);
    },
    
    launch: function() {
        myLog( "Launching : " + this.uri );
        let launchContext = global.create_app_launch_context(0,-1);
        try {
            Gio.app_info_launch_default_for_uri( this.uri, launchContext );
        } catch (e) {
            myLog( "!!!! Error launching : " + e );
        }
    },
    
    activate: function(event) {
        this.launch();
	    this.parent(event);
    }
});

const PlacesMenu = new Lang.Class({
    Name: 'PlacesMenu.PlacesMenu',
    Extends: PanelMenu.Button,

    _init: function() {
        myLog( "***Init Places Menu***" );
        this.parent(0.0, "Places");

        let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        let label = new St.Label({ text: _("Places"), y_expand: true, y_align: Clutter.ActorAlign.CENTER });
        hbox.add_child(label);
        hbox.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
        this.actor.add_actor(hbox);

        this.bookmarksSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this.bookmarksSection);
        
        this.buildPlacesMenu();
        
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let me = this;
        this.menu.addAction("Edit Places", function(event) {
            me.editPlaces();
	    });
        this.menu.addAction("Reload", function(event) {
            me.buildPlacesMenu();
	    });
        myLog( "***Created Places Menu***" );
    },

    activate: function(event) {
        myLog( "***ACTIVATING***" );
    },

    destroy: function() {
        this.parent();
    },

    buildPlacesMenu : function()
    {
        this.placesFiles = [];
        
        myLog( "Creating bookmarks menu" );
        this.bookmarksSection.removeAll();

        this.addAdditionalPlaces( this.bookmarksSection, EXTRA_PLACES_DIRECTORY);
    },
    
    addAdditionalPlaces: function( targetMenu, path )
    {   
        let iterator = null;
        try {
            let directory = Gio.file_new_for_path( path );
            iterator = directory.enumerate_children( 'standard::name', 0, null );
        } catch (e) {
            // If we failed, then try to add the Gnome places
            this.addPlaces( targetMenu, DEFAULT_PLACES_FILE );
            return;
        }
        for ( let fileInfo = iterator.next_file( null ); fileInfo != null; fileInfo = iterator.next_file( null ) ) {
            let name = fileInfo.get_attribute_as_string( 'standard::name' );
            myLog( "Loading additional places : " + name );    
            let subMenu = new PopupMenu.PopupSubMenuMenuItem( name );
            myLog( "Sub Menu  "+  subMenu );
            targetMenu.addMenuItem( subMenu );
            this.addPlaces( subMenu.menu, path + "/" + name );
        }
        targetMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    },
    
    addPlaces : function( targetMenu, path )
    {
        // Remember the file that we used, so that Edit Places can open it.
        this.placesFiles[this.placesFiles.length] = path;
        
        let contents = '';
        try {
            [success, contents] = GLib.file_get_contents( path );
        } catch (e) {
            myLog( 'Failed to load ' + path );
            return;
        }
        let lines = ("" + contents).split(/\r?\n/);
        for ( let i = 0; i < lines.length; i ++ ) {
            let line = lines[i];
            if ( line.trim() == "" ) continue;
            
            let name = line;
            let path = line;
            let space = line.indexOf(" ");
            if (space < 0) {
                let slash = line.lastIndexOf( "/" );
                if ( slash > 0 ) {
                    name = line.substring( slash + 1 );
                }
            } else {
                name = line.substring( space + 1 );
                path = line.substring( 0, space );
            }
            if ( path.substring(0,1) == "/" ) {
                path = "file://" + path;
            } else if ( path.substring(0,1) == "~" ) {
                // TODO I want to replace ~ with the users home directory, but the documentation for
                // writing Gnome extensions is so bad, I can't work out how to do even this simple task.
            }
            myLog( "Place : '" + name + "' = '" + path + "'");
            targetMenu.addMenuItem( new PlaceMenuItem( name, path ) );
        }
    },

    editPlaces: function()
    {
        
        GLib.spawn_async(null, EDITOR.concat(this.placesFiles),
            null,  GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);
    },
});

function init() {
}

let placesMenu;

function enable() {
    placesMenu = new PlacesMenu;
    Main.panel.addToStatusArea('places-menu', placesMenu, 2, 'left');
}

function disable() {
    placesMenu.destroy();
    placesMenu = null;
}

