const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;

const ICON_SIZE = 22;


function myLog( message ) {
    // Comment out the line below when finished debugging
    // global.logError( 'ntc places: ' + message );
}


const PlaceMenuItem = new Lang.Class({
    Name: 'Places.PlaceMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function( name, place ) {
	    this.parent();
	    this.place = place;

        let box = new St.BoxLayout({ style_class: 'popup-combobox-item' });
	    let label = new St.Label({ text: name });
        let icon = place.iconFactory(ICON_SIZE);

        box.add( icon );
        box.add(label);
        
        this.addActor(box);

    },

    activate: function(event) {
        myLog( "Launching : " + this.place.name );
        this.place.launch();
	    this.parent(event);
    }
});

const PlacesMenu = new Lang.Class({
    Name: 'PlacesMenu.PlacesMenu',
    Extends: PanelMenu.SystemStatusButton,

    _init: function() {
        myLog( "***Init Places Menu***" );
        
        this.parent('folder');
        // this.parent('user-bookmarks-symbolic');

        this.bookmarksSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this.bookmarksSection);
        this.mountsMenu = new PopupMenu.PopupSubMenuMenuItem("Removable Devices");
        this.menu.addMenuItem(this.mountsMenu);
        
        this.createBookmarksMenu();
        this.createMountsMenu();

        this.bookmarksHandler = Main.placesManager.connect('bookmarks-updated',Lang.bind(this,this.createBookmarksMenu));
        this.mountsHandler = Main.placesManager.connect('mounts-updated',Lang.bind(this,this.createBoth));

        Main.panel.addToStatusArea('ntc-places-menu', this);
        
        myLog( "***Created Places Menu***" );
    },
    
    destroy: function() {
        Main.placesManager.disconnect(this.bookmarksHandler);
        Main.placesManager.disconnect(this.mountsHandler);

        this.parent();
    },
    
    // If there is a bookmark with a mount point, then it won't be valid when unmounted, but will become valid again
    // when mounted, so we need to update both sections when a mount point is mounted/unmounted.
    createBoth: function() {
        myLog( "createBoth" );
        // Workaround: gnome doesn't refresh the bookmarks when a drive is mounted/umounted.
        Main.placesManager._reloadBookmarks();
        
        this.createBookmarksMenu();
        this.createMountsMenu();
    },

    createBookmarksMenu : function() {
        myLog( "Creating bookmarks menu" );
        this.bookmarksSection.removeAll();
        
        let bookmarks = Main.placesManager.getBookmarks();

        let targetMenu = this.bookmarksSection;

        for (let i = 0; i < bookmarks.length; i++) {
            let place = bookmarks[i];
            let isHeading = place.name[0] == '=';
            let name = place.name.replace(/ *==* */g,""); // Remove all '=' symbols and and spaces left or right of them.
            myLog( 'place: ' + name + " " + name[0] + " -> " + isHeading );
            
            if ( isHeading ) {
                myLog( 'Submenu' );
                let moreItems = new PopupMenu.PopupSubMenuMenuItem( name );
                this.bookmarksSection.addMenuItem( moreItems );
                targetMenu = moreItems.menu;
            }
            
            targetMenu.addMenuItem( new PlaceMenuItem( name, place ) );
        }
    },

    createMountsMenu : function() {
        myLog( "Creating mounts menu" );
        this.mountsMenu.menu.removeAll();
        
        let mounts = Main.placesManager.getMounts();

        for (let i = 0; i < mounts.length; i++) {
            let mount = mounts[ i ];
            
            this.mountsMenu.menu.addMenuItem( new PlaceMenuItem( mount.name, mount ) );
        }

        if (mounts.length == 0)
            this.mountsMenu.actor.hide();
        else
            this.mountsMenu.actor.show();
    },

});

function init() {
}

let myExtension;

function enable() {
    myExtension = new PlacesMenu;
}

function disable() {
    myExtension.destroy();
    myExtension = null;
}

